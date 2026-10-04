import axios from 'axios';
import { ErrorCodes, type ApiError } from '@tracearr/shared';

const NO_ANSWER_CODES = new Set(['ERR_NETWORK', 'ECONNABORTED', 'ETIMEDOUT']);

// A request that never got an answer: offline, dropped, or suspended mid-flight.
// Callers log these as warnings, which PostHog does not capture.
export function isNetworkFailure(error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    return error.response === undefined && NO_ANSWER_CODES.has(error.code ?? '');
  }
  return (
    error instanceof Error && 'code' in error && error.code === 'ERR_NOTIFICATIONS_NETWORK_ERROR'
  );
}

// PostHog's console hook keeps the first Error it finds and drops the rest of
// the arguments, so the status and the server's reply have to be in the message.
export function describeApiError(prefix: string, error: unknown): Error {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error : new Error(`${prefix}: ${String(error)}`);
  }
  const body = error.response?.data as { message?: unknown } | undefined;
  const detail =
    typeof body?.message === 'string' ? body.message : (error.response?.statusText ?? error.code);
  const status = error.response?.status ?? 'no response';
  return new Error(`${prefix}: ${status} ${detail ?? ''}`.trimEnd(), { cause: error });
}

export function isTracearrError(
  data: unknown
): data is Pick<ApiError, 'statusCode' | 'message' | 'code'> {
  if (typeof data !== 'object' || data === null) return false;
  const body = data as { statusCode?: unknown; message?: unknown };
  return typeof body.statusCode === 'number' && typeof body.message === 'string';
}

// A reply Tracearr did not mean as a verdict on this device: a proxy's own page,
// a rate limit, or a server error.
export function isTransientReply(error: unknown): boolean {
  const response = axios.isAxiosError(error) ? error.response : undefined;
  if (!response) return false;
  return !isTracearrError(response.data) || response.status === 429 || response.status >= 500;
}

export type RefreshVerdict =
  { kind: 'transient' } | { kind: 'clientTooOld' } | { kind: 'signedOut'; code: string | null };

export function classifyRefreshFailure(error: unknown): RefreshVerdict {
  const response = axios.isAxiosError(error) ? error.response : undefined;
  if (!response || isTransientReply(error)) return { kind: 'transient' };
  const code = isTracearrError(response.data) ? (response.data.code ?? null) : null;
  if (response.status === 426 && code === ErrorCodes.CLIENT_TOO_OLD) {
    return { kind: 'clientTooOld' };
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    return { kind: 'signedOut', code };
  }
  return { kind: 'transient' };
}
