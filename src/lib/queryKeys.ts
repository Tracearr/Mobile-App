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

type ServerId = string | null | undefined;

export const queryKeys = {
  me: () => ['mobile', 'me'] as const,

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
    historyAggregates: (scope: ServerScope, period: string) =>
      ['sessions', 'history', 'aggregates', serverScopeKey(scope), period] as const,
    filterOptions: (scope: ServerScope) =>
      ['sessions', 'filter-options', serverScopeKey(scope)] as const,
  },

  users: {
    list: (scope: ServerScope) => ['users', serverScopeKey(scope)] as const,
    detail: (id: string, serverId: ServerId) => ['user', id, serverId] as const,
    sessions: (id: string, serverId: ServerId) => ['user', id, 'sessions', serverId] as const,
    locations: (id: string, serverId: ServerId) => ['user', id, 'locations', serverId] as const,
    devices: (id: string, serverId: ServerId) => ['user', id, 'devices', serverId] as const,
    terminations: (id: string, serverId: ServerId) =>
      ['user', id, 'terminations', serverId] as const,
  },

  violations: {
    all: () => ['violations'] as const,
    list: (scope: ServerScope, severity: string, status: string) =>
      ['violations', serverScopeKey(scope), severity, status] as const,
    byUser: (userId: string) => ['violations', { userId }] as const,
    detail: (id: string) => ['violations', 'detail', id] as const,
    unacknowledgedCount: (scope: ServerScope) =>
      ['violations', 'unacknowledged-count', serverScopeKey(scope)] as const,
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
    statistics: (serverId: ServerId) => ['servers', 'statistics', serverId] as const,
  },

  notifications: {
    preferences: () => ['notifications', 'preferences'] as const,
  },

  settings: () => ['settings'] as const,
} as const;
