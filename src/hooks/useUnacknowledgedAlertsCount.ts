/**
 * Hook to get the count of unacknowledged alerts/violations
 * Used by header bell icons to show badge counts
 *
 * React Query dedupes calls with the same query key, so multiple
 * components calling this hook results in a single network request.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useMediaServer } from '@/providers/MediaServerProvider';

export function useUnacknowledgedAlertsCount() {
  const { selectedServerId } = useMediaServer();

  const { data } = useQuery({
    queryKey: ['violations', 'unacknowledged-count', selectedServerId],
    queryFn: () =>
      api.violations.list({
        serverId: selectedServerId ?? undefined,
        acknowledged: false,
        pageSize: 1, // We only need the total count
      }),
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!selectedServerId,
  });

  const count = data?.total ?? 0;

  return {
    count,
    hasAlerts: count > 0,
    /** Formatted for display (e.g., "99+" for large counts) */
    displayCount: count > 99 ? '99+' : String(count),
  };
}
