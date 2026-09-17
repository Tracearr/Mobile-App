/**
 * API client for Tracearr mobile app
 * Uses axios with automatic token refresh
 * Single-server model - connects to one Tracearr instance
 */
import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import { serverScopeParamEntries, type ServerScope } from '@tracearr/shared';
import { useAuthStateStore, getAccessToken, getRefreshToken, setTokens } from './authStateStore';
import { getDeviceTimezone } from './timezone';
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
  Server,
  Settings,
  MobilePairResponse,
  PaginatedResponse,
  NotificationPreferences,
  NotificationPreferencesWithStatus,
  ServerLiveStats,
  TerminationLogWithDetails,
  HistorySessionResponse,
  HistoryAggregates,
  HistoryFilterOptions,
  ListResponse,
  VersionInfo,
} from '@tracearr/shared';

function appendScope(params: URLSearchParams, scope: ServerScope): void {
  for (const [k, v] of serverScopeParamEntries(scope)) params.append(k, v);
}

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
 * Every read goes through here so cancellation and query params attach in one
 * place. React Query hands each queryFn an AbortSignal; forwarding it lets
 * cancelQueries abort the request instead of only discarding its result.
 */
type RequestOptions = {
  signal?: AbortSignal;
  params?: Record<string, unknown>;
};

async function apiGet<T>(url: string, options?: RequestOptions): Promise<T> {
  const response = await getApiClient().get<T>(url, options);
  return response.data;
}

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
          const newAccessToken = await refreshAccessToken();
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return await client(originalRequest);
        } catch {
          // refreshAccessToken handles auth state (handleAuthFailure for server rejections)
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

// Mutex for token refresh — prevents concurrent 401s from racing
let activeRefreshPromise: Promise<string> | null = null;
// Bumped on every refresh attempt so a stray, timed-out attempt that resolves
// late can't clobber a newer attempt's mutex or auth state.
let refreshGeneration = 0;

// iOS can strand the refresh request on suspend without ever settling the
// promise (see refreshAccessToken). Timeout must exceed the axios timeout
// below so a normal slow response isn't mistaken for a stranded one.
const REFRESH_TIMEOUT_MS = 35000;

/**
 * Refresh the access token using the stored refresh token.
 * Uses a mutex so concurrent callers all wait for a single refresh.
 * On auth rejection (server returns 401/403), calls handleAuthFailure().
 * On network errors, throws without killing auth state.
 *
 * The refresh is raced against a watchdog timeout: if iOS suspends the app
 * mid-request, the axios promise can dangle forever, which would otherwise
 * wedge the mutex and strand every 401 across the app until restart. The
 * timeout guarantees the mutex always clears, even though the underlying
 * network call may still be pending.
 */
export async function refreshAccessToken(): Promise<string> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const generation = ++refreshGeneration;
  let timeoutHandle: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error('Token refresh timed out'));
    }, REFRESH_TIMEOUT_MS);
  });

  activeRefreshPromise = Promise.race([performTokenRefresh(generation), timeoutPromise]).finally(
    () => {
      clearTimeout(timeoutHandle);
      // Only the attempt that currently owns the mutex may clear it, so a
      // late-resolving stranded attempt doesn't null out a newer one.
      if (refreshGeneration === generation) {
        activeRefreshPromise = null;
      }
    }
  );

  return activeRefreshPromise;
}

async function performTokenRefresh(generation: number): Promise<string> {
  // A superseded attempt (its watchdog already fired) must not mutate auth
  // state out from under whatever attempt replaced it.
  const isCurrent = () => refreshGeneration === generation;

  if (isCurrent()) {
    useAuthStateStore.getState().setTokenStatus('refreshing');
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    resetApiClient();
    if (isCurrent()) {
      useAuthStateStore.getState().handleAuthFailure();
    }
    throw new Error('No refresh token available');
  }

  const server = useAuthStateStore.getState().server;
  if (!server) {
    resetApiClient();
    if (isCurrent()) {
      useAuthStateStore.getState().handleAuthFailure();
    }
    throw new Error('No server configured');
  }

  try {
    // Use raw axios (not the intercepted client) to avoid recursive interceptor loops
    const response = await axios.post<{ accessToken: string; refreshToken: string }>(
      `${server.url}/api/v1/mobile/refresh`,
      { refreshToken },
      { timeout: 30000 }
    );

    if (!isCurrent()) {
      // A newer refresh already replaced this one; its tokens are stale.
      return response.data.accessToken;
    }

    const saved = await setTokens(response.data.accessToken, response.data.refreshToken);
    if (!saved) {
      console.error(
        '[Auth] Failed to persist refreshed tokens — session will not survive app restart'
      );
      useAuthStateStore
        .getState()
        .setError('Could not save login securely. Restart the app to prevent being logged out.');
    }

    useAuthStateStore.getState().setTokenStatus('valid');
    return response.data.accessToken;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response && isCurrent()) {
      // Server explicitly rejected the refresh token — auth is dead
      resetApiClient();
      useAuthStateStore.getState().handleAuthFailure();
    }
    // Network errors: don't kill auth, token may still be valid server-side
    throw error;
  }
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

      // Validate response shape - a tunnel/proxy may return 200 with non-Tracearr content
      const data = response.data;
      if (
        !data ||
        typeof data.accessToken !== 'string' ||
        typeof data.refreshToken !== 'string' ||
        !data.server?.id ||
        !data.user?.userId
      ) {
        throw new Error(
          'Server returned an unexpected response. Make sure your URL points directly to Tracearr, not a proxy login page.'
        );
      }

      return data;
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
  me: async (
    signal?: AbortSignal
  ): Promise<{
    id: string;
    username: string;
    friendlyName: string;
    thumbUrl: string | null;
    email: string | null;
    role: string;
  }> => {
    return apiGet<{
      id: string;
      username: string;
      friendlyName: string;
      thumbUrl: string | null;
      email: string | null;
      role: string;
    }>('/mobile/me', { signal });
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
    dashboard: async (scope: ServerScope, signal?: AbortSignal): Promise<DashboardStats> => {
      const params = new URLSearchParams();
      appendScope(params, scope);
      params.set('timezone', getDeviceTimezone());
      return apiGet<DashboardStats>(`/stats/dashboard?${params.toString()}`, { signal });
    },
    plays: async (
      params: {
        period?: string;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ): Promise<{ data: { date: string; count: number }[] }> => {
      const searchParams = new URLSearchParams();
      if (params.period) searchParams.set('period', params.period);
      appendScope(searchParams, params.scope);
      searchParams.set('timezone', getDeviceTimezone());
      return apiGet<{ data: { date: string; count: number }[] }>(
        `/stats/plays?${searchParams.toString()}`,
        { signal }
      );
    },
    playsByDayOfWeek: async (
      params: {
        period?: string;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ): Promise<{ data: { day: number; name: string; count: number }[] }> => {
      const searchParams = new URLSearchParams();
      if (params.period) searchParams.set('period', params.period);
      appendScope(searchParams, params.scope);
      searchParams.set('timezone', getDeviceTimezone());
      return apiGet<{ data: { day: number; name: string; count: number }[] }>(
        `/stats/plays-by-dayofweek?${searchParams.toString()}`,
        { signal }
      );
    },
    playsByHourOfDay: async (
      params: {
        period?: string;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ): Promise<{ data: { hour: number; count: number }[] }> => {
      const searchParams = new URLSearchParams();
      if (params.period) searchParams.set('period', params.period);
      appendScope(searchParams, params.scope);
      searchParams.set('timezone', getDeviceTimezone());
      return apiGet<{ data: { hour: number; count: number }[] }>(
        `/stats/plays-by-hourofday?${searchParams.toString()}`,
        { signal }
      );
    },
    platforms: async (
      params: {
        period?: string;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ): Promise<{ data: { platform: string; count: number }[] }> => {
      const searchParams = new URLSearchParams();
      if (params.period) searchParams.set('period', params.period);
      appendScope(searchParams, params.scope);
      searchParams.set('timezone', getDeviceTimezone());
      return apiGet<{ data: { platform: string; count: number }[] }>(
        `/stats/platforms?${searchParams.toString()}`,
        { signal }
      );
    },
    quality: async (
      params: {
        period?: string;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ): Promise<{
      directPlay: number;
      directStream?: number;
      transcode: number;
      total: number;
      directPlayPercent: number;
      directStreamPercent?: number;
      transcodePercent: number;
    }> => {
      const searchParams = new URLSearchParams();
      if (params.period) searchParams.set('period', params.period);
      appendScope(searchParams, params.scope);
      searchParams.set('timezone', getDeviceTimezone());
      return apiGet<{
        directPlay: number;
        directStream?: number;
        transcode: number;
        total: number;
        directPlayPercent: number;
        directStreamPercent?: number;
        transcodePercent: number;
      }>(`/stats/quality?${searchParams.toString()}`, { signal });
    },
    concurrent: async (
      params: {
        period?: string;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ): Promise<{
      data: {
        hour: string;
        total: number;
        direct: number;
        directStream?: number;
        transcode: number;
      }[];
    }> => {
      const searchParams = new URLSearchParams();
      if (params.period) searchParams.set('period', params.period);
      appendScope(searchParams, params.scope);
      searchParams.set('timezone', getDeviceTimezone());
      return apiGet<{
        data: {
          hour: string;
          total: number;
          direct: number;
          directStream?: number;
          transcode: number;
        }[];
      }>(`/stats/concurrent?${searchParams.toString()}`, { signal });
    },
    locations: async (
      params?: {
        serverId?: string;
        userId?: string;
      },
      signal?: AbortSignal
    ): Promise<{
      data: {
        latitude: number;
        longitude: number;
        city: string;
        country: string;
        playCount: number;
      }[];
    }> => {
      return apiGet<{
        data: {
          latitude: number;
          longitude: number;
          city: string;
          country: string;
          playCount: number;
        }[];
      }>('/stats/locations', { params, signal });
    },
  },

  /**
   * Sessions
   */
  sessions: {
    active: async (scope: ServerScope, signal?: AbortSignal): Promise<ActiveSession[]> => {
      const params = new URLSearchParams();
      appendScope(params, scope);
      const query = params.toString();
      const { data } = await apiGet<{ data: ActiveSession[] }>(
        `/sessions/active${query ? `?${query}` : ''}`,
        { signal }
      );
      return data;
    },
    list: async (
      params?: {
        page?: number;
        pageSize?: number;
        userId?: string;
        serverId?: string;
      },
      signal?: AbortSignal
    ) => {
      return apiGet<PaginatedResponse<ActiveSession>>('/sessions', { params, signal });
    },
    get: async (id: string, signal?: AbortSignal): Promise<SessionWithDetails> => {
      return apiGet<SessionWithDetails>(`/sessions/${id}`, { signal });
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
    history: async (
      params: {
        cursor?: string;
        pageSize?: number;
        serverUserIds?: string[];
        scope: ServerScope;
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
      },
      signal?: AbortSignal
    ): Promise<HistorySessionResponse> => {
      const searchParams = new URLSearchParams();
      if (params.cursor) searchParams.set('cursor', params.cursor);
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params.serverUserIds?.length)
        searchParams.set('serverUserIds', params.serverUserIds.join(','));
      appendScope(searchParams, params.scope);
      if (params.state) searchParams.set('state', params.state);
      if (params.mediaTypes?.length) searchParams.set('mediaTypes', params.mediaTypes.join(','));
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());
      if (params.search) searchParams.set('search', params.search);
      if (params.platforms?.length) searchParams.set('platforms', params.platforms.join(','));
      if (params.product) searchParams.set('product', params.product);
      if (params.device) searchParams.set('device', params.device);
      if (params.playerName) searchParams.set('playerName', params.playerName);
      if (params.ipAddress) searchParams.set('ipAddress', params.ipAddress);
      if (params.geoCountries?.length)
        searchParams.set('geoCountries', params.geoCountries.join(','));
      if (params.geoCity) searchParams.set('geoCity', params.geoCity);
      if (params.geoRegion) searchParams.set('geoRegion', params.geoRegion);
      if (params.transcodeDecisions?.length)
        searchParams.set('transcodeDecisions', params.transcodeDecisions.join(','));
      if (params.watched !== undefined) searchParams.set('watched', String(params.watched));
      if (params.excludeShortSessions !== undefined)
        searchParams.set('excludeShortSessions', String(params.excludeShortSessions));
      if (params.orderBy) searchParams.set('orderBy', params.orderBy);
      if (params.orderDir) searchParams.set('orderDir', params.orderDir);
      return apiGet<HistorySessionResponse>(`/sessions/history?${searchParams.toString()}`, {
        signal,
      });
    },
    /**
     * Get aggregate stats for history (total plays, watch time, etc.)
     */
    historyAggregates: async (
      params: {
        scope: ServerScope;
        startDate?: Date;
        endDate?: Date;
      },
      signal?: AbortSignal
    ): Promise<HistoryAggregates> => {
      const searchParams = new URLSearchParams();
      appendScope(searchParams, params.scope);
      if (params.startDate) searchParams.set('startDate', params.startDate.toISOString());
      if (params.endDate) searchParams.set('endDate', params.endDate.toISOString());
      return apiGet<HistoryAggregates>(`/sessions/history/aggregates?${searchParams.toString()}`, {
        signal,
      });
    },
    /**
     * Get available filter options for history filtering (users, platforms, countries, etc.)
     */
    filterOptions: async (
      scope: ServerScope,
      signal?: AbortSignal
    ): Promise<HistoryFilterOptions> => {
      const params = new URLSearchParams();
      appendScope(params, scope);
      return apiGet<HistoryFilterOptions>(`/sessions/filter-options?${params.toString()}`, {
        signal,
      });
    },
  },

  /**
   * Users
   */
  users: {
    list: async (
      params: { page?: number; pageSize?: number; scope: ServerScope },
      signal?: AbortSignal
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
      appendScope(searchParams, params.scope);
      // 2.2 returns { data, meta }, 2.1 returns the fields at the top level; see listPage.ts.
      return apiGet<
        ListResponse<ServerUserWithIdentity> | PaginatedResponse<ServerUserWithIdentity>
      >(`/users?${searchParams.toString()}`, { signal });
    },
    get: async (id: string, signal?: AbortSignal): Promise<ServerUserDetail> => {
      return apiGet<ServerUserDetail>(`/users/${id}`, { signal });
    },
    sessions: async (
      id: string,
      params?: { page?: number; pageSize?: number },
      signal?: AbortSignal
    ) => {
      return apiGet<PaginatedResponse<Session>>(`/users/${id}/sessions`, { params, signal });
    },
    locations: async (id: string, signal?: AbortSignal): Promise<UserLocation[]> => {
      const { data } = await apiGet<{ data: UserLocation[] }>(`/users/${id}/locations`, { signal });
      return data;
    },
    devices: async (id: string, signal?: AbortSignal): Promise<UserDevice[]> => {
      const { data } = await apiGet<{ data: UserDevice[] }>(`/users/${id}/devices`, { signal });
      return data;
    },
    terminations: async (
      id: string,
      params?: { page?: number; pageSize?: number },
      signal?: AbortSignal
    ): Promise<PaginatedResponse<TerminationLogWithDetails>> => {
      return apiGet<PaginatedResponse<TerminationLogWithDetails>>(`/users/${id}/terminations`, {
        params,
        signal,
      });
    },
  },

  /**
   * Violations
   */
  violations: {
    list: async (
      params: {
        page?: number;
        pageSize?: number;
        userId?: string;
        severity?: string;
        acknowledged?: boolean;
        scope: ServerScope;
      },
      signal?: AbortSignal
    ) => {
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.set('page', String(params.page));
      if (params.pageSize) searchParams.set('pageSize', String(params.pageSize));
      if (params.userId) searchParams.set('userId', params.userId);
      if (params.severity) searchParams.set('severity', params.severity);
      if (params.acknowledged !== undefined)
        searchParams.set('acknowledged', String(params.acknowledged));
      appendScope(searchParams, params.scope);
      // 2.2 returns { data, meta }, 2.1 returns the fields at the top level; see listPage.ts.
      return apiGet<ListResponse<ViolationWithDetails> | PaginatedResponse<ViolationWithDetails>>(
        `/violations?${searchParams.toString()}`,
        { signal }
      );
    },
    get: async (id: string, signal?: AbortSignal): Promise<ViolationWithDetails> => {
      return apiGet<ViolationWithDetails>(`/violations/${id}`, { signal });
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
   * Servers
   */
  servers: {
    list: async (signal?: AbortSignal): Promise<Server[]> => {
      const { data } = await apiGet<{ data: Server[] }>('/servers', { signal });
      return data;
    },
    liveStats: async (id: string, signal?: AbortSignal): Promise<ServerLiveStats> => {
      return apiGet<ServerLiveStats>(`/servers/${id}/live-stats`, { signal });
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
    getPreferences: async (signal?: AbortSignal): Promise<NotificationPreferencesWithStatus> => {
      return apiGet<NotificationPreferencesWithStatus>('/notifications/preferences', { signal });
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
        '/notifications/test',
        {}
      );
      return response.data;
    },
  },

  /**
   * Server version. Public route; used to gate screens that only exist on 2.2+.
   */
  version: {
    get: async (signal?: AbortSignal): Promise<VersionInfo> => {
      return apiGet<VersionInfo>('/version', { signal });
    },
  },

  /**
   * Global settings (display preferences, etc.)
   */
  settings: {
    get: async (signal?: AbortSignal): Promise<Settings> => {
      return apiGet<Settings>('/settings', { signal });
    },
  },
};
