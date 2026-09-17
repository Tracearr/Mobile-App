import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeWindow, serverNowSeconds } from './liveStatsWindow.ts';

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
