import type { UserSortField } from '@tracearr/shared';

export interface IdentityServerMembership {
  id: string;
  name: string;
  serverUserId?: string;
  removedAt?: string | null;
}

/** Every server a person is on, always including the row's own server. */
export function getIdentityServers(
  identityServers: IdentityServerMembership[] | undefined,
  ownServer: IdentityServerMembership
): IdentityServerMembership[] {
  if (!identityServers || identityServers.length === 0) return [ownServer];
  return identityServers;
}

/** Servers worth showing on a detail header: nothing for a person with one account. */
export function getMergedIdentityServers(
  identityServers: IdentityServerMembership[] | undefined
): IdentityServerMembership[] {
  if (!identityServers || identityServers.length < 2) return [];
  return identityServers;
}

/** A person only counts as removed once every account is gone. */
export function isPersonRemoved(accounts: { removedAt: string | Date | null }[]): boolean {
  return accounts.length > 0 && accounts.every((account) => account.removedAt != null);
}

// The users list sends Postgres text ("2026-09-17 14:29:35.04+00"), which is not
// ISO 8601: a space for the T, a two-digit fraction and an offset with no minutes.
// Only the ISO form is guaranteed to parse on every engine.
const PG_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

function toIsoTimestamp(value: string): string {
  const match = PG_TIMESTAMP.exec(value);
  if (!match) return value;
  const [, date, time, fraction = '', offset = 'Z'] = match;
  const millis = fraction.padEnd(3, '0').slice(0, 3);
  const digits = offset.replace(':', '');
  const zone = offset === 'Z' ? 'Z' : `${digits.slice(0, 3)}:${digits.slice(3) || '00'}`;
  return `${date}T${time}.${millis}${zone}`;
}

export function parseServerTimestamp(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(toIsoTimestamp(value));
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Mirrors the server's per-field default in routes/users/list.ts.
export const DEFAULT_SORT_DIR: Record<UserSortField, 'asc' | 'desc'> = {
  username: 'asc',
  trustScore: 'desc',
  joinedAt: 'desc',
  lastActivityAt: 'desc',
};

/**
 * Which paged endpoints can extend a section past the 10 rows in /users/:id/full.
 * /users/:id/sessions and /terminations are called without scope=identity, so they
 * only match the full payload when it covers one account. /violations filters by
 * identity (userId), so it only matches when the payload covers the whole person.
 * A person with one account is the same set either way.
 */
export function pageableSections(isMergedIdentity: boolean, isAllScope: boolean) {
  return {
    sessionsAndTerminations: !isMergedIdentity || !isAllScope,
    violations: !isMergedIdentity || isAllScope,
  };
}
