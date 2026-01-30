/**
 * Media Server selection provider
 * Fetches available servers from Tracearr API and manages selection
 * Similar to web's useServer hook
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import type { Server } from '@tracearr/shared';
import { api } from '../lib/api';
import { useAuthStateStore } from '../lib/authStateStore';

const SELECTED_SERVER_KEY = 'tracearr_selected_media_server';

interface MediaServerContextValue {
  servers: Server[];
  selectedServer: Server | null;
  selectedServerId: string | null;
  isLoading: boolean;
  selectServer: (serverId: string | null) => void;
  refetch: () => Promise<unknown>;
}

const MediaServerContext = createContext<MediaServerContextValue | null>(null);

export function MediaServerProvider({ children }: { children: ReactNode }) {
  // Use single-server auth state store for auth status (not media servers)
  const tracearrServer = useAuthStateStore((s) => s.server);
  const tokenStatus = useAuthStateStore((s) => s.tokenStatus);

  // Derived state - are we authenticated to Tracearr backend?
  const isAuthenticated = tracearrServer !== null && tokenStatus !== 'revoked';
  const tracearrBackendId = tracearrServer?.id ?? null;
  const queryClient = useQueryClient();
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Load saved selection on mount
  useEffect(() => {
    void SecureStore.getItemAsync(SELECTED_SERVER_KEY).then((saved) => {
      if (saved) {
        setSelectedServerId(saved);
      }
      setInitialized(true);
    });
  }, []);

  // Fetch available MEDIA servers (Plex/Jellyfin) from API
  const {
    data: mediaServers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['media-servers', tracearrBackendId],
    queryFn: () => api.servers.list(),
    enabled: isAuthenticated && !!tracearrBackendId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Validate selection when media servers load
  useEffect(() => {
    if (!initialized || isLoading) return;

    if (mediaServers.length === 0) {
      if (selectedServerId) {
        setSelectedServerId(null);
        void SecureStore.deleteItemAsync(SELECTED_SERVER_KEY);
      }
      return;
    }

    // If selection is invalid (server no longer exists), select first
    if (selectedServerId && !mediaServers.some((s) => s.id === selectedServerId)) {
      const firstServer = mediaServers[0];
      if (firstServer) {
        setSelectedServerId(firstServer.id);
        void SecureStore.setItemAsync(SELECTED_SERVER_KEY, firstServer.id);
      }
    }

    // If no selection but servers exist, select first
    if (!selectedServerId && mediaServers.length > 0) {
      const firstServer = mediaServers[0];
      if (firstServer) {
        setSelectedServerId(firstServer.id);
        void SecureStore.setItemAsync(SELECTED_SERVER_KEY, firstServer.id);
      }
    }
  }, [mediaServers, selectedServerId, initialized, isLoading]);

  // Clear selection on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedServerId(null);
      void SecureStore.deleteItemAsync(SELECTED_SERVER_KEY);
    }
  }, [isAuthenticated]);

  const selectServer = useCallback(
    (serverId: string | null) => {
      setSelectedServerId(serverId);
      if (serverId) {
        void SecureStore.setItemAsync(SELECTED_SERVER_KEY, serverId);
      } else {
        void SecureStore.deleteItemAsync(SELECTED_SERVER_KEY);
      }
      // Invalidate all server-dependent queries
      void queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return key !== 'media-servers' && key !== 'servers';
        },
      });
    },
    [queryClient]
  );

  const selectedServer = useMemo(() => {
    if (!selectedServerId) return null;
    return mediaServers.find((s) => s.id === selectedServerId) ?? null;
  }, [mediaServers, selectedServerId]);

  const value = useMemo<MediaServerContextValue>(
    () => ({
      servers: mediaServers,
      selectedServer,
      selectedServerId,
      isLoading,
      selectServer,
      refetch,
    }),
    [mediaServers, selectedServer, selectedServerId, isLoading, selectServer, refetch]
  );

  return <MediaServerContext.Provider value={value}>{children}</MediaServerContext.Provider>;
}

export function useMediaServer(): MediaServerContextValue {
  const context = useContext(MediaServerContext);
  if (!context) {
    throw new Error('useMediaServer must be used within a MediaServerProvider');
  }
  return context;
}

export function useSelectedServerId(): string | null {
  const { selectedServerId } = useMediaServer();
  return selectedServerId;
}
