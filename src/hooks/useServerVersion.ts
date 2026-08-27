/**
 * The paired server's version, for gating screens that only exist on 2.2+.
 * `supports` is false until the version is known, so gated UI never flashes in.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { atLeast } from '@/lib/serverVersion';
import { useAuthStateStore } from '@/lib/authStateStore';

export function useServerVersion() {
  const serverId = useAuthStateStore((s) => s.server?.id ?? null);
  const { data } = useQuery({
    queryKey: queryKeys.version(serverId),
    queryFn: api.version.get,
    enabled: serverId !== null,
    staleTime: 5 * 60 * 1000,
  });
  const version = data?.current.version ?? null;
  return { version, supports: (min: string) => atLeast(version, min) };
}
