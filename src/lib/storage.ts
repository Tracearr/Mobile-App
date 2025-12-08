/**
 * Secure storage utilities for mobile app credentials
 * Supports multiple server connections with independent credentials
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for secure storage (per-server, uses serverId suffix)
const SECURE_KEYS = {
  ACCESS_TOKEN: 'tracearr_access_token',
  REFRESH_TOKEN: 'tracearr_refresh_token',
} as const;

// Keys for async storage (JSON-serializable data)
const ASYNC_KEYS = {
  SERVERS: 'tracearr_servers',
  ACTIVE_SERVER: 'tracearr_active_server',
} as const;

/**
 * Server connection info stored in AsyncStorage
 */
export interface ServerInfo {
  id: string; // Unique identifier (from pairing response or generated)
  url: string;
  name: string;
  type: 'plex' | 'jellyfin' | 'emby';
  addedAt: string; // ISO date string
}

/**
 * Credentials for a specific server (tokens stored in SecureStore)
 */
export interface ServerCredentials {
  accessToken: string;
  refreshToken: string;
}

/**
 * Full server data including credentials
 */
export interface StoredServer extends ServerInfo {
  credentials: ServerCredentials;
}

// Helper to get per-server secure key
function getSecureKey(baseKey: string, serverId: string): string {
  return `${baseKey}_${serverId}`;
}

export const storage = {
  // ============================================================================
  // Server List Management
  // ============================================================================

  /**
   * Get all connected servers
   */
  async getServers(): Promise<ServerInfo[]> {
    const data = await AsyncStorage.getItem(ASYNC_KEYS.SERVERS);
    if (!data) return [];
    try {
      return JSON.parse(data) as ServerInfo[];
    } catch {
      return [];
    }
  },

  /**
   * Add a new server to the list
   */
  async addServer(server: ServerInfo, credentials: ServerCredentials): Promise<void> {
    // Store credentials in SecureStore
    await Promise.all([
      SecureStore.setItemAsync(
        getSecureKey(SECURE_KEYS.ACCESS_TOKEN, server.id),
        credentials.accessToken
      ),
      SecureStore.setItemAsync(
        getSecureKey(SECURE_KEYS.REFRESH_TOKEN, server.id),
        credentials.refreshToken
      ),
    ]);

    // Add server to list
    const servers = await this.getServers();
    const existingIndex = servers.findIndex((s) => s.id === server.id);
    if (existingIndex >= 0) {
      servers[existingIndex] = server;
    } else {
      servers.push(server);
    }
    await AsyncStorage.setItem(ASYNC_KEYS.SERVERS, JSON.stringify(servers));
  },

  /**
   * Remove a server and its credentials
   */
  async removeServer(serverId: string): Promise<void> {
    // Read active server ID BEFORE making any changes to avoid race conditions
    const activeId = await this.getActiveServerId();
    const servers = await this.getServers();
    const filtered = servers.filter((s) => s.id !== serverId);

    // Remove credentials from SecureStore
    await Promise.all([
      SecureStore.deleteItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, serverId)),
      SecureStore.deleteItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, serverId)),
    ]);

    // Remove from server list
    await AsyncStorage.setItem(ASYNC_KEYS.SERVERS, JSON.stringify(filtered));

    // Update active server if the removed one was active
    if (activeId === serverId) {
      // Select first remaining server or clear
      if (filtered.length > 0) {
        await this.setActiveServerId(filtered[0]!.id);
      } else {
        await AsyncStorage.removeItem(ASYNC_KEYS.ACTIVE_SERVER);
      }
    }
  },

  /**
   * Get a specific server by ID
   */
  async getServer(serverId: string): Promise<ServerInfo | null> {
    const servers = await this.getServers();
    return servers.find((s) => s.id === serverId) ?? null;
  },

  /**
   * Update server info (e.g., name changed)
   */
  async updateServer(serverId: string, updates: Partial<Omit<ServerInfo, 'id'>>): Promise<void> {
    const servers = await this.getServers();
    const index = servers.findIndex((s) => s.id === serverId);
    if (index >= 0) {
      servers[index] = { ...servers[index]!, ...updates };
      await AsyncStorage.setItem(ASYNC_KEYS.SERVERS, JSON.stringify(servers));
    }
  },

  // ============================================================================
  // Active Server Selection
  // ============================================================================

  /**
   * Get the currently active server ID
   */
  async getActiveServerId(): Promise<string | null> {
    return AsyncStorage.getItem(ASYNC_KEYS.ACTIVE_SERVER);
  },

  /**
   * Set the active server
   */
  async setActiveServerId(serverId: string): Promise<void> {
    await AsyncStorage.setItem(ASYNC_KEYS.ACTIVE_SERVER, serverId);
  },

  /**
   * Get the active server info
   */
  async getActiveServer(): Promise<ServerInfo | null> {
    const activeId = await this.getActiveServerId();
    if (!activeId) return null;
    return this.getServer(activeId);
  },

  // ============================================================================
  // Credentials Management (per-server)
  // ============================================================================

  /**
   * Get credentials for a specific server
   */
  async getServerCredentials(serverId: string): Promise<ServerCredentials | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, serverId)),
      SecureStore.getItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, serverId)),
    ]);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return { accessToken, refreshToken };
  },

  /**
   * Update tokens for a specific server (after refresh)
   */
  async updateServerTokens(
    serverId: string,
    accessToken: string,
    refreshToken: string
  ): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, serverId), accessToken),
      SecureStore.setItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, serverId), refreshToken),
    ]);
  },

  /**
   * Get access token for active server
   */
  async getAccessToken(): Promise<string | null> {
    const activeId = await this.getActiveServerId();
    if (!activeId) return null;
    return SecureStore.getItemAsync(getSecureKey(SECURE_KEYS.ACCESS_TOKEN, activeId));
  },

  /**
   * Get refresh token for active server
   */
  async getRefreshToken(): Promise<string | null> {
    const activeId = await this.getActiveServerId();
    if (!activeId) return null;
    return SecureStore.getItemAsync(getSecureKey(SECURE_KEYS.REFRESH_TOKEN, activeId));
  },

  /**
   * Get server URL for active server
   */
  async getServerUrl(): Promise<string | null> {
    const server = await this.getActiveServer();
    return server?.url ?? null;
  },

  /**
   * Update tokens for active server
   */
  async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    const activeId = await this.getActiveServerId();
    if (!activeId) throw new Error('No active server');
    await this.updateServerTokens(activeId, accessToken, refreshToken);
  },

  // ============================================================================
  // Migration & Compatibility
  // ============================================================================

  /**
   * Check if using legacy single-server storage and migrate if needed
   */
  async migrateFromLegacy(): Promise<boolean> {
    // Check for legacy keys
    const legacyUrl = await SecureStore.getItemAsync('tracearr_server_url');
    const legacyAccess = await SecureStore.getItemAsync('tracearr_access_token');
    const legacyRefresh = await SecureStore.getItemAsync('tracearr_refresh_token');
    const legacyName = await SecureStore.getItemAsync('tracearr_server_name');

    if (legacyUrl && legacyAccess && legacyRefresh) {
      // Generate a server ID from the URL
      const serverId = Buffer.from(legacyUrl).toString('base64').slice(0, 16);

      const serverInfo: ServerInfo = {
        id: serverId,
        url: legacyUrl,
        name: legacyName || 'Tracearr',
        type: 'plex', // Assume plex for legacy, will update on next sync
        addedAt: new Date().toISOString(),
      };

      // Add server with credentials
      await this.addServer(serverInfo, {
        accessToken: legacyAccess,
        refreshToken: legacyRefresh,
      });

      // Set as active
      await this.setActiveServerId(serverId);

      // Clean up legacy keys
      await Promise.all([
        SecureStore.deleteItemAsync('tracearr_server_url'),
        SecureStore.deleteItemAsync('tracearr_access_token'),
        SecureStore.deleteItemAsync('tracearr_refresh_token'),
        SecureStore.deleteItemAsync('tracearr_server_name'),
      ]);

      return true;
    }

    return false;
  },

  // ============================================================================
  // Legacy Compatibility (for existing code during transition)
  // ============================================================================

  /**
   * @deprecated Use getServers() and getServerCredentials() instead
   * Get stored credentials for active server (legacy compatibility)
   */
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

  /**
   * @deprecated Use addServer() instead
   * Store credentials (legacy compatibility - adds/updates single server)
   */
  async storeCredentials(credentials: {
    serverUrl: string;
    accessToken: string;
    refreshToken: string;
    serverName: string;
  }): Promise<void> {
    // Generate ID from URL for consistency
    const serverId = Buffer.from(credentials.serverUrl).toString('base64').slice(0, 16);

    const serverInfo: ServerInfo = {
      id: serverId,
      url: credentials.serverUrl,
      name: credentials.serverName,
      type: 'plex', // Will be updated on server sync
      addedAt: new Date().toISOString(),
    };

    await this.addServer(serverInfo, {
      accessToken: credentials.accessToken,
      refreshToken: credentials.refreshToken,
    });

    await this.setActiveServerId(serverId);
  },

  /**
   * @deprecated Use removeServer() for specific server
   * Clear all credentials (legacy compatibility - removes active server)
   */
  async clearCredentials(): Promise<void> {
    const activeId = await this.getActiveServerId();
    if (activeId) {
      await this.removeServer(activeId);
    }
  },

  /**
   * Check if user is authenticated (has at least one server)
   */
  async isAuthenticated(): Promise<boolean> {
    const servers = await this.getServers();
    return servers.length > 0;
  },
};
