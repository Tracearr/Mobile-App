/**
 * Secure storage utilities for mobile app credentials
 * Supports multiple server connections with independent credentials
 */
import * as ResilientStorage from './resilientStorage';

// Keys for secure storage (per-server, uses serverId suffix)
const SECURE_KEYS = {
  ACCESS_TOKEN: 'tracearr_access_token',
  REFRESH_TOKEN: 'tracearr_refresh_token',
} as const;

// Keys for general storage (JSON-serializable data, stored in SecureStore)
const STORAGE_KEYS = {
  SERVERS: 'tracearr_servers',
  ACTIVE_SERVER: 'tracearr_active_server',
} as const;

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

export interface StoredServer extends ServerInfo {
  credentials: ServerCredentials;
}

function getSecureKey(baseKey: string, serverId: string): string {
  return `${baseKey}_${serverId}`;
}

export const storage = {
  async getServers(): Promise<ServerInfo[]> {
    const data = await ResilientStorage.getItemAsync(STORAGE_KEYS.SERVERS);
    if (!data) return [];
    try {
      return JSON.parse(data) as ServerInfo[];
    } catch {
      return [];
    }
  },

  async addServer(server: ServerInfo, credentials: ServerCredentials): Promise<boolean> {
    // Store credentials in parallel
    const [accessOk, refreshOk] = await Promise.all([
      ResilientStorage.setItemAsync(
        getSecureKey(SECURE_KEYS.ACCESS_TOKEN, server.id),
        credentials.accessToken
      ),
      ResilientStorage.setItemAsync(
        getSecureKey(SECURE_KEYS.REFRESH_TOKEN, server.id),
        credentials.refreshToken
      ),
    ]);

    if (!accessOk || !refreshOk) {
      console.error('[Storage] Failed to store credentials');
      // Rollback: clean up any partially stored credentials
      await Promise.all([
        ResilientStorage.deleteItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, server.id)),
        ResilientStorage.deleteItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, server.id)),
      ]);
      return false;
    }

    // Add server to list
    const servers = await this.getServers();
    const existingIndex = servers.findIndex((s) => s.id === server.id);
    if (existingIndex >= 0) {
      servers[existingIndex] = server;
    } else {
      servers.push(server);
    }

    const serversOk = await ResilientStorage.setItemAsync(
      STORAGE_KEYS.SERVERS,
      JSON.stringify(servers)
    );
    if (!serversOk) {
      console.error('[Storage] Failed to store server list');
      // Rollback: remove credentials since server list update failed
      await Promise.all([
        ResilientStorage.deleteItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, server.id)),
        ResilientStorage.deleteItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, server.id)),
      ]);
      return false;
    }

    return true;
  },

  async removeServer(serverId: string): Promise<boolean> {
    const servers = await this.getServers();
    const filtered = servers.filter((s) => s.id !== serverId);

    // Remove credentials in parallel
    await Promise.all([
      ResilientStorage.deleteItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, serverId)),
      ResilientStorage.deleteItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, serverId)),
    ]);

    // Update server list
    const listOk = await ResilientStorage.setItemAsync(
      STORAGE_KEYS.SERVERS,
      JSON.stringify(filtered)
    );
    if (!listOk) {
      console.error('[Storage] Failed to update server list after removal');
      return false;
    }

    // Update active server if needed
    const activeId = await this.getActiveServerId();
    if (activeId === serverId) {
      if (filtered.length > 0) {
        const setOk = await ResilientStorage.setItemAsync(
          STORAGE_KEYS.ACTIVE_SERVER,
          filtered[0]!.id
        );
        if (!setOk) console.warn('[Storage] Failed to update active server after removal');
      } else {
        await ResilientStorage.deleteItemAsync(STORAGE_KEYS.ACTIVE_SERVER);
      }
    }

    return true;
  },

  async getServer(serverId: string): Promise<ServerInfo | null> {
    const servers = await this.getServers();
    return servers.find((s) => s.id === serverId) ?? null;
  },

  async updateServer(serverId: string, updates: Partial<Omit<ServerInfo, 'id'>>): Promise<boolean> {
    const servers = await this.getServers();
    const index = servers.findIndex((s) => s.id === serverId);
    if (index >= 0) {
      servers[index] = { ...servers[index]!, ...updates };
      return await ResilientStorage.setItemAsync(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
    }
    return false;
  },

  async getActiveServerId(): Promise<string | null> {
    return ResilientStorage.getItemAsync(STORAGE_KEYS.ACTIVE_SERVER);
  },

  async setActiveServerId(serverId: string): Promise<boolean> {
    return await ResilientStorage.setItemAsync(STORAGE_KEYS.ACTIVE_SERVER, serverId);
  },

  async getActiveServer(): Promise<ServerInfo | null> {
    const activeId = await this.getActiveServerId();
    if (!activeId) return null;
    return this.getServer(activeId);
  },

  async getServerCredentials(serverId: string): Promise<ServerCredentials | null> {
    const [accessToken, refreshToken] = await Promise.all([
      ResilientStorage.getItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, serverId)),
      ResilientStorage.getItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, serverId)),
    ]);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  },

  async updateServerTokens(
    serverId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<boolean> {
    // Sequential writes to prevent race conditions with mismatched token pairs
    const accessOk = await ResilientStorage.setItemAsync(
      getSecureKey(SECURE_KEYS.ACCESS_TOKEN, serverId),
      accessToken
    );
    if (!accessOk) return false;

    const refreshOk = await ResilientStorage.setItemAsync(
      getSecureKey(SECURE_KEYS.REFRESH_TOKEN, serverId),
      refreshToken
    );
    return refreshOk;
  },

  async getAccessToken(): Promise<string | null> {
    const activeId = await this.getActiveServerId();
    if (!activeId) return null;
    return ResilientStorage.getItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, activeId));
  },

  async getRefreshToken(): Promise<string | null> {
    const activeId = await this.getActiveServerId();
    if (!activeId) return null;
    return ResilientStorage.getItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, activeId));
  },

  async getServerUrl(): Promise<string | null> {
    const server = await this.getActiveServer();
    return server?.url ?? null;
  },

  async updateTokens(accessToken: string, refreshToken: string): Promise<boolean> {
    const activeId = await this.getActiveServerId();
    if (!activeId) throw new Error('No active server');
    return this.updateServerTokens(activeId, accessToken, refreshToken);
  },

  async migrateFromLegacy(): Promise<boolean> {
    const [legacyUrl, legacyAccess, legacyRefresh, legacyName] = await Promise.all([
      ResilientStorage.getItemAsync('tracearr_server_url'),
      ResilientStorage.getItemAsync('tracearr_access_token'),
      ResilientStorage.getItemAsync('tracearr_refresh_token'),
      ResilientStorage.getItemAsync('tracearr_server_name'),
    ]);

    if (legacyUrl && legacyAccess && legacyRefresh) {
      const serverId = legacyUrl
        .split('')
        .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
        .toString(36)
        .replace('-', '')
        .slice(0, 16)
        .padEnd(16, '0');

      const serverInfo: ServerInfo = {
        id: serverId,
        url: legacyUrl,
        name: legacyName || 'Tracearr',
        type: 'plex',
        addedAt: new Date().toISOString(),
      };

      const addSuccess = await this.addServer(serverInfo, {
        accessToken: legacyAccess,
        refreshToken: legacyRefresh,
      });

      if (!addSuccess) {
        console.error('[Storage] Migration failed - keeping legacy data');
        return false;
      }

      const setOk = await this.setActiveServerId(serverId);
      if (!setOk) console.warn('[Storage] Migration: failed to set active server');

      // Clean up legacy keys
      await Promise.all([
        ResilientStorage.deleteItemAsync('tracearr_server_url'),
        ResilientStorage.deleteItemAsync('tracearr_access_token'),
        ResilientStorage.deleteItemAsync('tracearr_refresh_token'),
        ResilientStorage.deleteItemAsync('tracearr_server_name'),
      ]);

      return true;
    }

    return false;
  },

  /** @deprecated Use getServers() and getServerCredentials() instead */
  async getCredentials(): Promise<{
    serverUrl: string;
    accessToken: string;
    refreshToken: string;
    serverName: string;
  } | null> {
    const server = await this.getActiveServer();
    if (!server) return null;

    const credentials = await this.getServerCredentials(server.id);
    if (!credentials) return null;

    return {
      serverUrl: server.url,
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
      serverName: server.name,
    };
  },

  /** @deprecated Use addServer() instead */
  async storeCredentials(credentials: {
    serverUrl: string;
    accessToken: string;
    refreshToken: string;
    serverName: string;
  }): Promise<void> {
    const serverId = credentials.serverUrl
      .split('')
      .reduce((acc, char) => ((acc << 5) - acc + char.charCodeAt(0)) | 0, 0)
      .toString(36)
      .replace('-', '')
      .slice(0, 16)
      .padEnd(16, '0');

    const serverInfo: ServerInfo = {
      id: serverId,
      url: credentials.serverUrl,
      name: credentials.serverName,
      type: 'plex',
      addedAt: new Date().toISOString(),
    };

    await this.addServer(serverInfo, {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
    });

    await this.setActiveServerId(serverId);
  },

  /** @deprecated Use removeServer() for specific server */
  async clearCredentials(): Promise<void> {
    const activeId = await this.getActiveServerId();
    if (activeId) {
      await this.removeServer(activeId);
    }
  },

  async isAuthenticated(): Promise<boolean> {
    const servers = await this.getServers();
    return servers.length > 0;
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
