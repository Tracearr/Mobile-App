/**
 * Hook for fetching server resource statistics (CPU/RAM)
 * Polls on Plex's sample interval when enabled, stops when app is backgrounded
 */
import { useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  SERVER_STATS_CONFIG,
  type ServerResourceDataPoint,
  type ServerResourceStats,
} from '@tracearr/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

/**
 * Hook for fetching server resource statistics with fixed 2-minute window.
 * Polls on Plex's sample interval; see SERVER_STATS_CONFIG for why the
 * cadence is fixed rather than configurable.
 *
 * @param serverId - Server ID to fetch stats for
 * @param enabled - Additional enable condition (e.g., server exists)
 */
export function useServerStatistics(serverId: string | undefined, enabled: boolean = true) {
  const shouldPoll = enabled && !!serverId;

  // Accumulate data points across polls, keyed by timestamp for deduplication
  const dataMapRef = useRef<Map<number, ServerResourceDataPoint>>(new Map());

  // Bounded by time, not count - MAX_POINTS is only a memory ceiling
  const mergeData = useCallback((newData: ServerResourceDataPoint[]) => {
    const map = dataMapRef.current;

    // Add/update data points
    for (const point of newData) {
      map.set(point.at, point);
    }

    const byNewest = Array.from(map.values()).sort((a, b) => b.at - a.at);
    const newest = byNewest[0]?.at ?? 0;
    const sorted = byNewest
      .filter(
        (p) =>
          newest - p.at <=
          SERVER_STATS_CONFIG.WINDOW_SECONDS + SERVER_STATS_CONFIG.NOW_DELAY_SECONDS
      )
      .slice(0, SERVER_STATS_CONFIG.MAX_POINTS);

    // Rebuild map with only kept points
    dataMapRef.current = new Map(sorted.map((p) => [p.at, p]));

    // Return in ascending order (oldest first) for chart rendering
    return sorted.reverse();
  }, []);

  const query = useQuery<ServerResourceStats>({
    queryKey: queryKeys.servers.statistics(serverId),
    queryFn: async (): Promise<ServerResourceStats> => {
      if (!serverId) throw new Error('Server ID required');
      const response = await api.servers.statistics(serverId);
      // Merge with accumulated data
      const mergedData = mergeData(response.data);
      return {
        ...response,
        data: mergedData,
      };
    },
    enabled: shouldPoll,
    // Matches Plex's sample interval; polling faster re-reads the same data
    refetchInterval: SERVER_STATS_CONFIG.POLL_INTERVAL_SECONDS * 1000,
    // Don't poll when app is backgrounded
    refetchIntervalInBackground: false,
    // Keep previous data while fetching new
    placeholderData: (prev) => prev,
    // Data is fresh until next poll
    staleTime: SERVER_STATS_CONFIG.POLL_INTERVAL_SECONDS * 1000 - 500,
  });

  // Calculate averages from windowed data
  const dataPoints = query.data?.data;
  const dataLength = dataPoints?.length ?? 0;
  // Host values are nullable in the shared type (non-Linux plugin hosts);
  // this endpoint is Plex-only so they are numbers in practice
  const averages =
    dataPoints && dataLength > 0
      ? {
          hostCpu: Math.round(
            dataPoints.reduce((sum: number, p) => sum + (p.hostCpuUtilization ?? 0), 0) / dataLength
          ),
          processCpu: Math.round(
            dataPoints.reduce((sum: number, p) => sum + p.processCpuUtilization, 0) / dataLength
          ),
          hostMemory: Math.round(
            dataPoints.reduce((sum: number, p) => sum + (p.hostMemoryUtilization ?? 0), 0) /
              dataLength
          ),
          processMemory: Math.round(
            dataPoints.reduce((sum: number, p) => sum + p.processMemoryUtilization, 0) / dataLength
          ),
        }
      : null;

  // Get latest values (most recent data point)
  const lastDataPoint = query.data?.data?.[query.data.data.length - 1];
  const latest = lastDataPoint
    ? {
        hostCpu: Math.round(lastDataPoint.hostCpuUtilization ?? 0),
        processCpu: Math.round(lastDataPoint.processCpuUtilization),
        hostMemory: Math.round(lastDataPoint.hostMemoryUtilization ?? 0),
        processMemory: Math.round(lastDataPoint.processMemoryUtilization),
      }
    : null;

  return {
    ...query,
    averages,
    latest,
    isPolling: shouldPoll,
    // Provide more specific loading state:
    // - isLoading: true only on initial fetch with no cached data
    // - isFetching: true during any fetch (initial or refetch)
    // We want to show loading UI while waiting for first data
    isLoadingData: query.isLoading || (query.isFetching && !query.data),
  };
}
