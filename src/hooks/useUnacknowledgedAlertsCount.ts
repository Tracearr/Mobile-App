/**
 * Hook to get the count of unacknowledged alerts/violations
 * Used by header bell icons to show badge counts
 *
 * React Query dedupes calls with the same query key, so multiple
 * components calling this hook results in a single network request.
 */
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { ViolationSeverity } from '@tracearr/shared';
import { useMediaServer } from '@/providers/MediaServerProvider';

export function useUnacknowledgedAlertsCount(severity?: ViolationSeverity) {
  const { scope } = useMediaServer();

  const { data, isSuccess } = useQuery({
    queryKey: queryKeys.violations.unacknowledgedCount(scope, severity),
    queryFn: ({ signal }) => api.violations.unacknowledgedCount({ scope, severity }, signal),
    staleTime: 1000 * 30, // 30 seconds
  });

  const count = data ?? 0;

  return {
    count,
    /** False until the server total has arrived, so a caller can hold back a "0". */
    isLoaded: isSuccess,
    hasAlerts: count > 0,
    /** Formatted for display (e.g., "99+" for large counts) */
    displayCount: count > 99 ? '99+' : String(count),
  };
}
