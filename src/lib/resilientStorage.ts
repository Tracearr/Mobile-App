/**
 * Wrapper for expo-secure-store that handles Android Keystore flakiness.
 * Android Keystore can be temporarily unavailable during battery saver or Doze mode.
 */
import * as SecureStore from 'expo-secure-store';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const OPERATION_TIMEOUT_MS = 2000;

// Track consecutive failures to determine if storage is persistently unavailable
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

// iOS: Allow access after first unlock, don't sync to iCloud
const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

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

export async function getItemAsync(key: string): Promise<string | null> {
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
        console.warn(`[Storage] getItem failed after ${MAX_RETRIES + 1} attempts`);
        consecutiveFailures++;
        return null;
      }
    }
  }
  return null;
}

export async function setItemAsync(key: string, value: string): Promise<boolean> {
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
        console.warn(`[Storage] setItem failed after ${MAX_RETRIES + 1} attempts`);
        consecutiveFailures++;
        return false;
      }
    }
  }
  return false;
}

export async function deleteItemAsync(key: string): Promise<boolean> {
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
        console.warn(`[Storage] deleteItem failed after ${MAX_RETRIES + 1} attempts`);
        consecutiveFailures++;
        return false;
      }
    }
  }
  return false;
}

export function isStorageUnavailable(): boolean {
  return consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;
}

export function resetFailureCount(): void {
  consecutiveFailures = 0;
}

/**
 * Check if storage is working. Returns false if storage has failed repeatedly.
 */
export async function checkStorageAvailability(): Promise<boolean> {
  if (isStorageUnavailable()) {
    return false;
  }

  // Try a simple read operation to test storage
  try {
    await getItemAsync('__storage_check__');
    return true;
  } catch {
    return !isStorageUnavailable();
  }
}
