import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNT_TICKS, countDomain, hasCounts } from './countAxis.ts';

test('a small maximum is floored so every tick is a whole number', () => {
  assert.deepEqual(countDomain([0, 1, 0]), [0, COUNT_TICKS]);
  assert.deepEqual(countDomain([]), [0, COUNT_TICKS]);
});

test('a large maximum is kept and the axis starts at zero', () => {
  assert.deepEqual(countDomain([12, 40, 7]), [0, 40]);
});

test('zero-filled buckets count as empty', () => {
  assert.equal(hasCounts([0, 0, 0, 0, 0, 0, 0]), false);
  assert.equal(hasCounts([]), false);
  assert.equal(hasCounts([0, 2, 0]), true);
});
