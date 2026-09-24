import axios from 'axios';

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
