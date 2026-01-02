/**
 * Authentication state store using Zustand
 * Supports multiple server connections with active server selection
 */
import { create } from 'zustand';
import { storage, type ServerInfo } from './storage';
import { api, resetApiClient } from './api';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { isEncryptionAvailable, getDeviceSecret } from './crypto';

interface AuthState {
  servers: ServerInfo[];
  activeServerId: string | null;
  activeServer: ServerInfo | null;
  storageAvailable: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string | null;
  serverName: string | null;
  error: string | null;

  initialize: () => Promise<void>;
  retryStorageAccess: () => Promise<void>;
  pair: (serverUrl: string, token: string) => Promise<void>;
  addServer: (serverUrl: string, token: string) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
  selectServer: (serverId: string) => Promise<void>;
  /** @deprecated Use removeServer(serverId) instead */
  logout: () => Promise<void>;
  removeActiveServer: () => Promise<void>;
  resetStorageState: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  servers: [],
  activeServerId: null,
  activeServer: null,
  storageAvailable: true,
  isAuthenticated: false,
  isLoading: true,
  serverUrl: null,
  serverName: null,
  error: null,

  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Check storage availability - handles Android Keystore flakiness
      const available = await storage.checkStorageAvailability();

      if (!available) {
        console.warn('[AuthStore] Storage unavailable - may need app restart');
        set({
          storageAvailable: false,
          isLoading: false,
          error: null,
        });
        return;
      }

      // Storage is available - proceed normally
      await storage.migrateFromLegacy();

      const [servers, activeServerId] = await Promise.all([
        storage.getServers(),
        storage.getActiveServerId(),
      ]);
      const activeServer = activeServerId
        ? (servers.find((s) => s.id === activeServerId) ?? null)
        : null;

      if (servers.length > 0 && !activeServer) {
        const firstServer = servers[0]!;
        const setOk = await storage.setActiveServerId(firstServer.id);
        if (!setOk) console.warn('[AuthStore] Failed to set active server ID');
        set({
          servers,
          activeServerId: firstServer.id,
          activeServer: firstServer,
          storageAvailable: true,
          isAuthenticated: true,
          serverUrl: firstServer.url,
          serverName: firstServer.name,
          isLoading: false,
        });
      } else if (activeServer) {
        set({
          servers,
          activeServerId,
          activeServer,
          storageAvailable: true,
          isAuthenticated: true,
          serverUrl: activeServer.url,
          serverName: activeServer.name,
          isLoading: false,
        });
      } else {
        set({
          servers: [],
          activeServerId: null,
          activeServer: null,
          storageAvailable: true,
          isAuthenticated: false,
          serverUrl: null,
          serverName: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({
        servers: [],
        activeServerId: null,
        activeServer: null,
        storageAvailable: true,
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  },

  retryStorageAccess: async () => {
    if (get().isLoading) {
      console.log('[AuthStore] Retry skipped - already loading');
      return;
    }
    set({ isLoading: true });
    await get().initialize();
  },

  resetStorageState: () => {
    storage.resetFailureCount();
    set({
      storageAvailable: true,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },

  pair: async (serverUrl: string, token: string) => {
    await get().addServer(serverUrl, token);
  },

  addServer: async (serverUrl: string, token: string) => {
    try {
      set({ isLoading: true, error: null });

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
          console.warn('Failed to get device secret for encryption:', error);
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

      const setOk = await storage.setActiveServerId(serverInfo.id);
      if (!setOk) console.warn('[AuthStore] Failed to set active server ID');
      resetApiClient();

      const servers = await storage.getServers();
      set({
        servers,
        activeServerId: serverInfo.id,
        activeServer: serverInfo,
        storageAvailable: true,
        isAuthenticated: true,
        serverUrl: normalizedUrl,
        serverName: serverInfo.name,
        isLoading: false,
      });
    } catch (error) {
      console.error('Adding server failed:', error);
      set({
        isLoading: false,
        error:
          error instanceof Error ? error.message : 'Failed to add server. Check URL and token.',
      });
      throw error;
    }
  },

  removeServer: async (serverId: string) => {
    try {
      set({ isLoading: true });

      await storage.removeServer(serverId);

      const servers = await storage.getServers();
      const activeServerId = await storage.getActiveServerId();
      const activeServer = activeServerId
        ? (servers.find((s) => s.id === activeServerId) ?? null)
        : null;

      resetApiClient();

      if (servers.length === 0) {
        set({
          servers: [],
          activeServerId: null,
          activeServer: null,
          storageAvailable: true,
          isAuthenticated: false,
          serverUrl: null,
          serverName: null,
          isLoading: false,
          error: null,
        });
      } else {
        set({
          servers,
          activeServerId,
          activeServer,
          isAuthenticated: true,
          serverUrl: activeServer?.url ?? null,
          serverName: activeServer?.name ?? null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Removing server failed:', error);
      set({
        isLoading: false,
        error: 'Failed to remove server',
      });
    }
  },

  selectServer: async (serverId: string) => {
    try {
      const { servers } = get();
      const server = servers.find((s) => s.id === serverId);

      if (!server) {
        throw new Error('Server not found');
      }

      const setOk = await storage.setActiveServerId(serverId);
      if (!setOk) {
        throw new Error('Failed to save server selection');
      }
      resetApiClient();

      set({
        activeServerId: serverId,
        activeServer: server,
        serverUrl: server.url,
        serverName: server.name,
      });
    } catch (error) {
      console.error('Selecting server failed:', error);
      set({
        error: 'Failed to switch server',
      });
    }
  },

  /** @deprecated Use removeServer(serverId) instead */
  logout: async () => {
    const { activeServerId } = get();
    if (activeServerId) {
      await get().removeServer(activeServerId);
    }
  },

  removeActiveServer: async () => {
    const { activeServerId } = get();
    if (activeServerId) {
      await get().removeServer(activeServerId);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
