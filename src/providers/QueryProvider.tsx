/**
 * React Query provider for data fetching
 */
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';

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
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

export { queryClient };
