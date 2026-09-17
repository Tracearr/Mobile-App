/**
 * Live CPU/RAM per server, one query per server against /live-stats. Tracearr
 * serves Plex from Plex's statistics API and Jellyfin/Emby from the buffer its
 * SSE plugin fills, which is empty until the plugin reports and drains when
 * it goes quiet. Polls stop while the app is backgrounded.
 */
import { useRef } from 'react';
import { useQueries } from '@tanstack/react-query';
import { SERVER_STATS_CONFIG, type ServerResourceDataPoint } from '@tracearr/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import {
  latestLivePoint,
  mergeWindow,
  serverNowSeconds,
  type LiveStatsWindow,
} from '@/lib/liveStatsWindow';

// Servers with no live-stats source back off to this instead of chart speed;
// data appearing restores the chart cadence.
const EMPTY_STATS_BACKOFF_MS = 30_000;
const POLL_MS = SERVER_STATS_CONFIG.POLL_INTERVAL_SECONDS * 1000;

interface LiveStatsData {
  statistics: ServerResourceDataPoint[];
  serverNow: number;
}

function liveStatsInterval(query: { state: { data?: LiveStatsData } }) {
  const empty = !query.state.data || query.state.data.statistics.length === 0;
  return empty ? EMPTY_STATS_BACKOFF_MS : POLL_MS;
}

// Unrounded percentages (0-100). An idle media server sits well under 1%, so
// the display decides the precision.
export interface ServerLiveStatsLatest {
  hostCpu: number | null;
  processCpu: number;
  hostMemory: number | null;
  processMemory: number;
}

export interface ServerLiveStatsResult {
  serverId: string;
  statistics: ServerResourceDataPoint[];
  // Null with statistics present means the source went quiet: the newest sample
  // is older than SERVER_STATS_CONFIG.GAP_BREAK_SECONDS on the server's clock.
  latest: ServerLiveStatsLatest | null;
  isLoading: boolean;
  error: Error | null;
}

export function useServerLiveStats(serverIds: string[]): ServerLiveStatsResult[] {
  const windowsRef = useRef(new Map<string, LiveStatsWindow>());
  const selected = new Set(serverIds);

  const results = useQueries({
    queries: serverIds.map((serverId) => ({
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
        return { statistics: mergeWindow(window, response.statistics, serverNow), serverNow };
      },
      refetchInterval: liveStatsInterval,
      refetchIntervalInBackground: false,
      staleTime: POLL_MS - 500,
    })),
  });

  return serverIds.map((serverId, index) => {
    const query = results[index];
    const statistics = query?.data?.statistics ?? [];
    const last = latestLivePoint(statistics, query?.data?.serverNow ?? 0);
    return {
      serverId,
      statistics,
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
