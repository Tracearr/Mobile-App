/**
 * Authentication state store using Zustand
 */
import { create } from 'zustand';
import { storage } from './storage';
import { api, resetApiClient } from './api';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { isEncryptionAvailable, getDeviceSecret } from './crypto';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  serverUrl: string | null;
  serverName: string | null;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  pair: (serverUrl: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  serverUrl: null,
  serverName: null,
  error: null,

  /**
   * Initialize auth state from stored credentials
   */
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });
      const credentials = await storage.getCredentials();

      if (credentials) {
        set({
          isAuthenticated: true,
          serverUrl: credentials.serverUrl,
          serverName: credentials.serverName,
          isLoading: false,
        });
      } else {
        set({
          isAuthenticated: false,
          serverUrl: null,
          serverName: null,
          isLoading: false,
        });
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: 'Failed to initialize authentication',
      });
    }
  },

  /**
   * Pair with server using mobile token
   */
  pair: async (serverUrl: string, token: string) => {
    try {
      set({ isLoading: true, error: null });

      // Get device info
      const deviceName = Device.deviceName || `${Device.brand || 'Unknown'} ${Device.modelName || 'Device'}`;
      const deviceId = Device.osBuildId || `${Platform.OS}-${Date.now()}`;
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      // Normalize URL (remove trailing slash)
      const normalizedUrl = serverUrl.replace(/\/$/, '');

      // Get device secret for push notification encryption (if available)
      let deviceSecret: string | undefined;
      if (isEncryptionAvailable()) {
        try {
          deviceSecret = await getDeviceSecret();
        } catch (error) {
          console.warn('Failed to get device secret for encryption:', error);
        }
      }

      // Call pair API
      const response = await api.pair(normalizedUrl, token, deviceName, deviceId, platform, deviceSecret);

      // Store credentials
      await storage.storeCredentials({
        serverUrl: normalizedUrl,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        serverName: response.server.name,
      });

      // Reset API client to use new server
      resetApiClient();

      set({
        isAuthenticated: true,
        serverUrl: normalizedUrl,
        serverName: response.server.name,
        isLoading: false,
      });
    } catch (error) {
      console.error('Pairing failed:', error);
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Pairing failed. Check URL and token.',
      });
      throw error;
    }
  },

  /**
   * Logout and clear credentials
   */
  logout: async () => {
    try {
      set({ isLoading: true });
      await storage.clearCredentials();
      resetApiClient();
      set({
        isAuthenticated: false,
        serverUrl: null,
        serverName: null,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Logout failed:', error);
      set({
        isLoading: false,
        error: 'Failed to logout',
      });
    }
  },

  /**
   * Clear error message
   */
  clearError: () => {
    set({ error: null });
  },
}));
