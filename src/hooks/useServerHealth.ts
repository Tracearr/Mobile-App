/**
 * Media servers the Tracearr backend currently cannot reach.
 * GET /servers/health seeds the list; SocketProvider applies server:down and
 * server:up to the same cache entry and refetches it on every reconnect.
 */
import { useQuery } from '@tanstack/react-query';
import { api, type UnhealthyServer } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useAuthStateStore } from '@/lib/authStateStore';

const NONE: UnhealthyServer[] = [];

export function useServerHealth() {
  const backendId = useAuthStateStore((s) => s.server?.id ?? null);
  const { data } = useQuery({
    queryKey: queryKeys.servers.health(backendId),
    queryFn: ({ signal }) => api.servers.health(signal),
    enabled: backendId !== null,
    staleTime: 1000 * 60,
  });
  const unhealthyServers = data ?? NONE;
  return { unhealthyServers, hasUnhealthyServers: unhealthyServers.length > 0 };
}
