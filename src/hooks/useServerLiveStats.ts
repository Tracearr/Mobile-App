/**
 * Live CPU/RAM per server, one query per server against /live-stats. Tracearr
 * serves Plex from Plex's statistics API, tofa from its metrics endpoint, and
 * Jellyfin/Emby from the buffer its SSE plugin fills, which is empty until the
 * plugin reports and drains when it goes quiet. Polls stop while the app is backgrounded
 * or, with `subscribed` false, while the screen showing them is not focused.
 */
import { useRef } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import {
  SERVER_PROFILES,
  SERVER_STATS_CONFIG,
  liveStatsGapSeconds,
  type ServerBandwidthDataPoint,
  type ServerResourceDataPoint,
  type ServerType,
} from '@tracearr/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import {
  latestLivePoint,
  mergeWindow,
  recentBandwidth,
  serverNowSeconds,
  type LiveStatsWindow,
} from '@/lib/liveStatsWindow';

// Servers with no live-stats source back off to this instead of chart speed;
// data appearing restores the chart cadence.
const EMPTY_STATS_BACKOFF_MS = 30_000;
const POLL_MS = SERVER_STATS_CONFIG.POLL_INTERVAL_SECONDS * 1000;

interface LiveStatsData {
  statistics: ServerResourceDataPoint[];
  bandwidth: ServerBandwidthDataPoint[];
  serverNow: number;
  // Sticks once the source has sent a sample, for as long as the query stays cached
  reported: boolean;
}

function liveStatsInterval(query: { state: { data?: LiveStatsData } }) {
  const empty = !query.state.data || query.state.data.statistics.length === 0;
  return empty ? EMPTY_STATS_BACKOFF_MS : POLL_MS;
}

// Unrounded percentages (0-100). An idle media server sits well under 1%, so
// the display decides the precision.
export interface ServerLiveStatsLatest {
  hostCpu: number | null;
  processCpu: number | null;
  hostMemory: number | null;
  processMemory: number;
}

export interface ServerLiveStatsResult {
  serverId: string;
  statistics: ServerResourceDataPoint[];
  serverNow: number;
  // Seconds between samples past which the source counts as quiet and charts break the line
  gapSeconds: number;
  // The source has sent a sample since this query was cached, though it may be quiet now
  reported: boolean;
  // Bits per second; null for server types that report no bandwidth
  bandwidth: { local: number; remote: number } | null;
  // Null with statistics present means the source went quiet: the newest sample
  // is older than liveStatsGapSeconds(type) on the server's clock.
  latest: ServerLiveStatsLatest | null;
  isLoading: boolean;
  error: Error | null;
}

export function useServerLiveStats(
  servers: { id: string; type: ServerType }[],
  subscribed = true
): ServerLiveStatsResult[] {
  const queryClient = useQueryClient();
  const windowsRef = useRef(new Map<string, LiveStatsWindow>());
  const selected = new Set(servers.map((s) => s.id));

  const results = useQueries({
    queries: servers.map(({ id: serverId }) => ({
      queryKey: queryKeys.servers.liveStats(serverId),
      queryFn: async ({ signal }: { signal: AbortSignal }): Promise<LiveStatsData> => {
        const response = await api.servers.liveStats(serverId, signal);
        const windows = windowsRef.current;
        // A deselected server's window is dropped so re-adding it later starts clean
        for (const key of Array.from(windows.keys())) {
          if (!selected.has(key)) windows.delete(key);
        }
        let window = windows.get(serverId);
        if (!window) {
          window = new Map();
          windows.set(serverId, window);
        }
        const serverNow = serverNowSeconds(response.fetchedAt);
        const statistics = mergeWindow(window, response.statistics, serverNow);
        const previous = queryClient.getQueryData<LiveStatsData>(
          queryKeys.servers.liveStats(serverId)
        );
        return {
          statistics,
          bandwidth: response.bandwidth,
          serverNow,
          reported: statistics.length > 0 || previous?.reported === true,
        };
      },
      refetchInterval: liveStatsInterval,
      refetchIntervalInBackground: false,
      staleTime: POLL_MS - 500,
    })),
    subscribed,
  });

  return servers.map(({ id: serverId, type }, index) => {
    const query = results[index];
    const statistics = query?.data?.statistics ?? [];
    const serverNow = query?.data?.serverNow ?? 0;
    const gapSeconds = liveStatsGapSeconds(type);
    const last = latestLivePoint(statistics, serverNow, gapSeconds);
    return {
      serverId,
      statistics,
      serverNow,
      gapSeconds,
      reported: query?.data?.reported ?? false,
      bandwidth:
        SERVER_PROFILES[type].reportsBandwidth && query?.data
          ? recentBandwidth(query.data.bandwidth, serverNow)
          : null,
      latest: last
        ? {
            hostCpu: last.hostCpuUtilization,
            processCpu: last.processCpuUtilization,
            hostMemory: last.hostMemoryUtilization,
            processMemory: last.processMemoryUtilization,
          }
        : null,
      isLoading: query?.isLoading ?? false,
      error: query?.error ?? null,
    };
  });
}
