import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getIdentityServers,
  getMergedIdentityServers,
  isPersonRemoved,
  pageableSections,
  parseServerTimestamp,
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

test('parses the Postgres text timestamps the users list sends', () => {
  assert.equal(
    parseServerTimestamp('2026-09-17 14:29:35.04+00')?.toISOString(),
    '2026-09-17T14:29:35.040Z'
  );
  assert.equal(
    parseServerTimestamp('2026-09-17 20:00:00+05:30')?.toISOString(),
    '2026-09-17T14:30:00.000Z'
  );
  assert.equal(
    parseServerTimestamp('2026-09-17T14:29:35.040Z')?.toISOString(),
    '2026-09-17T14:29:35.040Z'
  );
  assert.equal(parseServerTimestamp(null), null);
  assert.equal(parseServerTimestamp('not a date'), null);
});

test('load more follows what each paged endpoint can scope to', () => {
  assert.deepEqual(pageableSections(false, true), {
    sessionsAndTerminations: true,
    violations: true,
  });
  assert.deepEqual(pageableSections(true, true), {
    sessionsAndTerminations: false,
    violations: true,
  });
  assert.deepEqual(pageableSections(true, false), {
    sessionsAndTerminations: true,
    violations: false,
  });
});
