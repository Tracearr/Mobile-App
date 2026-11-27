import {
  liveStatsRetentionSeconds,
  SERVER_STATS_CONFIG,
  type ServerBandwidthDataPoint,
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
// window. Past the gap web breaks its line at (liveStatsGapSeconds), the newest
// point is history.
export function latestLivePoint(
  statistics: ServerResourceDataPoint[],
  nowSeconds: number,
  gapSeconds: number
): ServerResourceDataPoint | null {
  const last = statistics[statistics.length - 1];
  if (!last || nowSeconds - last.at > gapSeconds) return null;
  return last;
}

const BANDWIDTH_RATE_SECONDS = 30;

/**
 * Bits per second over the last 30 s, ending where web's charts hold their right edge so
 * seconds Plex has not reported yet are not counted as idle. Rows are sparse: an absent
 * second moved nothing. Per-row rate as web computes it (bytes / timespan).
 */
export function recentBandwidth(
  points: ServerBandwidthDataPoint[],
  nowSeconds: number
): { local: number; remote: number } {
  const end = nowSeconds - SERVER_STATS_CONFIG.NOW_DELAY_SECONDS;
  const start = end - BANDWIDTH_RATE_SECONDS;
  let local = 0;
  let remote = 0;
  for (const p of points) {
    if (p.at <= start || p.at > end) continue;
    local += p.lanBytes / p.timespan;
    remote += p.wanBytes / p.timespan;
  }
  return {
    local: Math.round((local * 8) / BANDWIDTH_RATE_SECONDS),
    remote: Math.round((remote * 8) / BANDWIDTH_RATE_SECONDS),
  };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * SVG path for a percentage over the live window, oldest first. Fixed 0-100 scale so an idle
 * server reads flat; the line restarts past gapSeconds, liveStatsGapSeconds(type) as on web.
 */
export function sparklinePath(
  points: { at: number; value: number }[],
  nowSeconds: number,
  width: number,
  height: number,
  gapSeconds: number
): string {
  const windowSeconds = SERVER_STATS_CONFIG.WINDOW_SECONDS;
  const start = nowSeconds - windowSeconds;
  let path = '';
  let prevAt: number | null = null;
  for (const { at, value } of points) {
    const x = round1(((at - start) / windowSeconds) * width);
    const y = round1(height - (Math.min(100, Math.max(0, value)) / 100) * height);
    const move = prevAt === null || at - prevAt > gapSeconds;
    path += `${move ? 'M' : 'L'}${x},${y}`;
    prevAt = at;
  }
  return path;
}

// Plex's units, as web's bandwidth chart shows them
export function formatBitsPerSecond(bps: number): string {
  if (bps <= 0) return '0 bps';
  const units = ['bps', 'Kbps', 'Mbps', 'Gbps'];
  const i = Math.min(Math.floor(Math.log10(bps) / 3), units.length - 1);
  const value = bps / 1000 ** i;
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[i]}`;
}
