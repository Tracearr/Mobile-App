/**
 * Connection validation hook
 * Validates connection on mount and when app returns to foreground
 * Manages retry scheduling for disconnected state
 */
import { useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useConnectionStore } from '../stores/connectionStore';
import { useAuthStore } from '../lib/authStore';
import { api } from '../lib/api';
import type { AxiosError } from 'axios';

type ValidationResult = 'connected' | 'reconnected' | 'disconnected' | 'unauthenticated' | 'error';

export function useConnectionValidator() {
  const { state, setConnected, setDisconnected, setUnauthenticated, scheduleRetry } =
    useConnectionStore();
  const { activeServer, serverUrl, serverName } = useAuthStore();
  const appState = useRef(AppState.currentState);

  const validate = useCallback(async (): Promise<ValidationResult> => {
    if (!activeServer) return 'error';

    try {
      // Use a lightweight endpoint to validate connection
      await api.stats.dashboard();

      // If we were disconnected and now succeeded, we're reconnected
      if (state === 'disconnected') {
        setConnected();
        return 'reconnected';
      }

      setConnected();
      return 'connected';
    } catch (error: unknown) {
      const axiosError = error as AxiosError;

      // 401 = token invalid/revoked
      if (axiosError.response?.status === 401) {
        setUnauthenticated(serverUrl ?? '', serverName);
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
    serverUrl,
    serverName,
    state,
    setConnected,
    setDisconnected,
    setUnauthenticated,
    scheduleRetry,
  ]);

  // Validate on mount
  useEffect(() => {
    if (activeServer) {
      void validate();
    }
  }, [activeServer, validate]);

  // Re-validate when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        if (activeServer) {
          void validate();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [activeServer, validate]);

  return { validate, state };
}
