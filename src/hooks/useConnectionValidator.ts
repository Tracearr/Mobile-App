/**
 * Connection validation hook
 * Validates connection on mount and when app returns to foreground
 * Manages retry scheduling for disconnected state
 */
import { useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useShallow } from 'zustand/react/shallow';
import { ALL_SERVERS } from '@tracearr/shared';
import { useAuthStateStore } from '../lib/authStateStore';
import { api } from '../lib/api';
import { isTracearrError } from '../lib/apiError';
import type { AxiosError } from 'axios';

type ValidationResult =
  'connected' | 'reconnected' | 'disconnected' | 'unauthenticated' | 'clientTooOld' | 'error';

export function useConnectionValidator() {
  // Use single-server auth state store with shallow compare for state values
  const { connectionState, server } = useAuthStateStore(
    useShallow((s) => ({
      connectionState: s.connectionState,
      server: s.server,
    }))
  );
  // Actions are stable references, no need for shallow compare
  const setConnectionState = useAuthStateStore((s) => s.setConnectionState);
  const setError = useAuthStateStore((s) => s.setError);
  const handleAuthFailure = useAuthStateStore((s) => s.handleAuthFailure);

  const appState = useRef(AppState.currentState);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const validateRef = useRef<(() => Promise<ValidationResult>) | null>(null);

  const validate = useCallback(async (): Promise<ValidationResult> => {
    if (!server) return 'error';

    // Don't validate if already unauthenticated or too old: a success would clear that screen
    if (connectionState === 'unauthenticated' || connectionState === 'clientTooOld') {
      return connectionState;
    }

    try {
      // Use a lightweight endpoint to validate connection
      await api.stats.dashboard(ALL_SERVERS);

      // If we were disconnected and now succeeded, we're reconnected
      if (connectionState === 'disconnected') {
        setConnectionState('connected');
        return 'reconnected';
      }

      setConnectionState('connected');
      return 'connected';
    } catch (error: unknown) {
      const axiosError = error as AxiosError;

      // A Tracearr 401 that outlived the interceptor's refresh; a proxy's 401 is not a verdict
      const body: unknown = axiosError.response?.data;
      if (axiosError.response?.status === 401 && isTracearrError(body)) {
        handleAuthFailure(body.code);
        return 'unauthenticated';
      }

      // Network error = server unreachable
      if (
        axiosError.code === 'ERR_NETWORK' ||
        axiosError.code === 'ECONNABORTED' ||
        !axiosError.response
      ) {
        setConnectionState('disconnected');
        setError(
          axiosError.code === 'ECONNABORTED' ? 'Connection timed out' : 'Server unreachable'
        );

        // Schedule retry after 30 seconds
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        retryTimeoutRef.current = setTimeout(() => {
          void validateRef.current?.();
        }, 30000);

        return 'disconnected';
      }

      // Other errors - treat as connected but with error
      return 'error';
    }
  }, [server, connectionState, setConnectionState, setError, handleAuthFailure]);

  useEffect(() => {
    validateRef.current = validate;
  }, [validate]);

  // Clean up retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Validate on mount
  useEffect(() => {
    if (server && connectionState !== 'unauthenticated') {
      void validate();
    }
  }, [server, connectionState, validate]);

  // Re-validate when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (appState.current?.match(/inactive|background/) && nextAppState === 'active') {
        const currentConnectionState = useAuthStateStore.getState().connectionState;
        if (server && currentConnectionState !== 'unauthenticated') {
          void validate();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [server, validate]);

  return { validate, connectionState };
}
