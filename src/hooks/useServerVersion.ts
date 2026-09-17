/**
 * The paired server's version, for gating screens that only exist on 2.2+.
 * `supports` is false until the version is known, so gated UI never flashes in.
 * A server run from source reports 0.0.0, so every gate stays closed against it.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { atLeast } from '@/lib/serverVersion';
import { useAuthStateStore } from '@/lib/authStateStore';

export { SERVER_2_2 } from '@/lib/serverVersion';

/** First Tracearr tag with /requests/status and /users/:id/requests. */
export const SERVER_2_3 = '2.3.0-beta.5';

export function useServerVersion() {
  const serverId = useAuthStateStore((s) => s.server?.id ?? null);
  const { data, isError, refetch } = useQuery({
    queryKey: queryKeys.version(serverId),
    queryFn: ({ signal }) => api.version.get(signal),
    enabled: serverId !== null,
    staleTime: 5 * 60 * 1000,
  });
  const version = data?.current.version ?? null;
  const latest = data?.latest ?? null;
  return {
    version,
    supports: (min: string) => atLeast(version, min),
    updateAvailable: data?.updateAvailable ?? false,
    latestVersion: latest?.version ?? null,
    releaseUrl: latest?.releaseUrl ?? null,
    // Servers before 2.3 send `latest` without upgradeWarnings.
    upgradeWarnings: latest?.upgradeWarnings ?? [],
    isError,
    refetch,
  };
}
