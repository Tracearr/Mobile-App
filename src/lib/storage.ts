/**
 * Storage utilities for mobile app
 * Simplified for single-server model
 */
import * as ResilientStorage from './resilientStorage';
import type { StateStorage } from 'zustand/middleware';

// A key the keychain or keystore could not read holds state this process never
// saw. Treating that as an empty store signs the device out and, once the empty
// state is written back, makes the loss permanent, so writes to that key stop
// until it reads successfully or its owner replaces it outright.
const unreadKeys = new Set<string>();

export function isPersistedStateUnread(name: string): boolean {
  return unreadKeys.has(name);
}

export function markPersistedStateKnown(name: string): void {
  unreadKeys.delete(name);
}

/**
 * Zustand persist storage adapter
 * Uses resilient storage (SecureStore with AsyncStorage fallback)
 */
export const zustandStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const value = await ResilientStorage.readItemAsync(name);
      unreadKeys.delete(name);
      return value;
    } catch (error) {
      unreadKeys.add(name);
      throw error;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (unreadKeys.has(name)) return;
    await ResilientStorage.setItemAsync(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await ResilientStorage.deleteItemAsync(name);
  },
};
