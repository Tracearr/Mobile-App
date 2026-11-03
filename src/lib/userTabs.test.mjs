import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseUserTab, userTabs } from './userTabs.ts';

test('requests tab only appears when configured', () => {
  assert.deepEqual(userTabs(false), ['overview', 'sessions', 'violations']);
  assert.deepEqual(userTabs(true), ['overview', 'sessions', 'requests', 'violations']);
});

test('parseUserTab accepts available tabs and falls back to overview', () => {
  assert.equal(parseUserTab('requests', userTabs(false)), 'overview');
  assert.equal(parseUserTab('violations', userTabs(false)), 'violations');
  assert.equal(parseUserTab(undefined, userTabs(true)), 'overview');
  assert.equal(parseUserTab(['sessions', 'x'], userTabs(true)), 'sessions');
  assert.equal(parseUserTab('terminations', userTabs(true)), 'overview');
});
