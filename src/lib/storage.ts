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
