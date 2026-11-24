import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  profileBadgeMetrics,
  profileLabel,
  profileOptionLabel,
  profilesInView,
  sessionProfileLabel,
} from './profiles.ts';

const removed = (name) => `${name} (removed)`;
const opt = (id, serverUserId, main) => ({
  id,
  name: id,
  serverUserId,
  accountUsername: serverUserId,
  serverName: 'Basement',
  main,
  removed: false,
});

test('a removed profile is marked, a listed one is not', () => {
  assert.equal(profileLabel({ name: 'Kids', removed: false }, removed), 'Kids');
  assert.equal(profileLabel({ name: 'Kids', removed: true }, removed), 'Kids (removed)');
});

test('a main profile lists as its account', () => {
  assert.equal(
    profileOptionLabel(
      { name: 'Main', removed: false, main: true, accountUsername: 'connor' },
      removed
    ),
    'connor'
  );
  assert.equal(
    profileOptionLabel(
      { name: 'Kids', removed: true, main: false, accountUsername: 'connor' },
      removed
    ),
    'Kids (removed)'
  );
});

test('profiles in view follow the scope and need a non-main one', () => {
  const all = [opt('p1', 'su1', true), opt('p2', 'su1', false), opt('p3', 'su2', true)];
  assert.deepEqual(
    profilesInView(all, 'identity', 'su1').map((p) => p.id),
    ['p1', 'p2', 'p3']
  );
  assert.deepEqual(
    profilesInView(all, 'account', 'su1').map((p) => p.id),
    ['p1', 'p2']
  );
  assert.deepEqual(profilesInView(all, 'account', 'su2'), []);
  assert.deepEqual(
    profilesInView([opt('p1', 'su1', true), opt('p3', 'su2', true)], 'identity', 'su1'),
    []
  );
  assert.deepEqual(profilesInView(undefined, 'identity', 'su1'), []);
});

test('a session with no profile row names no profile', () => {
  const labels = new Map([['p1', 'connor']]);
  assert.equal(sessionProfileLabel({ profileId: 'p1' }, labels), 'connor');
  assert.equal(sessionProfileLabel({ profileId: null }, labels), null);
  assert.equal(sessionProfileLabel({ profileId: 'gone' }, labels), null);
});

test('badge proportions follow web and drop the letter below 7 px', () => {
  assert.deepEqual(profileBadgeMetrics(36, 'one'), {
    size: 20.16,
    offset: -7.2,
    ring: 2,
    letterSize: 14.11,
  });
  assert.equal(profileBadgeMetrics(20, 'two').letterSize, null);
  assert.equal(profileBadgeMetrics(16, 'two').ring, 1.5);
});
