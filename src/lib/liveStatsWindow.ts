import {
  liveStatsRetentionSeconds,
  SERVER_STATS_CONFIG,
  type ServerResourceDataPoint,
} from '@tracearr/shared';

export type LiveStatsWindow = Map<number, ServerResourceDataPoint>;

// Points are stamped on Tracearr's clock, so the window ages against the
// response's fetchedAt rather than the device clock or the newest point.
export function serverNowSeconds(fetchedAt: string): number {
  const parsed = Date.parse(fetchedAt);
  return Math.floor((Number.isFinite(parsed) ? parsed : Date.now()) / 1000);
}

/**
 * Merge a poll into the rolling window and return it oldest first. Bounded by
 * time; MAX_POINTS is only a memory ceiling.
 */
export function mergeWindow(
  window: LiveStatsWindow,
  incoming: ServerResourceDataPoint[],
  nowSeconds: number
): ServerResourceDataPoint[] {
  for (const point of incoming) {
    window.set(point.at, point);
  }

  const cutoff = nowSeconds - liveStatsRetentionSeconds(SERVER_STATS_CONFIG.WINDOW_SECONDS);
  const kept = Array.from(window.values())
    .sort((a, b) => b.at - a.at)
    .filter((p) => p.at >= cutoff)
    .slice(0, SERVER_STATS_CONFIG.MAX_POINTS);

  window.clear();
  for (const point of kept) {
    window.set(point.at, point);
  }

  return kept.reverse();
}

// A source that has gone quiet keeps its last points for the whole retention
// window. Past the gap web breaks its line at, the newest point is history.
export function latestLivePoint(
  statistics: ServerResourceDataPoint[],
  nowSeconds: number
): ServerResourceDataPoint | null {
  const last = statistics[statistics.length - 1];
  if (!last || nowSeconds - last.at > SERVER_STATS_CONFIG.GAP_BREAK_SECONDS) return null;
  return last;
}
