/**
 * API client for Tracearr mobile app
 * Uses axios with automatic token refresh
 * Single-server model - connects to one Tracearr instance
 */
import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { useAuthStateStore, getAccessToken, getRefreshToken, setTokens } from './authStateStore';
import type {
  ActiveSession,
  DashboardStats,
  ServerUserWithIdentity,
  ServerUserDetail,
  Session,
  SessionWithDetails,
  UserLocation,
  UserDevice,
  Violation,
  ViolationWithDetails,
  Rule,
  Server,
  Settings,
  MobilePairResponse,
  PaginatedResponse,
  NotificationPreferences,
  NotificationPreferencesWithStatus,
  ServerResourceStats,
  TerminationLogWithDetails,
  HistorySessionResponse,
  HistoryAggregates,
  HistoryFilterOptions,
} from '@tracearr/shared';

// Single API client instance (one server only)
let apiClient: AxiosInstance | null = null;

/**
 * Get the API client, creating it if needed
 */
export function getApiClient(): AxiosInstance {
  const server = useAuthStateStore.getState().server;
  if (!server) {
    throw new Error('No server configured');
  }

  if (!apiClient) {
    apiClient = createApiClient(server.url);
  }

  return apiClient;
}

/**
 * Create a new API client for the server
 */
export function createApiClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL: `${baseURL}/api/v1`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
      const accessToken = await getAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    },
    (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
  );

  // Response interceptor - handle token refresh
  client.interceptors.response.use(
    (response) => {
      // If we were disconnected and now succeeded, mark as connected
      // But don't overwrite 'unauthenticated' state - that requires re-authentication
      const { connectionState, setConnectionState } = useAuthStateStore.getState();
      if (connectionState === 'disconnected') {
        setConnectionState('connected');
      }
      return response;
    },
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // If 401 and not already retrying, attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Mark token as refreshing
          useAuthStateStore.getState().setTokenStatus('refreshing');

          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const response = await client.post<{ accessToken: string; refreshToken: string }>(
            '/mobile/refresh',
            { refreshToken }
          );

          await setTokens(response.data.accessToken, response.data.refreshToken);

          // Mark token as valid
          useAuthStateStore.getState().setTokenStatus('valid');

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return await client(originalRequest);
        } catch {
          // Refresh failed - token is invalid, use unified auth failure handler
          resetApiClient();
          useAuthStateStore.getState().handleAuthFailure();
          throw new Error('Session expired');
        }
      }

      // Network error = server unreachable
      // But don't overwrite 'unauthenticated' state - that takes priority
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
        const { connectionState, setConnectionState, setError } = useAuthStateStore.getState();
        if (connectionState !== 'unauthenticated') {
          setConnectionState('disconnected');
          setError(error.code === 'ECONNABORTED' ? 'Connection timed out' : 'Server unreachable');
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Reset the API client (call when unpairing or to force recreation)
 */
export function resetApiClient(): void {
  apiClient = null;
}

/**
 * Get the current server URL (for building absolute URLs like images)
 */
export function getServerUrl(): string | null {
  return useAuthStateStore.getState().server?.url ?? null;
}

/**
 * API methods organized by domain
 */
export const api = {
  /**
   * Pair with server using mobile token
   * This is called before we have a client, so it uses direct axios
   */
  pair: async (
    serverUrl: string,
    token: string,
    deviceName: string,
    deviceId: string,
    platform: 'ios' | 'android',
    deviceSecret?: string
  ): Promise<MobilePairResponse> => {
    try {
      const response = await axios.post<MobilePairResponse>(
        `${serverUrl}/api/v1/mobile/pair`,
        { token, deviceName, deviceId, platform, deviceSecret },
        { timeout: 15000 }
      );
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // Extract server's error message if available
        const serverMessage = error.response?.data?.message || error.response?.data?.error;

        if (serverMessage) {
          throw new Error(serverMessage);
        }

        // Handle specific HTTP status codes
        if (error.response?.status === 429) {
          throw new Error('Too many pairing attempts. Please wait a few minutes.');
        }
        if (error.response?.status === 401) {
          throw new Error('Invalid or expired pairing token.');
        }
        if (error.response?.status === 400) {
          throw new Error('Invalid pairing request. Check your token.');
        }

        // Handle network errors
        if (error.code === 'ECONNABORTED') {
          throw new Error('Connection timed out. Check your server URL.');
        }
        if (error.code === 'ERR_NETWORK' || !error.response) {
          // On Android, HTTP (non-HTTPS) connections may be blocked
          // Check if URL is HTTP and provide more helpful message
          if (Platform.OS === 'android' && serverUrl.startsWith('http://')) {
            throw new Error(
              'Cannot reach server. Android blocks non-secure (HTTP) connections. ' +
                'Use HTTPS or set up a reverse proxy with SSL.'
            );
          }
          throw new Error('Cannot reach server. Check URL and network connection.');
        }

        // Fallback to axios message
        throw new Error(error.message);
      }
      throw error;
    }
  },

  /**
   * Get current user's profile info
   */
  me: async (): Promise<{
    id: string;
    username: string;
    friendlyName: string;
    thumbUrl: string | null;
    email: string | null;
    role: string;
  }> => {
    const client = getApiClient();
    const response = await client.get<{
      id: string;
      username: string;
      friendlyName: string;
      thumbUrl: string | null;
      email: string | null;
      role: string;
    }>('/mobile/me');
    return response.data;
  },

  /**
   * Register push token for notifications
   */
  registerPushToken: async (
    expoPushToken: string,
    deviceSecret?: string
  ): Promise<{ success: boolean; updatedSessions: number }> => {
    const client = getApiClient();
    const response = await client.post<{ success: boolean; updatedSessions: number }>(
      '/mobile/push-token',
      { expoPushToken, deviceSecret }
    );
    return response.data;
  },

  /**
   * Dashboard stats
   */
  stats: {
    dashboard: async (serverId?: string): Promise<DashboardStats> => {
      const client = getApiClient();
      const response = await client.get<DashboardStats>('/stats/dashboard', {
        params: serverId ? { serverId } : undefined,
      });
      return response.data;
    },
    plays: async (params?: {
      period?: string;
      serverId?: string;
    }): Promise<{ data: { date: string; count: number }[] }> => {
      const client = getApiClient();
      const response = await client.get<{ data: { date: string; count: number }[] }>(
        '/stats/plays',
        { params }
      );
      return response.data;
    },
    playsByDayOfWeek: async (params?: {
      period?: string;
      serverId?: string;
    }): Promise<{ data: { day: number; name: string; count: number }[] }> => {
      const client = getApiClient();
      const response = await client.get<{ data: { day: number; name: string; count: number }[] }>(
        '/stats/plays-by-dayofweek',
        { params }
      );
      return response.data;
    },
    playsByHourOfDay: async (params?: {
      period?: string;
      serverId?: string;
    }): Promise<{ data: { hour: number; count: number }[] }> => {
      const client = getApiClient();
      const response = await client.get<{ data: { hour: number; count: number }[] }>(
        '/stats/plays-by-hourofday',
        { params }
      );
      return response.data;
    },
    platforms: async (params?: {
      period?: string;
      serverId?: string;
    }): Promise<{ data: { platform: string; count: number }[] }> => {
      const client = getApiClient();
      const response = await client.get<{ data: { platform: string; count: number }[] }>(
        '/stats/platforms',
        { params }
      );
      return response.data;
    },
    quality: async (params?: {
      period?: string;
      serverId?: string;
    }): Promise<{
      directPlay: number;
      transcode: number;
      total: number;
      directPlayPercent: number;
      transcodePercent: number;
    }> => {
      const client = getApiClient();
      const response = await client.get<{
        directPlay: number;
        transcode: number;
        total: number;
        directPlayPercent: number;
        transcodePercent: number;
      }>('/stats/quality', { params });
      return response.data;
    },
    concurrent: async (params?: {
      period?: string;
      serverId?: string;
    }): Promise<{ data: { hour: string; total: number; direct: number; transcode: number }[] }> => {
      const client = getApiClient();
      const response = await client.get<{
        data: { hour: string; total: number; direct: number; transcode: number }[];
      }>('/stats/concurrent', { params });
      return response.data;
    },
    locations: async (params?: {
      serverId?: string;
      userId?: string;
    }): Promise<{
      data: {
        latitude: number;
        longitude: number;
        city: string;
        country: string;
        playCount: number;
      }[];
    }> => {
      const client = getApiClient();
      const response = await client.get<{
        data: {
          latitude: number;
          longitude: number;
          city: string;
          country: string;
          playCount: number;
        }[];
      }>('/stats/locations', { params });
      return response.data;
    },
  },

  /**
   * Sessions
   */
  sessions: {
    active: async (serverId?: string): Promise<ActiveSession[]> => {
      const client = getApiClient();
      const response = await client.get<{ data: ActiveSession[] }>('/sessions/active', {
        params: serverId ? { serverId } : undefined,
      });
      return response.data.data;
    },
    list: async (params?: {
      page?: number;
      pageSize?: number;
      userId?: string;
      serverId?: string;
    }) => {
      const client = getApiClient();
      const response = await client.get<PaginatedResponse<ActiveSession>>('/sessions', { params });
      return response.data;
    },
    get: async (id: string): Promise<SessionWithDetails> => {
      const client = getApiClient();
      const response = await client.get<SessionWithDetails>(`/sessions/${id}`);
      return response.data;
    },
    terminate: async (
      id: string,
      reason?: string
    ): Promise<{ success: boolean; terminationLogId: string; message: string }> => {
      const client = getApiClient();
      const response = await client.post<{
        success: boolean;
        terminationLogId: string;
        message: string;
      }>(`/mobile/streams/${id}/terminate`, { reason });
      return response.data;
    },
    /**
     * Query history with cursor-based pagination and filters
     * Used for the History tab with infinite scroll
     */
    history: async (params?: {
      cursor?: string;
      pageSize?: number;
      serverUserIds?: string[];
      serverId?: string;
      state?: 'playing' | 'paused' | 'stopped';
      mediaTypes?: ('movie' | 'episode' | 'track' | 'live')[];
      startDate?: Date;
      endDate?: Date;
      search?: string;
      platforms?: string[];
      product?: string;
      device?: string;
      playerName?: string;
      ipAddress?: string;
      geoCountries?: string[];
      geoCity?: string;
      geoRegion?: string;
      transcodeDecisions?: ('directplay' | 'copy' | 'transcode')[];
      watched?: boolean;
      excludeShortSessions?: boolean;
      orderBy?: 'startedAt' | 'durationMs' | 'mediaTitle';
      orderDir?: 'asc' | 'desc';
    }): Promise<HistorySessionResponse> => {
      const client = getApiClient();
      const searchParams = new URLSearchParams();
      if (params?.cursor) searchParams.set('cursor', params.cursor);
      if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params?.serverUserIds?.length)
        searchParams.set('serverUserIds', params.serverUserIds.join(','));
      if (params?.serverId) searchParams.set('serverId', params.serverId);
      if (params?.state) searchParams.set('state', params.state);
      if (params?.mediaTypes?.length) searchParams.set('mediaTypes', params.mediaTypes.join(','));
      if (params?.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params?.endDate) searchParams.set('endDate', params.endDate.toISOString());
      if (params?.search) searchParams.set('search', params.search);
      if (params?.platforms?.length) searchParams.set('platforms', params.platforms.join(','));
      if (params?.product) searchParams.set('product', params.product);
      if (params?.device) searchParams.set('device', params.device);
      if (params?.playerName) searchParams.set('playerName', params.playerName);
      if (params?.ipAddress) searchParams.set('ipAddress', params.ipAddress);
      if (params?.geoCountries?.length)
        searchParams.set('geoCountries', params.geoCountries.join(','));
      if (params?.geoCity) searchParams.set('geoCity', params.geoCity);
      if (params?.geoRegion) searchParams.set('geoRegion', params.geoRegion);
      if (params?.transcodeDecisions?.length)
        searchParams.set('transcodeDecisions', params.transcodeDecisions.join(','));
      if (params?.watched !== undefined) searchParams.set('watched', String(params.watched));
      if (params?.excludeShortSessions !== undefined)
        searchParams.set('excludeShortSessions', String(params.excludeShortSessions));
      if (params?.orderBy) searchParams.set('orderBy', params.orderBy);
      if (params?.orderDir) searchParams.set('orderDir', params.orderDir);
      const response = await client.get<HistorySessionResponse>(
        `/sessions/history?${searchParams.toString()}`
      );
      return response.data;
    },
    /**
     * Get aggregate stats for history (total plays, watch time, etc.)
     */
    historyAggregates: async (params?: {
      serverId?: string;
      startDate?: Date;
      endDate?: Date;
    }): Promise<HistoryAggregates> => {
      const client = getApiClient();
      const searchParams = new URLSearchParams();
      if (params?.serverId) searchParams.set('serverId', params.serverId);
      if (params?.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params?.endDate) searchParams.set('endDate', params.endDate.toISOString());
      const response = await client.get<HistoryAggregates>(
        `/sessions/history/aggregates?${searchParams.toString()}`
      );
      return response.data;
    },
    /**
     * Get available filter options for history filtering (users, platforms, countries, etc.)
     */
    filterOptions: async (serverId?: string): Promise<HistoryFilterOptions> => {
      const client = getApiClient();
      const params = serverId ? { serverId } : undefined;
      const response = await client.get<HistoryFilterOptions>('/sessions/filter-options', {
        params,
      });
      return response.data;
    },
  },

  /**
   * Users
   */
  users: {
    list: async (params?: { page?: number; pageSize?: number; serverId?: string }) => {
      const client = getApiClient();
      const response = await client.get<PaginatedResponse<ServerUserWithIdentity>>('/users', {
        params,
      });
      return response.data;
    },
    get: async (id: string): Promise<ServerUserDetail> => {
      const client = getApiClient();
      const response = await client.get<ServerUserDetail>(`/users/${id}`);
      return response.data;
    },
    sessions: async (id: string, params?: { page?: number; pageSize?: number }) => {
      const client = getApiClient();
      const response = await client.get<PaginatedResponse<Session>>(`/users/${id}/sessions`, {
        params,
      });
      return response.data;
    },
    locations: async (id: string): Promise<UserLocation[]> => {
      const client = getApiClient();
      const response = await client.get<{ data: UserLocation[] }>(`/users/${id}/locations`);
      return response.data.data;
    },
    devices: async (id: string): Promise<UserDevice[]> => {
      const client = getApiClient();
      const response = await client.get<{ data: UserDevice[] }>(`/users/${id}/devices`);
      return response.data.data;
    },
    terminations: async (
      id: string,
      params?: { page?: number; pageSize?: number }
    ): Promise<PaginatedResponse<TerminationLogWithDetails>> => {
      const client = getApiClient();
      const response = await client.get<PaginatedResponse<TerminationLogWithDetails>>(
        `/users/${id}/terminations`,
        { params }
      );
      return response.data;
    },
  },

  /**
   * Violations
   */
  violations: {
    list: async (params?: {
      page?: number;
      pageSize?: number;
      userId?: string;
      severity?: string;
      acknowledged?: boolean;
      serverId?: string;
    }) => {
      const client = getApiClient();
      const response = await client.get<PaginatedResponse<ViolationWithDetails>>('/violations', {
        params,
      });
      return response.data;
    },
    acknowledge: async (id: string): Promise<Violation> => {
      const client = getApiClient();
      const response = await client.patch<Violation>(`/violations/${id}`);
      return response.data;
    },
    dismiss: async (id: string): Promise<void> => {
      const client = getApiClient();
      await client.delete(`/violations/${id}`);
    },
  },

  /**
   * Rules
   */
  rules: {
    list: async (serverId?: string): Promise<Rule[]> => {
      const client = getApiClient();
      const response = await client.get<{ data: Rule[] }>('/rules', {
        params: serverId ? { serverId } : undefined,
      });
      return response.data.data;
    },
    toggle: async (id: string, isActive: boolean): Promise<Rule> => {
      const client = getApiClient();
      const response = await client.patch<Rule>(`/rules/${id}`, { isActive });
      return response.data;
    },
  },

  /**
   * Servers
   */
  servers: {
    list: async (): Promise<Server[]> => {
      const client = getApiClient();
      const response = await client.get<{ data: Server[] }>('/servers');
      return response.data.data;
    },
    statistics: async (id: string): Promise<ServerResourceStats> => {
      const client = getApiClient();
      const response = await client.get<ServerResourceStats>(`/servers/${id}/statistics`);
      return response.data;
    },
  },

  /**
   * Notification preferences (per-device settings)
   */
  notifications: {
    /**
     * Get notification preferences for current device
     * Returns preferences with live rate limit status from Redis
     */
    getPreferences: async (): Promise<NotificationPreferencesWithStatus> => {
      const client = getApiClient();
      const response = await client.get<NotificationPreferencesWithStatus>(
        '/notifications/preferences'
      );
      return response.data;
    },

    /**
     * Update notification preferences for current device
     * Supports partial updates - only send fields you want to change
     */
    updatePreferences: async (
      data: Partial<
        Omit<NotificationPreferences, 'id' | 'mobileSessionId' | 'createdAt' | 'updatedAt'>
      >
    ): Promise<NotificationPreferences> => {
      const client = getApiClient();
      const response = await client.patch<NotificationPreferences>(
        '/notifications/preferences',
        data
      );
      return response.data;
    },

    /**
     * Send a test notification to verify push is working
     */
    sendTest: async (): Promise<{ success: boolean; message: string }> => {
      const client = getApiClient();
      const response = await client.post<{ success: boolean; message: string }>(
        '/notifications/test'
      );
      return response.data;
    },
  },

  /**
   * Global settings (display preferences, etc.)
   */
  settings: {
    get: async (): Promise<Settings> => {
      const client = getApiClient();
      const response = await client.get<Settings>('/settings');
      return response.data;
    },
  },
};
