/**
 * Centralized query key factory for React Query.
 * Call sites conform to these shapes; changing a shape here changes cache
 * identity and invalidation, so treat edits as behavior changes.
 * Scoped entries key by serverScopeKey(scope): 'all' or sorted ids.
 * No-arg/prefix forms exist for invalidateQueries prefix matching.
 */

import { serverScopeKey, type ServerScope } from '@tracearr/shared';

export interface HistoryQueryFilters {
  startDate?: Date;
  endDate?: Date;
  search?: string;
  serverUserIds?: string[];
  platforms?: string[];
  geoCountries?: string[];
  mediaTypes?: string[];
  transcodeDecisions?: string[];
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export type HistoryAggregateFilters = Omit<
  HistoryQueryFilters,
  'startDate' | 'endDate' | 'orderBy' | 'orderDir'
>;

export interface UserListKeyParams {
  search?: string;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

export interface RunKeyFilters {
  kind?: string;
  outcome?: string;
  automationId?: string;
  startDate?: string;
  endDate?: string;
}

/** /violations filters by person (`userId`) or by one account (`serverUserId`). */
export type UserViolationsFilter = { userId: string } | { serverUserId: string };

type ServerId = string | null | undefined;

export const queryKeys = {
  me: () => ['mobile', 'me'] as const,

  mediaServersPrefix: () => ['media-servers'] as const,
  mediaServers: (backendId: ServerId) => ['media-servers', backendId] as const,

  dashboard: {
    stats: (scope: ServerScope) => ['dashboard', 'stats', serverScopeKey(scope)] as const,
    statsPrefix: () => ['dashboard', 'stats'] as const,
  },

  sessions: {
    activePrefix: () => ['sessions', 'active'] as const,
    active: (scope: ServerScope) => ['sessions', 'active', serverScopeKey(scope)] as const,
    detail: (id: string, serverId: ServerId) => ['session', id, serverId] as const,
    history: (scope: ServerScope, filters: HistoryQueryFilters) =>
      ['sessions', 'history', serverScopeKey(scope), filters] as const,
    historyPrefix: () => ['sessions', 'history'] as const,
    historyAggregates: (
      scope: ServerScope,
      period: string,
      filters: HistoryAggregateFilters = {}
    ) => ['sessions', 'history', 'aggregates', serverScopeKey(scope), period, filters] as const,
    filterOptionsPrefix: () => ['sessions', 'filter-options'] as const,
    filterOptions: (scope: ServerScope) =>
      ['sessions', 'filter-options', serverScopeKey(scope)] as const,
  },

  users: {
    listPrefix: () => ['users'] as const,
    list: (scope: ServerScope, params: UserListKeyParams = {}) =>
      ['users', serverScopeKey(scope), params] as const,
    one: (id: string) => ['user', id] as const,
    fullPrefix: () => ['user-full'] as const,
    full: (id: string, scope: 'account' | 'identity') => ['user-full', id, scope] as const,
    sessions: (id: string, scope: 'account' | 'identity') =>
      ['user', id, 'sessions', scope] as const,
    terminations: (id: string, scope: 'account' | 'identity') =>
      ['user', id, 'terminations', scope] as const,
  },

  violations: {
    all: () => ['violations'] as const,
    list: (scope: ServerScope, severity: string, status: string) =>
      ['violations', serverScopeKey(scope), severity, status] as const,
    byUser: (filter: UserViolationsFilter) => ['violations', filter] as const,
    detail: (id: string) => ['violations', 'detail', id] as const,
    unacknowledgedCount: (scope: ServerScope, severity: string = 'all') =>
      ['violations', 'unacknowledged-count', serverScopeKey(scope), severity] as const,
  },

  stats: {
    plays: (period: string, scope: ServerScope) =>
      ['stats', 'plays', period, serverScopeKey(scope)] as const,
    dayOfWeek: (period: string, scope: ServerScope) =>
      ['stats', 'dayOfWeek', period, serverScopeKey(scope)] as const,
    hourOfDay: (period: string, scope: ServerScope) =>
      ['stats', 'hourOfDay', period, serverScopeKey(scope)] as const,
    platforms: (period: string, scope: ServerScope) =>
      ['stats', 'platforms', period, serverScopeKey(scope)] as const,
    quality: (period: string, scope: ServerScope) =>
      ['stats', 'quality', period, serverScopeKey(scope)] as const,
    concurrent: (period: string, scope: ServerScope) =>
      ['stats', 'concurrent', period, serverScopeKey(scope)] as const,
  },

  servers: {
    liveStats: (serverId: ServerId) => ['servers', 'live-stats', serverId] as const,
    health: (backendId: ServerId) => ['servers', 'health', backendId] as const,
  },

  automations: {
    all: () => ['automations'] as const,
    listPrefix: () => ['automations', 'list'] as const,
    list: (kind?: string) => ['automations', 'list', kind ?? 'all'] as const,
  },

  runs: {
    all: () => ['runs'] as const,
    list: (filters: RunKeyFilters = {}) => ['runs', 'list', filters] as const,
    counts: (filters: RunKeyFilters = {}) => ['runs', 'counts', filters] as const,
  },

  requests: {
    all: () => ['requests'] as const,
    status: () => ['requests', 'status'] as const,
    user: (id: string, scope: 'account' | 'identity') => ['requests', 'user', id, scope] as const,
  },

  notifications: {
    preferences: () => ['notifications', 'preferences'] as const,
  },

  versionPrefix: () => ['version'] as const,
  version: (serverId: ServerId) => ['version', serverId] as const,

  settings: () => ['settings'] as const,
} as const;
