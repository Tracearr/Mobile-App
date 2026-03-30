/**
 * Media Server selection provider
 * Fetches available servers from Tracearr API and manages selection
 * Supports multi-server selection for dashboard, single-server for other tabs
 */
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ResilientStorage from '../lib/resilientStorage';
import type { Server } from '@tracearr/shared';
import { api } from '../lib/api';
import { useAuthStateStore } from '../lib/authStateStore';

const SELECTED_SERVERS_KEY = 'tracearr_selected_media_servers';
const LEGACY_SERVER_KEY = 'tracearr_selected_media_server';

interface MediaServerContextValue {
  servers: Server[];
  selectedServer: Server | null;
  selectedServerId: string | null;
  isLoading: boolean;
  selectServer: (serverId: string | null) => void;
  refetch: () => Promise<unknown>;
  selectedServerIds: string[];
  selectedServers: Server[];
  isMultiServer: boolean;
  isAllServersSelected: boolean;
  toggleServer: (serverId: string) => void;
  selectAllServers: () => void;
}

const MediaServerContext = createContext<MediaServerContextValue | null>(null);

export function MediaServerProvider({ children }: { children: ReactNode }) {
  const tracearrServer = useAuthStateStore((s) => s.server);
  const tokenStatus = useAuthStateStore((s) => s.tokenStatus);

  const isAuthenticated = tracearrServer !== null && tokenStatus !== 'revoked';
  const tracearrBackendId = tracearrServer?.id ?? null;
  const queryClient = useQueryClient();
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Load saved selection with legacy migration
  useEffect(() => {
    void (async () => {
      try {
        const stored = await ResilientStorage.getItemAsync(SELECTED_SERVERS_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as string[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSelectedServerIds(parsed);
            setInitialized(true);
            return;
          }
        }
        // Migrate from legacy single-server key
        const legacy = await ResilientStorage.getItemAsync(LEGACY_SERVER_KEY);
        if (legacy) {
          setSelectedServerIds([legacy]);
          await ResilientStorage.setItemAsync(SELECTED_SERVERS_KEY, JSON.stringify([legacy]));
          await ResilientStorage.deleteItemAsync(LEGACY_SERVER_KEY);
        }
      } catch {
        // Ignore parse errors
      }
      setInitialized(true);
    })();
  }, []);

  const {
    data: mediaServers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['media-servers', tracearrBackendId],
    queryFn: () => api.servers.list(),
    enabled: isAuthenticated && !!tracearrBackendId,
    staleTime: 1000 * 60 * 5,
  });

  // Validate selection when servers load
  useEffect(() => {
    if (!initialized || isLoading) return;

    if (mediaServers.length === 0) {
      if (selectedServerIds.length > 0) {
        setSelectedServerIds([]);
        void ResilientStorage.deleteItemAsync(SELECTED_SERVERS_KEY);
      }
      return;
    }

    const validIds = new Set(mediaServers.map((s) => s.id));
    const validated = selectedServerIds.filter((id) => validIds.has(id));
    const next = validated.length > 0 ? validated : mediaServers.map((s) => s.id);

    if (
      next.length !== selectedServerIds.length ||
      next.some((id, i) => id !== selectedServerIds[i])
    ) {
      setSelectedServerIds(next);
      void ResilientStorage.setItemAsync(SELECTED_SERVERS_KEY, JSON.stringify(next));
    }
  }, [mediaServers, selectedServerIds, initialized, isLoading]);

  // Clear on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedServerIds([]);
      void ResilientStorage.deleteItemAsync(SELECTED_SERVERS_KEY);
      void ResilientStorage.deleteItemAsync(LEGACY_SERVER_KEY);
    }
  }, [isAuthenticated]);

  const invalidateServerQueries = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (query) => {
        const key = query.queryKey[0];
        return key !== 'media-servers' && key !== 'servers';
      },
    });
  }, [queryClient]);

  const persistSelection = useCallback((ids: string[]) => {
    if (ids.length > 0) {
      void ResilientStorage.setItemAsync(SELECTED_SERVERS_KEY, JSON.stringify(ids));
    } else {
      void ResilientStorage.deleteItemAsync(SELECTED_SERVERS_KEY);
    }
  }, []);

  const toggleServer = useCallback((serverId: string) => {
    setSelectedServerIds((prev) => {
      const next = prev.includes(serverId)
        ? prev.filter((id) => id !== serverId)
        : [...prev, serverId];
      if (next.length === 0) return prev;
      return next;
    });
  }, []);

  const selectAllServers = useCallback(() => {
    setSelectedServerIds(mediaServers.map((s) => s.id));
  }, [mediaServers]);

  const selectServer = useCallback((serverId: string | null) => {
    setSelectedServerIds(serverId ? [serverId] : []);
  }, []);

  // Persist and invalidate whenever selection changes (after initialization)
  const prevIdsRef = useRef<string[]>([]);
  useEffect(() => {
    if (!initialized) return;
    if (
      prevIdsRef.current.length === selectedServerIds.length &&
      prevIdsRef.current.every((id, i) => id === selectedServerIds[i])
    ) {
      return;
    }
    prevIdsRef.current = selectedServerIds;
    persistSelection(selectedServerIds);
    invalidateServerQueries();
  }, [selectedServerIds, initialized, persistSelection, invalidateServerQueries]);

  const selectedServers = useMemo(
    () => mediaServers.filter((s) => selectedServerIds.includes(s.id)),
    [mediaServers, selectedServerIds]
  );

  // Derive from validated intersection to avoid stale state between server list changes
  const isMultiServer = selectedServers.length > 1;
  const isAllServersSelected =
    mediaServers.length > 0 && selectedServers.length === mediaServers.length;

  const selectedServerId = selectedServerIds[0] ?? null;
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
      selectedServerIds,
      selectedServers,
      isMultiServer,
      isAllServersSelected,
      toggleServer,
      selectAllServers,
    }),
    [
      mediaServers,
      selectedServer,
      selectedServerId,
      isLoading,
      selectServer,
      refetch,
      selectedServerIds,
      selectedServers,
      isMultiServer,
      isAllServersSelected,
      toggleServer,
      selectAllServers,
    ]
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
