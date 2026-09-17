import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatAxisDate, formatReadoutDate, usesMonthLabels } from './dateLabels.ts';

test('axis labels carry the year once ticks sit a month apart', () => {
  const start = new Date(2025, 8, 17);
  assert.equal(usesMonthLabels(start, new Date(2026, 8, 17)), true);
  assert.equal(usesMonthLabels(start, new Date(2025, 9, 17)), false);
  assert.equal(usesMonthLabels(null, null), false);
  assert.equal(formatAxisDate(start, true, 'en-US'), "Sep '25");
  assert.equal(formatAxisDate(start, false, 'en-US'), 'Sep 17');
});

test('the readout shows the year for daily and weekly buckets and the hour for 6-hour ones', () => {
  const date = new Date(2026, 8, 17, 18);
  assert.equal(formatReadoutDate(date, 'year', 'en-US'), 'Sep 17, 2026');
  assert.equal(formatReadoutDate(date, 'all', 'en-US'), 'Sep 17, 2026');
  assert.match(formatReadoutDate(date, 'week', 'en-US'), /^Sep 17, 6\sPM$/);
});
