/**
 * Centralized query key factory for React Query.
 * Every entry produces the exact key shape the call sites already use at
 * runtime; changing a shape here changes cache identity and invalidation,
 * so treat edits as behavior changes.
 * No-arg/prefix forms exist for invalidateQueries prefix matching.
 */

export interface HistoryQueryFilters {
  serverId?: string;
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
    stats: (serverIds: string[]) => ['dashboard', 'stats', serverIds] as const,
    statsPrefix: () => ['dashboard', 'stats'] as const,
  },

  sessions: {
    activePrefix: () => ['sessions', 'active'] as const,
    active: (serverIds: string[]) => ['sessions', 'active', serverIds] as const,
    detail: (id: string, serverId: ServerId) => ['session', id, serverId] as const,
    history: (serverId: ServerId, filters: HistoryQueryFilters) =>
      ['sessions', 'history', serverId, filters] as const,
    historyAggregates: (serverId: ServerId, period: string) =>
      ['sessions', 'history', 'aggregates', serverId, period] as const,
    filterOptions: (serverId: ServerId) => ['sessions', 'filter-options', serverId] as const,
  },

  users: {
    list: (serverId: ServerId) => ['users', serverId] as const,
    detail: (id: string, serverId: ServerId) => ['user', id, serverId] as const,
    sessions: (id: string, serverId: ServerId) => ['user', id, 'sessions', serverId] as const,
    locations: (id: string, serverId: ServerId) => ['user', id, 'locations', serverId] as const,
    devices: (id: string, serverId: ServerId) => ['user', id, 'devices', serverId] as const,
    terminations: (id: string, serverId: ServerId) =>
      ['user', id, 'terminations', serverId] as const,
  },

  violations: {
    all: () => ['violations'] as const,
    list: (serverId: ServerId, severity: string, status: string) =>
      ['violations', serverId, severity, status] as const,
    byUser: (userId: string, serverId: ServerId) => ['violations', { userId }, serverId] as const,
    detail: (id: string) => ['violations', 'detail', id] as const,
    unacknowledgedCount: (serverId: ServerId) =>
      ['violations', 'unacknowledged-count', serverId] as const,
  },

  stats: {
    plays: (period: string, serverId: ServerId) => ['stats', 'plays', period, serverId] as const,
    dayOfWeek: (period: string, serverId: ServerId) =>
      ['stats', 'dayOfWeek', period, serverId] as const,
    hourOfDay: (period: string, serverId: ServerId) =>
      ['stats', 'hourOfDay', period, serverId] as const,
    platforms: (period: string, serverId: ServerId) =>
      ['stats', 'platforms', period, serverId] as const,
    quality: (period: string, serverId: ServerId) =>
      ['stats', 'quality', period, serverId] as const,
    concurrent: (period: string, serverId: ServerId) =>
      ['stats', 'concurrent', period, serverId] as const,
  },

  servers: {
    statistics: (serverId: ServerId) => ['servers', 'statistics', serverId] as const,
  },

  notifications: {
    preferences: () => ['notifications', 'preferences'] as const,
  },

  settings: () => ['settings'] as const,
} as const;
