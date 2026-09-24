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
export const OPERATION_TIMEOUT_MS = 2000;

// Track consecutive failures to determine if storage is persistently unavailable
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

// Track if we've fallen back to AsyncStorage
let usingAsyncStorageFallback = false;
let _fallbackLoadPromise: Promise<void> | null = null;
const FALLBACK_FLAG_KEY = '__secure_fallback_active__';

// iOS: Allow access after first unlock, don't sync to iCloud
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

// Prefix for AsyncStorage keys to avoid conflicts
const ASYNC_STORAGE_PREFIX = '__secure_fallback__';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
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
 * Load persisted fallback state on first access (Android only).
 */
function loadFallbackState(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (!_fallbackLoadPromise) {
    _fallbackLoadPromise = (async () => {
      try {
        const flag = await withTimeout(
          AsyncStorage.getItem(FALLBACK_FLAG_KEY),
          OPERATION_TIMEOUT_MS
        );
        if (flag === '1') {
          // SecureStore was broken last session; a read that settles means it recovered
          try {
            await withTimeout(
              SecureStore.getItemAsync('__health_check__', SECURE_STORE_OPTIONS),
              OPERATION_TIMEOUT_MS
            );
            consecutiveFailures = 0;
            AsyncStorage.removeItem(FALLBACK_FLAG_KEY).catch((error) => {
              console.warn('[Storage] Failed to clear fallback flag:', error);
            });
          } catch {
            usingAsyncStorageFallback = true;
          }
        }
      } catch (error) {
        console.warn('[Storage] Failed to read fallback state flag:', error);
      }
    })();
  }
  return _fallbackLoadPromise;
}

/**
 * Enable AsyncStorage fallback mode (used when SecureStore is unavailable)
 */
function enableAsyncStorageFallback(): void {
  if (!usingAsyncStorageFallback) {
    usingAsyncStorageFallback = true;
    AsyncStorage.setItem(FALLBACK_FLAG_KEY, '1').catch((error) => {
      console.warn('[Storage] Failed to persist fallback flag:', error);
    });
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

/**
 * SecureStore resolves null for an absent key and rejects when it cannot read,
 * so a caller that must not confuse the two (a key it would otherwise recreate)
 * uses this and lets the rejection through.
 */
export async function readItemAsync(key: string): Promise<string | null> {
  await loadFallbackState();

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
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
        continue;
      }
      consecutiveFailures++;

      // On Android, if we've exceeded failure threshold, switch to AsyncStorage
      if (Platform.OS === 'android' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        enableAsyncStorageFallback();
        return getItemAsyncFallback(key);
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }
  return null;
}

export async function getItemAsync(key: string): Promise<string | null> {
  try {
    return await readItemAsync(key);
  } catch (err) {
    console.warn(`[Storage] getItem failed after ${MAX_RETRIES + 1} attempts:`, err);
    return null;
  }
}

export async function setItemAsync(
  key: string,
  value: string,
  options: Partial<SecureStore.SecureStoreOptions> = {}
): Promise<boolean> {
  await loadFallbackState();

  if (usingAsyncStorageFallback) {
    return setItemAsyncFallback(key, value);
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      await withTimeout(
        SecureStore.setItemAsync(key, value, { ...SECURE_STORE_OPTIONS, ...options }),
        OPERATION_TIMEOUT_MS
      );
      consecutiveFailures = 0;
      return true;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        consecutiveFailures++;

        // On Android, if we've exceeded failure threshold, switch to AsyncStorage
        if (Platform.OS === 'android' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          enableAsyncStorageFallback();
          return setItemAsyncFallback(key, value);
        }

        console.warn(`[Storage] setItem failed after ${MAX_RETRIES + 1} attempts:`, err);
        return false;
      }
    }
  }
  return false;
}

export async function deleteItemAsync(key: string): Promise<boolean> {
  await loadFallbackState();

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
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAY_MS);
      } else {
        consecutiveFailures++;

        // On Android, if we've exceeded failure threshold, switch to AsyncStorage
        if (Platform.OS === 'android' && consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          enableAsyncStorageFallback();
          return deleteItemAsyncFallback(key);
        }

        console.warn(`[Storage] deleteItem failed after ${MAX_RETRIES + 1} attempts:`, err);
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
  // Don't reset fallback mode: once enabled, stay on AsyncStorage for session consistency
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
