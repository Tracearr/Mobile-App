/**
 * Storage utilities for mobile app
 * Simplified for single-server model
 */
import * as ResilientStorage from './resilientStorage';
import type { StateStorage } from 'zustand/middleware';

// A keychain or keystore that could not be read holds state this process never
// saw. Treating that as an empty store signs the device out and, once the empty
// state is written back, makes the loss permanent, so writes stop until the next
// launch reads it successfully.
let persistedStateUnread = false;

export function isPersistedStateUnread(): boolean {
  return persistedStateUnread;
}

/**
 * Zustand persist storage adapter
 * Uses resilient storage (SecureStore with AsyncStorage fallback)
 */
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      return await ResilientStorage.readItemAsync(name);
    } catch (error) {
      persistedStateUnread = true;
      throw error;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (persistedStateUnread) return;
    await ResilientStorage.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await ResilientStorage.deleteItemAsync(name);
  },
};
