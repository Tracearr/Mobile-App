import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatWatchTime } from './formatters.ts';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

test('watch time keeps minutes under a day and matches web above it', () => {
  assert.equal(formatWatchTime(0), '0m');
  assert.equal(formatWatchTime(null), '0m');
  assert.equal(formatWatchTime(45 * MINUTE), '45m');
  assert.equal(formatWatchTime(5 * HOUR + 30 * MINUTE), '5h 30m');
  assert.equal(formatWatchTime(3 * DAY + 4 * HOUR + 59 * MINUTE), '3d 4h');
  assert.equal(formatWatchTime(377 * DAY + 4 * HOUR), '1yr 12d 4h');
});
