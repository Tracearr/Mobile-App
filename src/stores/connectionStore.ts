/**
 * Connection state store using Zustand
 * Manages connection states: connected, disconnected, unauthenticated
 * Handles auto-retry logic and timer management
 */
import { create } from 'zustand';

type ConnectionState = 'connected' | 'disconnected' | 'unauthenticated';

interface ConnectionStore {
  state: ConnectionState;
  lastError: string | null;
  cachedServerUrl: string | null;
  cachedServerName: string | null;
  retryCount: number;
  retryTimerId: ReturnType<typeof setTimeout> | null;

  setConnected: () => void;
  setDisconnected: (error: string) => void;
  setUnauthenticated: (serverUrl: string, serverName: string | null) => void;
  scheduleRetry: (retryFn: () => Promise<unknown>) => void;
  cancelRetry: () => void;
  reset: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  state: 'connected',
  lastError: null,
  cachedServerUrl: null,
  cachedServerName: null,
  retryCount: 0,
  retryTimerId: null,

  setConnected: () => {
    const { retryTimerId } = get();
    if (retryTimerId) {
      clearTimeout(retryTimerId);
    }
    set({
      state: 'connected',
      lastError: null,
      retryCount: 0,
      retryTimerId: null,
    });
  },

  setDisconnected: (error: string) => {
    set((prev) => ({
      state: 'disconnected',
      lastError: error,
      retryCount: prev.retryCount + 1,
    }));
  },

  setUnauthenticated: (serverUrl: string, serverName: string | null) => {
    const { retryTimerId } = get();
    if (retryTimerId) {
      clearTimeout(retryTimerId);
    }
    set({
      state: 'unauthenticated',
      lastError: null,
      cachedServerUrl: serverUrl,
      cachedServerName: serverName,
      retryCount: 0,
      retryTimerId: null,
    });
  },

  scheduleRetry: (retryFn: () => Promise<unknown>) => {
    const { retryTimerId } = get();
    if (retryTimerId) {
      clearTimeout(retryTimerId);
    }

    const timerId = setTimeout(() => {
      void retryFn();
    }, 30000);

    set({ retryTimerId: timerId });
  },

  cancelRetry: () => {
    const { retryTimerId } = get();
    if (retryTimerId) {
      clearTimeout(retryTimerId);
      set({ retryTimerId: null });
    }
  },

  reset: () => {
    const { retryTimerId } = get();
    if (retryTimerId) {
      clearTimeout(retryTimerId);
    }
    set({
      state: 'connected',
      lastError: null,
      cachedServerUrl: null,
      cachedServerName: null,
      retryCount: 0,
      retryTimerId: null,
    });
  },
}));
