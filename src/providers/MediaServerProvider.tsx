/**
 * Media Server selection provider
 * Fetches the server list from the Tracearr API and owns the persisted
 * ServerScope selection (global, default all servers), migrating two legacy
 * storage formats and validating subsets against the live server list.
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
import {
  serverScopeFromIds,
  serverScopeKey,
  type Server,
  type ServerScope,
} from '@tracearr/shared';
import { api } from '../lib/api';
import { useAuthStateStore } from '../lib/authStateStore';

import { queryKeys } from '@/lib/queryKeys';
const SCOPE_KEY = 'tracearr_server_scope';
const SELECTED_SERVERS_KEY = 'tracearr_selected_media_servers'; // pre-scope format
const LEGACY_SERVER_KEY = 'tracearr_selected_media_server'; // single-server era

interface MediaServerContextValue {
  servers: Server[];
  scope: ServerScope;
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
  const [scope, setScope] = useState<ServerScope>({ mode: 'all' });
  const [initialized, setInitialized] = useState(false);

  // Load saved scope, migrating older formats
  useEffect(() => {
    void (async () => {
      try {
        const stored = await ResilientStorage.getItemAsync(SCOPE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as ServerScope;
          if (parsed.mode === 'all' || (parsed.mode === 'subset' && parsed.serverIds.length > 0)) {
            setScope(parsed.mode === 'subset' ? serverScopeFromIds(parsed.serverIds) : parsed);
            setInitialized(true);
            return;
          }
        }
        // Migrate the pre-scope array format, then the single-server key.
        const legacyArray = await ResilientStorage.getItemAsync(SELECTED_SERVERS_KEY);
        if (legacyArray) {
          const ids = JSON.parse(legacyArray) as string[];
          const migrated = serverScopeFromIds(Array.isArray(ids) ? ids : []);
          setScope(migrated);
          await ResilientStorage.setItemAsync(SCOPE_KEY, JSON.stringify(migrated));
          await ResilientStorage.deleteItemAsync(SELECTED_SERVERS_KEY);
          setInitialized(true);
          return;
        }
        const legacySingle = await ResilientStorage.getItemAsync(LEGACY_SERVER_KEY);
        if (legacySingle) {
          const migrated = serverScopeFromIds([legacySingle]);
          setScope(migrated);
          await ResilientStorage.setItemAsync(SCOPE_KEY, JSON.stringify(migrated));
          await ResilientStorage.deleteItemAsync(LEGACY_SERVER_KEY);
        }
      } catch {
        // Ignore parse errors; fall through to default all
      }
      setInitialized(true);
    })();
  }, []);

  const {
    data: mediaServers = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: queryKeys.mediaServers(tracearrBackendId),
    queryFn: () => api.servers.list(),
    enabled: isAuthenticated && !!tracearrBackendId,
    staleTime: 1000 * 60 * 5,
  });

  const prevKeyRef = useRef<string | null>(null);

  // `scope` is the persisted user intent; the effective scope is derived from
  // it against the live server list: stale subset ids are dropped, an empty
  // result falls back to all, and a subset covering every server collapses to
  // all-mode so the stored form stays canonical (matches toggleServer).
  const effectiveScope = useMemo<ServerScope>(() => {
    if (!isAuthenticated) return { mode: 'all' };
    if (!initialized || isLoading || mediaServers.length === 0) return scope;
    if (scope.mode !== 'subset') return scope;
    const validIds = new Set(mediaServers.map((s) => s.id));
    const validated = scope.serverIds.filter((id) => validIds.has(id));
    if (validated.length === mediaServers.length && validated.length > 0) return { mode: 'all' };
    if (validated.length === scope.serverIds.length) return scope;
    return serverScopeFromIds(validated); // [] -> all
  }, [isAuthenticated, initialized, isLoading, mediaServers, scope]);

  // Clear persisted selection on logout
  useEffect(() => {
    if (!isAuthenticated) {
      prevKeyRef.current = null;
      void ResilientStorage.deleteItemAsync(SCOPE_KEY);
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

  const toggleServer = useCallback(
    (serverId: string) => {
      const current =
        effectiveScope.mode === 'all' ? mediaServers.map((s) => s.id) : effectiveScope.serverIds;
      const next = current.includes(serverId)
        ? current.filter((id) => id !== serverId)
        : [...current, serverId];
      if (next.length === 0) return; // never empty
      if (next.length === mediaServers.length && mediaServers.length > 0) {
        setScope({ mode: 'all' });
        return;
      }
      setScope({ mode: 'subset', serverIds: next });
    },
    [effectiveScope, mediaServers]
  );

  const selectAllServers = useCallback(() => setScope({ mode: 'all' }), []);

  const selectServer = useCallback((serverId: string | null) => {
    setScope(serverId ? { mode: 'subset', serverIds: [serverId] } : { mode: 'all' });
  }, []);

  // Persist and invalidate whenever the effective scope changes (after
  // initialization, and only while authenticated so the logout deletes stick).
  // Skip invalidation on the first transition, which is just the load effect
  // settling the initial scope.
  useEffect(() => {
    if (!initialized || !isAuthenticated) return;
    const key = `${effectiveScope.mode}:${serverScopeKey(effectiveScope)}`;
    if (prevKeyRef.current === key) return;
    const isFirst = prevKeyRef.current === null;
    prevKeyRef.current = key;
    void ResilientStorage.setItemAsync(SCOPE_KEY, JSON.stringify(effectiveScope));
    if (!isFirst) invalidateServerQueries();
  }, [effectiveScope, initialized, isAuthenticated, invalidateServerQueries]);

  const selectedServerIds = useMemo(
    () =>
      effectiveScope.mode === 'all' ? mediaServers.map((s) => s.id) : effectiveScope.serverIds,
    [effectiveScope, mediaServers]
  );

  const selectedServers = useMemo(
    () => mediaServers.filter((s) => selectedServerIds.includes(s.id)),
    [mediaServers, selectedServerIds]
  );

  const isMultiServer = selectedServers.length > 1;
  const isAllServersSelected = effectiveScope.mode === 'all';

  const selectedServerId = selectedServerIds.length === 1 ? (selectedServerIds[0] ?? null) : null;
  const selectedServer = useMemo(() => {
    if (!selectedServerId) return null;
    return mediaServers.find((s) => s.id === selectedServerId) ?? null;
  }, [mediaServers, selectedServerId]);

  const value = useMemo<MediaServerContextValue>(
    () => ({
      servers: mediaServers,
      scope: effectiveScope,
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
      effectiveScope,
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
