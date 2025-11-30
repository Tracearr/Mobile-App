/**
 * Secure storage utilities for mobile app credentials
 */
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  SERVER_URL: 'tracearr_server_url',
  ACCESS_TOKEN: 'tracearr_access_token',
  REFRESH_TOKEN: 'tracearr_refresh_token',
  SERVER_NAME: 'tracearr_server_name',
} as const;

export interface StoredCredentials {
  serverUrl: string;
  accessToken: string;
  refreshToken: string;
  serverName: string;
}

export const storage = {
  /**
   * Store authentication credentials after pairing
   */
  async storeCredentials(credentials: StoredCredentials): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.SERVER_URL, credentials.serverUrl),
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, credentials.accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, credentials.refreshToken),
      SecureStore.setItemAsync(KEYS.SERVER_NAME, credentials.serverName),
    ]);
  },

  /**
   * Get stored credentials
   */
  async getCredentials(): Promise<StoredCredentials | null> {
    const [serverUrl, accessToken, refreshToken, serverName] = await Promise.all([
      SecureStore.getItemAsync(KEYS.SERVER_URL),
      SecureStore.getItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.getItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.getItemAsync(KEYS.SERVER_NAME),
    ]);

    if (!serverUrl || !accessToken || !refreshToken) {
      return null;
    }

    return {
      serverUrl,
      accessToken,
      refreshToken,
      serverName: serverName || 'Tracearr',
    };
  },

  /**
   * Update access and refresh tokens (after refresh)
   */
  async updateTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  /**
   * Get current access token
   */
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  /**
   * Get current refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  /**
   * Get server URL
   */
  async getServerUrl(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.SERVER_URL);
  },

  /**
   * Clear all stored credentials (logout/unpair)
   */
  async clearCredentials(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.SERVER_URL),
      SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN),
      SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN),
      SecureStore.deleteItemAsync(KEYS.SERVER_NAME),
    ]);
  },

  /**
   * Check if user is authenticated (has stored credentials)
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
    return token !== null;
  },
};
