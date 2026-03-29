/**
 * React Query provider for data fetching
 */
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import React, { useEffect } from 'react';
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

function onAppStateChange(status: AppStateStatus) {
  if (Platform.OS !== 'web') {
    focusManager.setFocused(status === 'active');
  }
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
  useEffect(() => {
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, []);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export { queryClient };
