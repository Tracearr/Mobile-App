/**
 * Centralized query key factory for React Query
 * Ensures consistent cache key patterns across the app
 */

/**
 * History filter parameters for query cache keys
 */
export interface HistoryFilters {
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

export const queryKeys = {
  // Dashboard
  dashboard: {
    all: () => ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    activity: () => ['dashboard', 'activity'] as const,
  },

  // Users
  users: {
    all: () => ['users'] as const,
    list: () => ['users', 'list'] as const,
    detail: (id: string) => ['users', id] as const,
    sessions: (id: string) => ['users', id, 'sessions'] as const,
  },

  // Sessions
  sessions: {
    all: () => ['sessions'] as const,
    active: () => ['sessions', 'active'] as const,
    history: (filters?: HistoryFilters) => ['sessions', 'history', filters] as const,
    detail: (id: string) => ['sessions', id] as const,
  },

  // Violations
  violations: {
    all: () => ['violations'] as const,
    list: () => ['violations', 'list'] as const,
    detail: (id: string) => ['violations', id] as const,
  },

  // Settings
  settings: () => ['settings'] as const,
} as const;
