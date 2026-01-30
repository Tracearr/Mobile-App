/**
 * Storage utilities for mobile app
 * Simplified for single-server model
 */
import * as ResilientStorage from './resilientStorage';
import type { StateStorage } from 'zustand/middleware';

/**
 * Zustand persist storage adapter
 * Uses resilient storage (SecureStore with AsyncStorage fallback)
 */
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    return ResilientStorage.getItemAsync(name);
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await ResilientStorage.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await ResilientStorage.deleteItemAsync(name);
  },
};

/**
 * Legacy storage interface for backwards compatibility during migration
 * Will be removed after api.ts is updated (Task 3)
 */
export interface ServerInfo {
  id: string;
  url: string;
  name: string;
  type: 'plex' | 'jellyfin' | 'emby';
  addedAt: string;
}

export interface ServerCredentials {
  accessToken: string;
  refreshToken: string;
}

// Keys for token storage (simple, no server ID suffix)
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'tracearr_access_token',
  REFRESH_TOKEN: 'tracearr_refresh_token',
} as const;

/**
 * @deprecated Use authStateStore and token functions directly
 * This object exists only for backwards compatibility with api.ts during migration
 */
export const storage = {
  /**
   * @deprecated Use useAuthStateStore().server instead
   */
  async getServers(): Promise<ServerInfo[]> {
    // Return empty - this will be removed
    return [];
  },

  /**
   * @deprecated Use useAuthStateStore().pairServer instead
   */
  async addServer(_server: ServerInfo, _credentials: ServerCredentials): Promise<boolean> {
    // No-op - this will be removed
    return false;
  },

  /**
   * @deprecated Use useAuthStateStore().unpairServer instead
   */
  async removeServer(_serverId: string): Promise<boolean> {
    // No-op - this will be removed
    return false;
  },

  /**
   * @deprecated Single server model - no server selection needed
   */
  async getServer(_serverId: string): Promise<ServerInfo | null> {
    return null;
  },

  /**
   * @deprecated Single server model - no active server concept
   */
  async getActiveServerId(): Promise<string | null> {
    return null;
  },

  /**
   * @deprecated Single server model - no active server concept
   */
  async setActiveServerId(_serverId: string): Promise<boolean> {
    return false;
  },

  /**
   * @deprecated Use authStateStore.server instead
   */
  async getActiveServer(): Promise<ServerInfo | null> {
    return null;
  },

  /**
   * @deprecated Use getAccessToken/getRefreshToken from authStateStore
   */
  async getServerCredentials(_serverId: string): Promise<ServerCredentials | null> {
    const [accessToken, refreshToken] = await Promise.all([
      ResilientStorage.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN),
      ResilientStorage.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN),
    ]);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  },

  /**
   * @deprecated Use setTokens from authStateStore
   */
  async updateServerTokens(
    _serverId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<boolean> {
    const [accessOk, refreshOk] = await Promise.all([
      ResilientStorage.setItemAsync(TOKEN_KEYS.ACCESS_TOKEN, accessToken),
      ResilientStorage.setItemAsync(TOKEN_KEYS.REFRESH_TOKEN, refreshToken),
    ]);
    return accessOk && refreshOk;
  },

  /**
   * @deprecated Use getAccessToken from authStateStore
   */
  async getAccessToken(): Promise<string | null> {
    return ResilientStorage.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
  },

  /**
   * @deprecated Use getRefreshToken from authStateStore
   */
  async getRefreshToken(): Promise<string | null> {
    return ResilientStorage.getItemAsync(TOKEN_KEYS.REFRESH_TOKEN);
  },

  /**
   * @deprecated Use authStateStore.serverUrl instead
   */
  async getServerUrl(): Promise<string | null> {
    return null;
  },

  /**
   * @deprecated Use setTokens from authStateStore
   */
  async updateTokens(accessToken: string, refreshToken: string): Promise<boolean> {
    return this.updateServerTokens('', accessToken, refreshToken);
  },

  /**
   * @deprecated Migration no longer needed with new storage key
   */
  async migrateFromLegacy(): Promise<boolean> {
    return false;
  },

  /**
   * @deprecated Use authStateStore.isAuthenticated instead
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await ResilientStorage.getItemAsync(TOKEN_KEYS.ACCESS_TOKEN);
    return accessToken !== null;
  },

  async checkStorageAvailability(): Promise<boolean> {
    return ResilientStorage.checkStorageAvailability();
  },

  isStorageUnavailable(): boolean {
    return ResilientStorage.isStorageUnavailable();
  },

  resetFailureCount(): void {
    ResilientStorage.resetFailureCount();
  },
};
