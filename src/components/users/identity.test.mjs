import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIdentityServers,
  getMergedIdentityServers,
  isPersonRemoved,
  violationsPageFilter,
} from './identity.ts';

test('a row with no identityServers still shows its own server', () => {
  const own = { id: 's1', name: 'Plex' };
  assert.deepEqual(getIdentityServers(undefined, own), [own]);
  assert.deepEqual(getIdentityServers([], own), [own]);
  const both = [own, { id: 's2', name: 'Jellyfin' }];
  assert.deepEqual(getIdentityServers(both, own), both);
});

test('detail header pills only appear for a person on two or more servers', () => {
  assert.deepEqual(getMergedIdentityServers([{ id: 's1', name: 'Plex' }]), []);
  assert.equal(
    getMergedIdentityServers([
      { id: 's1', name: 'Plex' },
      { id: 's2', name: 'Emby' },
    ]).length,
    2
  );
});

test('a person is removed only when every account is removed', () => {
  assert.equal(isPersonRemoved([]), false);
  assert.equal(isPersonRemoved([{ removedAt: '2026-01-01' }, { removedAt: null }]), false);
  assert.equal(isPersonRemoved([{ removedAt: '2026-01-01' }, { removedAt: '2026-02-01' }]), true);
});

test('violations page by person in identity scope and by account otherwise', () => {
  assert.deepEqual(violationsPageFilter('identity', 'account-1', 'person-1'), {
    userId: 'person-1',
  });
  assert.deepEqual(violationsPageFilter('account', 'account-1', 'person-1'), {
    serverUserId: 'account-1',
  });
});
