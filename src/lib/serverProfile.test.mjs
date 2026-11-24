import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serverProfile, serverSubtitle } from './utils.ts';

test('a server type newer than the pinned shared package has no profile', () => {
  assert.equal(serverProfile('silo'), undefined);
  assert.equal(serverProfile('plex')?.displayName, 'Plex');
});

test('the server picker subtitle falls back to the reported type', () => {
  assert.equal(serverSubtitle({ type: 'silo', historicalAt: null }, 'Historical'), 'silo');
  assert.equal(
    serverSubtitle({ type: 'jellyfin', historicalAt: '2026-01-01' }, 'Historical'),
    'Jellyfin · Historical'
  );
});
