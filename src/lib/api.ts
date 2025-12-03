/**
 * API client for Tracearr mobile app
 * Uses axios with automatic token refresh
 */
import axios from 'axios';
import type { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { storage } from './storage';
import type {
  ActiveSession,
  DashboardStats,
  ServerUserWithIdentity,
  ServerUserDetail,
  Violation,
  ViolationWithDetails,
  Rule,
  Server,
  MobilePairResponse,
  PaginatedResponse,
} from '@tracearr/shared';

let apiClient: AxiosInstance | null = null;

/**
 * Initialize or get the API client
 */
export async function getApiClient(): Promise<AxiosInstance> {
  if (apiClient) {
    return apiClient;
  }

  const serverUrl = await storage.getServerUrl();
  if (!serverUrl) {
    throw new Error('No server configured');
  }

  apiClient = createApiClient(serverUrl);
  return apiClient;
}

/**
 * Create a new API client for a given server URL
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
      const token = await storage.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
  );

  // Response interceptor - handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      // If 401 and not already retrying, attempt token refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await storage.getRefreshToken();
          if (!refreshToken) {
            throw new Error('No refresh token');
          }

          const response = await client.post<{ accessToken: string; refreshToken: string }>(
            '/mobile/refresh',
            { refreshToken }
          );

          await storage.updateTokens(response.data.accessToken, response.data.refreshToken);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
          return await client(originalRequest);
        } catch {
          // Refresh failed - clear credentials and throw
          await storage.clearCredentials();
          throw new Error('Session expired');
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

/**
 * Reset the API client (call when switching servers or logging out)
 */
export function resetApiClient(): void {
  apiClient = null;
}

/**
 * API methods organized by domain
 */
export const api = {
  /**
   * Pair with server using mobile token
   */
  pair: async (
    serverUrl: string,
    token: string,
    deviceName: string,
    deviceId: string,
    platform: 'ios' | 'android'
  ): Promise<MobilePairResponse> => {
    const response = await axios.post<MobilePairResponse>(
      `${serverUrl}/api/v1/mobile/pair`,
      { token, deviceName, deviceId, platform }
    );
    return response.data;
  },

  /**
   * Dashboard stats
   */
  stats: {
    dashboard: async (): Promise<DashboardStats> => {
      const client = await getApiClient();
      const response = await client.get<DashboardStats>('/stats/dashboard');
      return response.data;
    },
    plays: async (params?: { days?: number }): Promise<{ data: { date: string; plays: number }[] }> => {
      const client = await getApiClient();
      const response = await client.get<{ data: { date: string; plays: number }[] }>('/stats/plays', { params });
      return response.data;
    },
    platforms: async (params?: { days?: number }): Promise<{ data: { platform: string; plays: number }[] }> => {
      const client = await getApiClient();
      const response = await client.get<{ data: { platform: string; plays: number }[] }>('/stats/platforms', { params });
      return response.data;
    },
    locations: async (params?: { serverId?: string; userId?: string }): Promise<{ data: { latitude: number; longitude: number; city: string; country: string; playCount: number }[] }> => {
      const client = await getApiClient();
      const response = await client.get<{ data: { latitude: number; longitude: number; city: string; country: string; playCount: number }[] }>('/stats/locations', { params });
      return response.data;
    },
  },

  /**
   * Sessions
   */
  sessions: {
    active: async (): Promise<ActiveSession[]> => {
      const client = await getApiClient();
      const response = await client.get<{ data: ActiveSession[] }>('/sessions/active');
      return response.data.data;
    },
    list: async (params?: { page?: number; pageSize?: number; userId?: string }) => {
      const client = await getApiClient();
      const response = await client.get<PaginatedResponse<ActiveSession>>('/sessions', { params });
      return response.data;
    },
  },

  /**
   * Users
   */
  users: {
    list: async (params?: { page?: number; pageSize?: number }) => {
      const client = await getApiClient();
      const response = await client.get<PaginatedResponse<ServerUserWithIdentity>>('/users', { params });
      return response.data;
    },
    get: async (id: string): Promise<ServerUserDetail> => {
      const client = await getApiClient();
      const response = await client.get<ServerUserDetail>(`/users/${id}`);
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
    }) => {
      const client = await getApiClient();
      const response = await client.get<PaginatedResponse<ViolationWithDetails>>('/violations', { params });
      return response.data;
    },
    acknowledge: async (id: string): Promise<Violation> => {
      const client = await getApiClient();
      const response = await client.patch<Violation>(`/violations/${id}`);
      return response.data;
    },
    dismiss: async (id: string): Promise<void> => {
      const client = await getApiClient();
      await client.delete(`/violations/${id}`);
    },
  },

  /**
   * Rules
   */
  rules: {
    list: async (): Promise<Rule[]> => {
      const client = await getApiClient();
      const response = await client.get<{ data: Rule[] }>('/rules');
      return response.data.data;
    },
    toggle: async (id: string, isActive: boolean): Promise<Rule> => {
      const client = await getApiClient();
      const response = await client.patch<Rule>(`/rules/${id}`, { isActive });
      return response.data;
    },
  },

  /**
   * Servers
   */
  servers: {
    list: async (): Promise<Server[]> => {
      const client = await getApiClient();
      const response = await client.get<{ data: Server[] }>('/servers');
      return response.data.data;
    },
  },
};
