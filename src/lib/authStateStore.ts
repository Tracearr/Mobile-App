/**
 * Auth state management with Zustand
 * Single-server model - Tracearr mobile connects to ONE server
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { zustandStorage } from './storage';
import * as ResilientStorage from './resilientStorage';
import { api, resetApiClient } from './api';
import { isEncryptionAvailable, getDeviceSecret } from './crypto';

// Types
export interface StoredServer {
  id: string;
  url: string;
  name: string;
  type: 'plex' | 'jellyfin' | 'emby';
  pairedAt: string;
}

export interface UserInfo {
  id: string;
  username: string;
  role: 'admin' | 'owner' | 'user';
}

type ConnectionState = 'connected' | 'disconnected' | 'unauthenticated';
type TokenStatus = 'valid' | 'revoked' | 'refreshing' | 'unknown';

interface AuthState {
  // Core state (single server)
  server: StoredServer | null;
  user: UserInfo | null;

  // Connection status
  connectionState: ConnectionState;
  tokenStatus: TokenStatus;

  // UI state
  isInitializing: boolean;
  error: string | null;

  // Cached values for unauthenticated screen
  _cachedServerUrl: string | null;
  _cachedServerName: string | null;

  // Actions
  pairServer: (url: string, token: string) => Promise<void>;
  unpairServer: () => Promise<void>;
  setConnectionState: (state: ConnectionState) => void;
  setTokenStatus: (status: TokenStatus) => void;
  setUser: (user: UserInfo | null) => void;
  clearError: () => void;
  handleAuthFailure: () => void;
  setInitializing: (isInitializing: boolean) => void;
  setError: (error: string | null) => void;

  // Derived (getters)
  readonly isAuthenticated: boolean;
  readonly serverUrl: string | null;
  readonly serverName: string | null;
}

// Storage keys for tokens (stored separately from Zustand state)
const STORAGE_KEYS = {
  ACCESS_TOKEN: 'tracearr_access_token',
  REFRESH_TOKEN: 'tracearr_refresh_token',
} as const;

// Helper: Normalize URL (ensure trailing slash removed, add https if missing)
function normalizeUrl(url: string): string {
  let normalized = url.trim();
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = `https://${normalized}`;
  }
  return normalized.replace(/\/+$/, '');
}

// Helper: Get device name for pairing
function getDeviceName(): string {
  return Device.deviceName || `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`;
}

// Helper: Get device ID for pairing
function getDeviceId(): string {
  return Device.osBuildId || `${Platform.OS}-${Date.now()}`;
}

// Helper: Get platform
function getPlatform(): 'ios' | 'android' {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

export const useAuthStateStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      server: null,
      user: null,
      connectionState: 'disconnected',
      tokenStatus: 'unknown',
      isInitializing: true,
      error: null,
      _cachedServerUrl: null,
      _cachedServerName: null,

      // Derived getters
      get isAuthenticated() {
        const state = get();
        return state.server !== null && state.tokenStatus !== 'revoked';
      },

      get serverUrl() {
        return get().server?.url ?? null;
      },

      get serverName() {
        return get().server?.name ?? null;
      },

      // Actions
      pairServer: async (url: string, token: string) => {
        set({ isInitializing: true, error: null });

        try {
          const normalizedUrl = normalizeUrl(url);
          const deviceName = getDeviceName();
          const deviceId = getDeviceId();
          const platform = getPlatform();

          // Get device secret for encrypted push notifications (optional)
          let deviceSecret: string | undefined;
          if (isEncryptionAvailable()) {
            try {
              deviceSecret = await getDeviceSecret();
            } catch (error) {
              console.warn('[AuthState] Failed to get device secret:', error);
            }
          }

          // Call pairing API
          const response = await api.pair(
            normalizedUrl,
            token,
            deviceName,
            deviceId,
            platform,
            deviceSecret
          );

          // Store tokens using resilient storage (with retry logic and Android fallback)
          const accessOk = await ResilientStorage.setItemAsync(
            STORAGE_KEYS.ACCESS_TOKEN,
            response.accessToken
          );
          const refreshOk = await ResilientStorage.setItemAsync(
            STORAGE_KEYS.REFRESH_TOKEN,
            response.refreshToken
          );

          if (!accessOk || !refreshOk) {
            throw new Error('Failed to store credentials securely');
          }

          // Create server record from response
          const server: StoredServer = {
            id: response.server.id,
            url: normalizedUrl,
            name: response.server.name,
            type: response.server.type,
            pairedAt: new Date().toISOString(),
          };

          // Create user record from response
          const user: UserInfo = {
            id: response.user.userId,
            username: response.user.username,
            role: response.user.role,
          };

          // Reset API client cache so it picks up new server
          resetApiClient();

          set({
            server,
            user,
            connectionState: 'connected',
            tokenStatus: 'valid',
            isInitializing: false,
            error: null,
            _cachedServerUrl: normalizedUrl,
            _cachedServerName: server.name,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to pair with server';
          set({
            isInitializing: false,
            error: message,
          });
          throw error;
        }
      },

      unpairServer: async () => {
        // Clear tokens using resilient storage
        await ResilientStorage.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
        await ResilientStorage.deleteItemAsync(STORAGE_KEYS.REFRESH_TOKEN);

        // Reset API client cache
        resetApiClient();

        // Reset state
        set({
          server: null,
          user: null,
          connectionState: 'disconnected',
          tokenStatus: 'unknown',
          error: null,
          _cachedServerUrl: null,
          _cachedServerName: null,
        });
      },

      setConnectionState: (connectionState) => {
        const current = get();
        // Don't overwrite 'unauthenticated' with 'disconnected'
        if (current.connectionState === 'unauthenticated' && connectionState === 'disconnected') {
          return;
        }
        set({ connectionState });
      },

      setTokenStatus: (tokenStatus) => set({ tokenStatus }),

      setUser: (user) => set({ user }),

      clearError: () => set({ error: null }),

      setInitializing: (isInitializing) => set({ isInitializing }),

      setError: (error) => set({ error }),

      handleAuthFailure: () => {
        const current = get();
        // Cache server info for unauthenticated screen
        set({
          connectionState: 'unauthenticated',
          tokenStatus: 'revoked',
          _cachedServerUrl: current.server?.url ?? current._cachedServerUrl,
          _cachedServerName: current.server?.name ?? current._cachedServerName,
        });
      },
    }),
    {
      name: 'tracearr-auth-v2', // New key to force logout existing users
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        server: state.server,
        user: state.user,
        _cachedServerUrl: state._cachedServerUrl,
        _cachedServerName: state._cachedServerName,
      }),
      onRehydrateStorage: () => (state) => {
        // Called after hydration completes - mark initialization as done
        if (state) {
          state.setInitializing(false);
        }
      },
    }
  )
);

// Selectors for optimized subscriptions
export const authSelectors = {
  server: (s: AuthState) => s.server,
  user: (s: AuthState) => s.user,
  isAuthenticated: (s: AuthState) => s.server !== null && s.tokenStatus !== 'revoked',
  connectionState: (s: AuthState) => s.connectionState,
  tokenStatus: (s: AuthState) => s.tokenStatus,
  isInitializing: (s: AuthState) => s.isInitializing,
  error: (s: AuthState) => s.error,
  serverUrl: (s: AuthState) => s.server?.url ?? null,
  serverName: (s: AuthState) => s.server?.name ?? null,
  // Cached values for unauthenticated screen (when server is null but we need display info)
  cachedServerUrl: (s: AuthState) => s._cachedServerUrl,
  cachedServerName: (s: AuthState) => s._cachedServerName,
};

// Token access for API client (uses resilient storage)
export async function getAccessToken(): Promise<string | null> {
  return ResilientStorage.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return ResilientStorage.getItemAsync(STORAGE_KEYS.REFRESH_TOKEN);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  await ResilientStorage.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, access);
  await ResilientStorage.setItemAsync(STORAGE_KEYS.REFRESH_TOKEN, refresh);
}

// Re-export for backwards compatibility during migration
export { useAuthStateStore as useAuthStore };
