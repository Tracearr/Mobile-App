/**
 * React Query provider for data fetching
 */
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import React, { useEffect, useRef } from 'react';
import type { AppStateStatus } from 'react-native';
import { AppState, Platform } from 'react-native';

/**
 * Check if an error is an authentication error (401 or session expired)
 */
function isAuthError(error: unknown): boolean {
  // Check for Axios 401 response
  if (error instanceof AxiosError && error.response?.status === 401) {
    return true;
  }
  // Check for session expired message (from auth interceptor)
  if (error instanceof Error && error.message === 'Session expired') {
    return true;
  }
  return false;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: (failureCount, error) => {
        // Don't retry on auth errors - the API interceptor handles these
        if (isAuthError(error)) {
          return false;
        }
        return failureCount < 2;
      },
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: (failureCount, error) => {
        // Don't retry auth errors
        if (isAuthError(error)) {
          return false;
        }
        return failureCount < 1;
      },
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const previousAppState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (Platform.OS !== 'web') {
        focusManager.setFocused(status === 'active');
      }

      const wasActive = previousAppState.current === 'active';
      const isActive = status === 'active';
      previousAppState.current = status;

      if (wasActive && !isActive) {
        // iOS can suspend the app mid-request without ever settling the fetch
        // promise. Cancel in-flight queries now so they return to idle instead
        // of hanging in 'fetching' forever - cancel() resolves the query's own
        // promise even when the underlying network call never comes back.
        void queryClient.cancelQueries({ fetchStatus: 'fetching' });
      } else if (!wasActive && isActive) {
        // Recover anything still stuck from a fetch that started in a brief
        // inactive window, then force every active query to refetch.
        // A plain focus refetch dedupes into the existing (possibly dead)
        // promise via cancelRefetch: false, so it can't recover a stuck fetch.
        void queryClient.cancelQueries({ fetchStatus: 'fetching' }).then(() => {
          void queryClient.invalidateQueries({ refetchType: 'active' });
        });
      }
    });
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export { queryClient };
