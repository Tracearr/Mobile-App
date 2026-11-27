import { test } from 'node:test';
import assert from 'node:assert/strict';
import { liveStatsGapSeconds } from '@tracearr/shared';
import {
  formatBitsPerSecond,
  latestLivePoint,
  mergeWindow,
  recentBandwidth,
  serverNowSeconds,
  sparklinePath,
} from './liveStatsWindow.ts';

const point = (at, cpu = 10) => ({
  at,
  timespan: 6,
  hostCpuUtilization: cpu,
  processCpuUtilization: cpu,
  hostMemoryUtilization: cpu,
  processMemoryUtilization: cpu,
});

const NOW = 1_000_000;

test('merges polls by timestamp, newest value wins, oldest first', () => {
  const window = new Map();
  mergeWindow(window, [point(NOW - 12), point(NOW - 6, 20)], NOW);
  const merged = mergeWindow(window, [point(NOW - 6, 25), point(NOW)], NOW);
  assert.deepEqual(
    merged.map((p) => [p.at, p.processCpuUtilization]),
    [
      [NOW - 12, 10],
      [NOW - 6, 25],
      [NOW, 10],
    ]
  );
});

test('drops points older than retention measured from the server clock', () => {
  const window = new Map();
  mergeWindow(window, [point(NOW - 200), point(NOW - 130), point(NOW)], NOW);
  assert.deepEqual(
    Array.from(window.keys()).sort((a, b) => a - b),
    [NOW - 130, NOW]
  );
});

test('drains to empty when the server keeps returning a stalled buffer', () => {
  const window = new Map();
  mergeWindow(window, [point(NOW - 6), point(NOW)], NOW);
  const later = mergeWindow(window, [point(NOW - 6), point(NOW)], NOW + 300);
  assert.deepEqual(later, []);
  assert.equal(window.size, 0);
});

test('reads the server clock from fetchedAt in whole seconds', () => {
  assert.equal(serverNowSeconds('2026-09-17T00:00:01.900Z'), 1_789_603_201);
});

test('stops reporting a latest point once the newest sample is older than the gap', () => {
  const stats = [point(NOW - 6), point(NOW)];
  assert.equal(latestLivePoint(stats, NOW + 15, 15)?.at, NOW);
  assert.equal(latestLivePoint(stats, NOW + 16, 15), null);
  assert.equal(latestLivePoint([], NOW, 15), null);
});

test('bridges a tofa server across its slower idle sampling', () => {
  const stats = [point(NOW)];
  assert.equal(latestLivePoint(stats, NOW + 30, liveStatsGapSeconds('plex')), null);
  assert.equal(latestLivePoint(stats, NOW + 30, liveStatsGapSeconds('tofa'))?.at, NOW);
});

const bw = (at, lanBytes, wanBytes, timespan = 1) => ({ at, timespan, lanBytes, wanBytes });

test('network rate is the last 30 s before the chart delay, idle seconds counting as zero', () => {
  // Ends at NOW - 6 (NOW_DELAY_SECONDS); rows newer than that or older than 30 s are left out
  const rate = recentBandwidth(
    [bw(NOW - 40, 9e9, 9e9), bw(NOW - 20, 3_000_000, 750_000), bw(NOW - 3, 9e9, 9e9)],
    NOW
  );
  assert.deepEqual(rate, { local: 800_000, remote: 200_000 });
  assert.deepEqual(recentBandwidth([], NOW), { local: 0, remote: 0 });
});

test('sparkline spans the window on a fixed 0-100 scale and breaks across gaps', () => {
  const at = (s) => NOW - 120 + s;
  assert.equal(
    sparklinePath(
      [
        { at: at(108), value: 100 },
        { at: at(114), value: 50 },
        { at: at(120), value: 0 },
      ],
      NOW,
      240,
      20,
      15
    ),
    'M216,0L228,10L240,20'
  );
  // 0 to 60 is a 60 s gap, past GAP_BREAK_SECONDS, so the line restarts
  assert.equal(
    sparklinePath(
      [
        { at: at(0), value: 0 },
        { at: at(60), value: 0 },
        { at: at(66), value: 0 },
      ],
      NOW,
      120,
      20,
      15
    ),
    'M0,20M60,20L66,20'
  );
  // tofa samples every 30 s when idle, and its gap allowance keeps those points joined
  assert.equal(
    sparklinePath(
      [
        { at: at(60), value: 0 },
        { at: at(90), value: 0 },
        { at: at(120), value: 0 },
      ],
      NOW,
      120,
      20,
      35
    ),
    'M60,20L90,20L120,20'
  );
  assert.equal(sparklinePath([], NOW, 120, 20, 15), '');
});

test('bit rates read in Plex units', () => {
  assert.equal(formatBitsPerSecond(0), '0 bps');
  assert.equal(formatBitsPerSecond(950), '950 bps');
  assert.equal(formatBitsPerSecond(6_100_000), '6.1 Mbps');
  assert.equal(formatBitsPerSecond(38_000_000), '38 Mbps');
});
