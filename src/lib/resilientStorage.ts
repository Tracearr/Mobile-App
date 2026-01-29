/**
 * Wrapper for expo-secure-store that handles Android Keystore flakiness.
 * Android Keystore can be temporarily unavailable during battery saver or Doze mode.
 * Falls back to AsyncStorage on Android when SecureStore repeatedly fails.
 */
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const OPERATION_TIMEOUT_MS = 2000;

// Track consecutive failures to determine if storage is persistently unavailable
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

// Track if we've fallen back to AsyncStorage
let usingAsyncStorageFallback = false;

// iOS: Allow access after first unlock, don't sync to iCloud
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// Prefix for AsyncStorage keys to avoid conflicts
const ASYNC_STORAGE_PREFIX = '__secure_fallback__';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Operation timed out')), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      });
  });
}

/**
 * Enable AsyncStorage fallback mode (used when SecureStore is unavailable)
 */
function enableAsyncStorageFallback(): void {
  if (!usingAsyncStorageFallback) {
    usingAsyncStorageFallback = true;
    console.warn('[Storage] SecureStore unavailable, using AsyncStorage fallback');
  }
}

/**
 * Get item using AsyncStorage fallback
 */
async function getItemAsyncFallback(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(`${ASYNC_STORAGE_PREFIX}${key}`);
  } catch (error) {
    console.warn('[Storage] AsyncStorage getItem failed:', error);
    return null;
  }
}

/**
 * Set item using AsyncStorage fallback
 */
async function setItemAsyncFallback(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(`${ASYNC_STORAGE_PREFIX}${key}`, value);
    return true;
  } catch (error) {
    console.warn('[Storage] AsyncStorage setItem failed:', error);
    return false;
  }
}

/**
 * Delete item using AsyncStorage fallback
 */
async function deleteItemAsyncFallback(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(`${ASYNC_STORAGE_PREFIX}${key}`);
    return true;
  } catch (error) {
    console.warn('[Storage] AsyncStorage deleteItem failed:', error);
    return false;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  // Use fallback if already enabled
  if (usingAsyncStorageFallback) {
    return getItemAsyncFallback(key);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const value = await withTimeout(
        SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS),
        OPERATION_TIMEOUT_MS
      );
      consecutiveFailures = 0;
      return value;
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        consecutiveFailures++;

        // On Android, if we've exceeded failure threshold, switch to AsyncStorage
        if (Platform.OS === 'android' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          enableAsyncStorageFallback();
          return getItemAsyncFallback(key);
        }

        console.warn(`[Storage] getItem failed after ${MAX_RETRIES + 1} attempts`);
        return null;
      }
    }
  }
  return null;
}

export async function setItemAsync(key: string, value: string): Promise<boolean> {
  // Use fallback if already enabled
  if (usingAsyncStorageFallback) {
    return setItemAsyncFallback(key, value);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await withTimeout(
        SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS),
        OPERATION_TIMEOUT_MS
      );
      consecutiveFailures = 0;
      return true;
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        consecutiveFailures++;

        // On Android, if we've exceeded failure threshold, switch to AsyncStorage
        if (Platform.OS === 'android' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          enableAsyncStorageFallback();
          return setItemAsyncFallback(key, value);
        }

        console.warn(`[Storage] setItem failed after ${MAX_RETRIES + 1} attempts`);
        return false;
      }
    }
  }
  return false;
}

export async function deleteItemAsync(key: string): Promise<boolean> {
  // Use fallback if already enabled
  if (usingAsyncStorageFallback) {
    return deleteItemAsyncFallback(key);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await withTimeout(
        SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS),
        OPERATION_TIMEOUT_MS
      );
      consecutiveFailures = 0;
      return true;
    } catch {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        consecutiveFailures++;

        // On Android, if we've exceeded failure threshold, switch to AsyncStorage
        if (Platform.OS === 'android' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          enableAsyncStorageFallback();
          return deleteItemAsyncFallback(key);
        }

        console.warn(`[Storage] deleteItem failed after ${MAX_RETRIES + 1} attempts`);
        return false;
      }
    }
  }
  return false;
}

export function isStorageUnavailable(): boolean {
  // If using fallback, storage is "available" through AsyncStorage
  if (usingAsyncStorageFallback) {
    return false;
  }
  return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
}

export function resetFailureCount(): void {
  consecutiveFailures = 0;
  // Don't reset fallback mode - once enabled, stay on AsyncStorage for consistency
}

/**
 * Check if storage is working. Returns false if storage has failed repeatedly.
 */
export async function checkStorageAvailability(): Promise<boolean> {
  // If using fallback, check AsyncStorage availability
  if (usingAsyncStorageFallback) {
    try {
      await AsyncStorage.getItem('__storage_check__');
      return true;
    } catch {
      return false;
    }
  }

  if (isStorageUnavailable()) {
    // On Android, try to switch to AsyncStorage fallback
    if (Platform.OS === 'android') {
      enableAsyncStorageFallback();
      return true;
    }
    return false;
  }

  // Try a simple read operation to test storage
  try {
    await getItemAsync('__storage_check__');
    return true;
  } catch {
    // On Android, enable fallback if check fails
    if (Platform.OS === 'android') {
      enableAsyncStorageFallback();
      return true;
    }
    return !isStorageUnavailable();
  }
}

/**
 * Check if currently using AsyncStorage fallback
 */
export function isUsingFallback(): boolean {
  return usingAsyncStorageFallback;
}
