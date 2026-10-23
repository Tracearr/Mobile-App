import type { UserSortField } from '@tracearr/shared';
import type { UserViolationsFilter } from '@/lib/queryKeys';

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

// Mirrors the server's per-field default in routes/users/list.ts.
export const DEFAULT_SORT_DIR: Record<UserSortField, 'asc' | 'desc'> = {
  username: 'asc',
  trustScore: 'desc',
  joinedAt: 'desc',
  lastActivityAt: 'desc',
  role: 'asc',
  pendingViolations: 'desc',
};

/**
 * The /violations filter that pages the same rows /users/:id/full embeds: the whole
 * person (`userId` is the identity id) in identity scope, one account otherwise.
 */
export function violationsPageFilter(
  scope: 'account' | 'identity',
  accountId: string,
  identityUserId: string
): UserViolationsFilter {
  return scope === 'identity' ? { userId: identityUserId } : { serverUserId: accountId };
}
