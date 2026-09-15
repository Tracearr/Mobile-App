import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ASK_INTERVAL_MS,
  MIN_ACTIVE_DAYS,
  TROUBLE_FREE_MS,
  canAskForReview,
  recordActiveDay,
} from './reviewEligibility.ts';

const now = new Date(2026, 8, 15, 12).getTime();
const engaged = {
  activeDays: MIN_ACTIVE_DAYS,
  lastActiveDay: null,
  lastTroubleAt: null,
  lastAskedAt: null,
};

test('asks a paired user with enough active days and no history of trouble', () => {
  assert.equal(canAskForReview(engaged, true, now), true);
});

test('never asks without a connected server', () => {
  assert.equal(canAskForReview(engaged, false, now), false);
});

test('waits for enough active days', () => {
  assert.equal(canAskForReview({ ...engaged, activeDays: MIN_ACTIVE_DAYS - 1 }, true, now), false);
});

test('holds off after recent trouble and resumes once the window passes', () => {
  assert.equal(canAskForReview({ ...engaged, lastTroubleAt: now - 1000 }, true, now), false);
  assert.equal(
    canAskForReview({ ...engaged, lastTroubleAt: now - TROUBLE_FREE_MS }, true, now),
    true
  );
});

test('spaces asks apart', () => {
  assert.equal(
    canAskForReview({ ...engaged, lastAskedAt: now - ASK_INTERVAL_MS + 1000 }, true, now),
    false
  );
  assert.equal(
    canAskForReview({ ...engaged, lastAskedAt: now - ASK_INTERVAL_MS }, true, now),
    true
  );
});

test('counts each calendar day once', () => {
  const first = recordActiveDay({ ...engaged, activeDays: 0 }, now);
  assert.equal(first.activeDays, 1);
  assert.equal(recordActiveDay(first, now + 60 * 60 * 1000), first);
  assert.equal(recordActiveDay(first, now + 24 * 60 * 60 * 1000).activeDays, 2);
});
