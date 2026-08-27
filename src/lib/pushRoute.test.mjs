import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pushDestination } from './pushRoute.ts';

test('a violation with an id opens that violation', () => {
  assert.deepEqual(pushDestination({ type: 'violation_detected', violationId: 'v1' }), {
    screen: 'violation',
    id: 'v1',
  });
});

test('a violation without an id opens alerts', () => {
  assert.deepEqual(pushDestination({ type: 'violation_detected' }), { screen: 'alerts' });
});

test('streams open the session, or activity without one', () => {
  assert.deepEqual(pushDestination({ type: 'stream_started', sessionId: 's1' }), {
    screen: 'session',
    id: 's1',
  });
  assert.deepEqual(pushDestination({ type: 'stream_stopped' }), { screen: 'activity' });
});

test('account events open the user', () => {
  assert.deepEqual(pushDestination({ type: 'new_device', serverUserId: 'u1' }), {
    screen: 'user',
    id: 'u1',
  });
  assert.deepEqual(pushDestination({ type: 'trust_score_changed', serverUserId: 'u1' }), {
    screen: 'user',
    id: 'u1',
  });
  assert.deepEqual(pushDestination({ type: 'new_device' }), { screen: 'dashboard' });
});

test('everything else and nothing at all opens the dashboard', () => {
  for (const type of [
    'server_down',
    'server_up',
    'media_added',
    'media_upgraded',
    'server_update_available',
    'tracearr_update_available',
    'plugin_update_available',
    'data_sync',
    'test',
    'something_new',
  ]) {
    assert.deepEqual(pushDestination({ type }), { screen: 'dashboard' }, type);
  }
  assert.deepEqual(pushDestination(undefined), { screen: 'dashboard' });
});
