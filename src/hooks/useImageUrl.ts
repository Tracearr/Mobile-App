/**
 * Centralized image URL builder
 * Keeps serverUrl access in one place instead of scattered across components
 */
import { useCallback } from 'react';
import { useAuthStateStore } from '../lib/authStateStore';

interface ImageUrlOptions {
  serverId: string;
  path: string | null;
  width: number;
  height: number;
}

/**
 * Returns a function to build image proxy URLs
 * Components call this instead of directly accessing auth state
 */
export function useImageUrl() {
  const serverUrl = useAuthStateStore((s) => s.server?.url ?? null);

  return useCallback(
    ({ serverId, path, width, height }: ImageUrlOptions): string | null => {
      if (!serverUrl || !path) return null;
      return `${serverUrl}/api/v1/images/proxy?server=${serverId}&url=${encodeURIComponent(path)}&width=${width}&height=${height}`;
    },
    [serverUrl]
  );
}

/**
 * Simple hook to get the current server URL
 * Use this when you need the raw URL, not an image URL
 */
export function useServerUrl(): string | null {
  return useAuthStateStore((s) => s.server?.url ?? null);
}
