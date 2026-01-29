/**
 * Unified authentication and connection state store
 *
 * This is the single source of truth for:
 * - Server identity (paired servers, active server)
 * - Token validity (valid, revoked, refreshing)
 * - Connection state (connected, disconnected, unauthenticated)
 * - Storage availability
 *
 * Replaces the fragmented state across authStore.ts and connectionStore.ts
 */
import { create } from 'zustand';
import { storage, type ServerInfo } from './storage';
import { api, resetApiClient } from './api';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { isEncryptionAvailable, getDeviceSecret } from './crypto';

type TokenStatus = 'valid' | 'revoked' | 'refreshing' | 'unknown';
type ConnectionState = 'connected' | 'disconnected' | 'unauthenticated';

interface AuthStateStore {
  // Server identity
  servers: ServerInfo[];
  activeServerId: string | null;
  activeServer: ServerInfo | null;

  // Token validity
  tokenStatus: TokenStatus;

  // Connection state
  connectionState: ConnectionState;
  lastConnectionError: string | null;
  retryCount: number;
  retryTimerId: ReturnType<typeof setTimeout> | null;

  // For UnauthenticatedScreen display
  cachedServerUrl: string | null;
  cachedServerName: string | null;

  // Initialization
  isInitializing: boolean;
  storageAvailable: boolean;
  error: string | null;

  // Derived (computed from servers/activeServer)
  readonly isAuthenticated: boolean;
  readonly serverUrl: string | null;
  readonly serverName: string | null;

  // Actions - Initialization
  initialize: () => Promise<void>;
  retryStorageAccess: () => Promise<void>;
  resetStorageState: () => void;

  // Actions - Server management
  pair: (serverUrl: string, token: string) => Promise<void>;
  addServer: (serverUrl: string, token: string) => Promise<void>;
  selectServer: (serverId: string) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
  logout: () => Promise<void>;

  // Actions - Token state
  setTokenValid: () => void;
  setTokenRefreshing: () => void;
  setTokenRevoked: (serverUrl?: string, serverName?: string | null) => void;

  // Actions - Connection state
  setConnected: () => void;
  setDisconnected: (error: string) => void;
  scheduleRetry: (retryFn: () => Promise<unknown>) => void;
  cancelRetry: () => void;

  // Actions - Unified auth failure handler
  handleAuthFailure: (serverUrl?: string, serverName?: string | null) => void;

  // Actions - Error handling
  clearError: () => void;

  // Actions - Full reset
  reset: () => void;
}

export const useAuthStateStore = create<AuthStateStore>((set, get) => ({
  // Initial state
  servers: [],
  activeServerId: null,
  activeServer: null,
  tokenStatus: 'unknown',
  connectionState: 'disconnected', // Start disconnected until we verify auth
  lastConnectionError: null,
  retryCount: 0,
  retryTimerId: null,
  cachedServerUrl: null,
  cachedServerName: null,
  isInitializing: true,
  storageAvailable: true,
  error: null,

  // Derived getters (computed on access)
  get isAuthenticated() {
    const state = get();
    return state.servers.length > 0 && state.activeServer !== null;
  },

  get serverUrl() {
    return get().activeServer?.url ?? null;
  },

  get serverName() {
    return get().activeServer?.name ?? null;
  },

  // ==================== Initialization ====================

  initialize: async () => {
    try {
      set({ isInitializing: true, error: null });

      const available = await storage.checkStorageAvailability();
      if (!available) {
        console.warn('[AuthState] Storage unavailable');
        set({ storageAvailable: false, isInitializing: false });
        return;
      }

      await storage.migrateFromLegacy();

      const [servers, activeServerId] = await Promise.all([
        storage.getServers(),
        storage.getActiveServerId(),
      ]);

      let activeServer = activeServerId
        ? (servers.find((s) => s.id === activeServerId) ?? null)
        : null;

      // Auto-select first server if none active
      if (servers.length > 0 && !activeServer) {
        const firstServer = servers[0]!;
        await storage.setActiveServerId(firstServer.id);
        activeServer = firstServer;
      }

      console.log('[AuthState] Initialization complete:', {
        serverCount: servers.length,
        activeServerId: activeServer?.id ?? null,
      });

      // Don't overwrite 'unauthenticated' state - that means token was revoked
      // and we should stay in that state until user re-authenticates
      const currentConnectionState = get().connectionState;
      const newConnectionState =
        currentConnectionState === 'unauthenticated'
          ? 'unauthenticated'
          : activeServer
            ? 'connected'
            : 'disconnected';

      set({
        servers,
        activeServerId: activeServer?.id ?? null,
        activeServer,
        storageAvailable: true,
        tokenStatus:
          currentConnectionState === 'unauthenticated'
            ? 'revoked'
            : activeServer
              ? 'valid'
              : 'unknown',
        connectionState: newConnectionState,
        isInitializing: false,
      });
    } catch (error) {
      console.error('[AuthState] Initialization failed:', error);
      set({
        servers: [],
        activeServerId: null,
        activeServer: null,
        storageAvailable: true,
        isInitializing: false,
        error: 'Failed to initialize authentication',
      });
    }
  },

  retryStorageAccess: async () => {
    if (get().isInitializing) return;
    set({ isInitializing: true });
    await get().initialize();
  },

  resetStorageState: () => {
    storage.resetFailureCount();
    set({
      storageAvailable: true,
      isInitializing: false,
      error: null,
    });
  },

  // ==================== Server Management ====================

  pair: async (serverUrl: string, token: string) => {
    await get().addServer(serverUrl, token);
  },

  addServer: async (serverUrl: string, token: string) => {
    try {
      set({ isInitializing: true, error: null });

      const deviceName =
        Device.deviceName || `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`;
      const deviceId = Device.osBuildId || `${Platform.OS}-${Date.now()}`;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';
      const normalizedUrl = serverUrl.replace(/\/$/, '');

      let deviceSecret: string | undefined;
      if (isEncryptionAvailable()) {
        try {
          deviceSecret = await getDeviceSecret();
        } catch (error) {
          console.warn('[AuthState] Failed to get device secret:', error);
        }
      }

      const response = await api.pair(
        normalizedUrl,
        token,
        deviceName,
        deviceId,
        platform,
        deviceSecret
      );

      const serverInfo: ServerInfo = {
        id: response.server.id,
        url: normalizedUrl,
        name: response.server.name,
        type: response.server.type,
        addedAt: new Date().toISOString(),
      };

      const addOk = await storage.addServer(serverInfo, {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      if (!addOk) {
        throw new Error('Failed to store server credentials');
      }

      await storage.setActiveServerId(serverInfo.id);
      resetApiClient();

      const servers = await storage.getServers();

      set({
        servers,
        activeServerId: serverInfo.id,
        activeServer: serverInfo,
        storageAvailable: true,
        tokenStatus: 'valid',
        connectionState: 'connected',
        isInitializing: false,
        error: null,
      });
    } catch (error) {
      console.error('[AuthState] Add server failed:', error);
      set({
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Failed to add server',
      });
      throw error;
    }
  },

  selectServer: async (serverId: string) => {
    try {
      const { servers } = get();
      const server = servers.find((s) => s.id === serverId);

      if (!server) {
        throw new Error('Server not found');
      }

      await storage.setActiveServerId(serverId);
      resetApiClient();

      // Reset connection state when switching servers
      const { retryTimerId } = get();
      if (retryTimerId) clearTimeout(retryTimerId);

      set({
        activeServerId: serverId,
        activeServer: server,
        tokenStatus: 'valid',
        connectionState: 'connected',
        lastConnectionError: null,
        retryCount: 0,
        retryTimerId: null,
      });
    } catch (error) {
      console.error('[AuthState] Select server failed:', error);
      set({ error: 'Failed to switch server' });
    }
  },

  removeServer: async (serverId: string) => {
    try {
      set({ isInitializing: true });

      await storage.removeServer(serverId);
      resetApiClient();

      const servers = await storage.getServers();
      const activeServerId = await storage.getActiveServerId();
      const activeServer = activeServerId
        ? (servers.find((s) => s.id === activeServerId) ?? null)
        : null;

      const { retryTimerId } = get();
      if (retryTimerId) clearTimeout(retryTimerId);

      if (servers.length === 0) {
        set({
          servers: [],
          activeServerId: null,
          activeServer: null,
          tokenStatus: 'unknown',
          connectionState: 'connected',
          lastConnectionError: null,
          retryCount: 0,
          retryTimerId: null,
          isInitializing: false,
          error: null,
        });
      } else {
        set({
          servers,
          activeServerId,
          activeServer,
          isInitializing: false,
        });
      }
    } catch (error) {
      console.error('[AuthState] Remove server failed:', error);
      set({ isInitializing: false, error: 'Failed to remove server' });
    }
  },

  logout: async () => {
    const { activeServerId } = get();
    if (activeServerId) {
      await get().removeServer(activeServerId);
    }
  },

  // ==================== Token State ====================

  setTokenValid: () => {
    set({ tokenStatus: 'valid' });
  },

  setTokenRefreshing: () => {
    set({ tokenStatus: 'refreshing' });
  },

  setTokenRevoked: (serverUrl?: string, serverName?: string | null) => {
    const { activeServer, retryTimerId } = get();
    if (retryTimerId) clearTimeout(retryTimerId);

    set({
      tokenStatus: 'revoked',
      connectionState: 'unauthenticated',
      lastConnectionError: null,
      retryCount: 0,
      retryTimerId: null,
      cachedServerUrl: serverUrl ?? activeServer?.url ?? null,
      cachedServerName: serverName ?? activeServer?.name ?? null,
    });
  },

  // ==================== Connection State ====================

  setConnected: () => {
    // Don't overwrite 'unauthenticated' state - that requires re-authentication
    const { connectionState, retryTimerId } = get();
    if (connectionState === 'unauthenticated') {
      return;
    }
    if (retryTimerId) clearTimeout(retryTimerId);

    set({
      connectionState: 'connected',
      lastConnectionError: null,
      retryCount: 0,
      retryTimerId: null,
    });
  },

  setDisconnected: (error: string) => {
    // Don't overwrite 'unauthenticated' state - that requires re-authentication
    const currentState = get().connectionState;
    if (currentState === 'unauthenticated') {
      return;
    }
    set((prev) => ({
      connectionState: 'disconnected',
      lastConnectionError: error,
      retryCount: prev.retryCount + 1,
    }));
  },

  scheduleRetry: (retryFn: () => Promise<unknown>) => {
    // Don't schedule retries if unauthenticated - user needs to re-pair
    const { connectionState, retryTimerId } = get();
    if (connectionState === 'unauthenticated') {
      return;
    }
    if (retryTimerId) clearTimeout(retryTimerId);

    const timerId = setTimeout(() => {
      void retryFn();
    }, 30000);

    set({ retryTimerId: timerId });
  },

  cancelRetry: () => {
    const { retryTimerId } = get();
    if (retryTimerId) {
      clearTimeout(retryTimerId);
      set({ retryTimerId: null });
    }
  },

  // ==================== Unified Auth Failure Handler ====================

  handleAuthFailure: (serverUrl?: string, serverName?: string | null) => {
    const { activeServer, activeServerId, retryTimerId, connectionState } = get();

    // Prevent duplicate handling
    if (connectionState === 'unauthenticated') {
      return;
    }

    if (retryTimerId) clearTimeout(retryTimerId);

    // Clear API client for this server
    if (activeServerId) {
      resetApiClient();
    }

    set({
      tokenStatus: 'revoked',
      connectionState: 'unauthenticated',
      lastConnectionError: null,
      retryCount: 0,
      retryTimerId: null,
      cachedServerUrl: serverUrl ?? activeServer?.url ?? null,
      cachedServerName: serverName ?? activeServer?.name ?? null,
    });
  },

  // ==================== Error Handling ====================

  clearError: () => {
    set({ error: null });
  },

  // ==================== Full Reset ====================

  reset: () => {
    const { retryTimerId } = get();
    if (retryTimerId) clearTimeout(retryTimerId);

    set({
      servers: [],
      activeServerId: null,
      activeServer: null,
      tokenStatus: 'unknown',
      connectionState: 'connected',
      lastConnectionError: null,
      retryCount: 0,
      retryTimerId: null,
      cachedServerUrl: null,
      cachedServerName: null,
      isInitializing: false,
      storageAvailable: true,
      error: null,
    });
  },
}));

// Re-export for backwards compatibility during migration
export { useAuthStateStore as useAuthStore };
