/**
 * Connection validation hook
 * Validates connection on mount and when app returns to foreground
 * Manages retry scheduling for disconnected state
 */
import { useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useAuthStateStore } from '../lib/authStateStore';
import { api } from '../lib/api';
import type { AxiosError } from 'axios';

type ValidationResult = 'connected' | 'reconnected' | 'disconnected' | 'unauthenticated' | 'error';

export function useConnectionValidator() {
  // Use consolidated auth state store
  const connectionState = useAuthStateStore((s) => s.connectionState);
  const activeServer = useAuthStateStore((s) => s.activeServer);
  const setConnected = useAuthStateStore((s) => s.setConnected);
  const setDisconnected = useAuthStateStore((s) => s.setDisconnected);
  const handleAuthFailure = useAuthStateStore((s) => s.handleAuthFailure);
  const scheduleRetry = useAuthStateStore((s) => s.scheduleRetry);

  const appState = useRef(AppState.currentState);

  const validate = useCallback(async (): Promise<ValidationResult> => {
    if (!activeServer) return 'error';

    // Don't validate if already unauthenticated
    if (connectionState === 'unauthenticated') return 'unauthenticated';

    try {
      // Use a lightweight endpoint to validate connection
      await api.stats.dashboard();

      // If we were disconnected and now succeeded, we're reconnected
      if (connectionState === 'disconnected') {
        setConnected();
        return 'reconnected';
      }

      setConnected();
      return 'connected';
    } catch (error: unknown) {
      const axiosError = error as AxiosError;

      // 401 = token invalid/revoked
      if (axiosError.response?.status === 401) {
        handleAuthFailure(activeServer.url, activeServer.name);
        return 'unauthenticated';
      }

      // Network error = server unreachable
      if (
        axiosError.code === 'ERR_NETWORK' ||
        axiosError.code === 'ECONNABORTED' ||
        !axiosError.response
      ) {
        setDisconnected(
          axiosError.code === 'ECONNABORTED' ? 'Connection timed out' : 'Server unreachable'
        );
        scheduleRetry(validate);
        return 'disconnected';
      }

      // Other errors - treat as connected but with error
      return 'error';
    }
  }, [
    activeServer,
    connectionState,
    setConnected,
    setDisconnected,
    handleAuthFailure,
    scheduleRetry,
  ]);

  // Validate on mount
  useEffect(() => {
    if (activeServer && connectionState !== 'unauthenticated') {
      void validate();
    }
  }, [activeServer, connectionState, validate]);

  // Re-validate when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        const currentConnectionState = useAuthStateStore.getState().connectionState;
        if (activeServer && currentConnectionState !== 'unauthenticated') {
          void validate();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [activeServer, validate]);

  return { validate, connectionState };
}
