import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dateToTime, timeToDate } from './quietHours.ts';

test('a stored time becomes that wall clock time on the device', () => {
  const date = timeToDate('23:05');
  assert.equal(date.getHours(), 23);
  assert.equal(date.getMinutes(), 5);
});

test('a picked time is stored zero padded', () => {
  assert.equal(dateToTime(new Date(2026, 0, 1, 8, 0)), '08:00');
  assert.equal(dateToTime(new Date(2026, 0, 1, 0, 7)), '00:07');
});

test('a time survives the round trip', () => {
  assert.equal(dateToTime(timeToDate('13:45')), '13:45');
});
