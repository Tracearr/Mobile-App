import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACCESS_TOKEN_KEY,
  LEGACY_ACCESS_TOKEN_KEY,
  readAccessToken,
  writeAccessToken,
} from './accessTokenStorage.ts';

function fakeStore(initial, { failShared = false } = {}) {
  const data = new Map(Object.entries(initial));
  const writes = [];
  return {
    data,
    writes,
    get: async (key) => data.get(key) ?? null,
    set: async (key, value, options) => {
      writes.push({ key, options });
      if (failShared && options?.accessGroup) return false;
      data.set(key, value);
      return true;
    },
    remove: async (key) => data.delete(key),
  };
}

const SHARED = { accessGroup: 'group.com.tracearr.app' };

test('readAccessToken returns the shared key when present and deletes a leftover old key', async () => {
  const store = fakeStore({ [ACCESS_TOKEN_KEY]: 'new', [LEGACY_ACCESS_TOKEN_KEY]: 'old' });
  assert.equal(await readAccessToken(store, SHARED), 'new');
  assert.equal(store.data.has(LEGACY_ACCESS_TOKEN_KEY), false);
});

test('readAccessToken migrates an old key into the shared group', async () => {
  const store = fakeStore({ [LEGACY_ACCESS_TOKEN_KEY]: 'old' });
  assert.equal(await readAccessToken(store, SHARED), 'old');
  assert.equal(store.data.get(ACCESS_TOKEN_KEY), 'old');
  assert.equal(store.data.has(LEGACY_ACCESS_TOKEN_KEY), false);
  assert.equal(store.writes[0].options.accessGroup, 'group.com.tracearr.app');
});

test('readAccessToken returns null when nothing is stored', async () => {
  assert.equal(await readAccessToken(fakeStore({}), SHARED), null);
});

test('writeAccessToken falls back to a private item when the shared write is refused', async () => {
  const store = fakeStore({}, { failShared: true });
  assert.equal(await writeAccessToken(store, 'tok', SHARED), true);
  assert.equal(store.data.get(ACCESS_TOKEN_KEY), 'tok');
  assert.deepEqual(
    store.writes.map((w) => Boolean(w.options?.accessGroup)),
    [true, false]
  );
});
