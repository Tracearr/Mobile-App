import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, atLeast, isVersionInfo, SERVER_2_2 } from './serverVersion.ts';

test('numeric core compares numerically', () => {
  assert.equal(compareVersions('2.10.0', '2.2.0'), 1);
  assert.equal(compareVersions('2.2.0', '2.2.0'), 0);
  assert.equal(compareVersions('1.5.0', '2.0.0'), -1);
});

test('a release outranks its prereleases', () => {
  assert.equal(compareVersions('2.2.0', '2.2.0-beta.4'), 1);
  assert.equal(compareVersions('2.2.0-beta.3', '2.2.0-beta.4'), -1);
  assert.equal(compareVersions('2.2.0-beta.10', '2.2.0-beta.9'), 1);
});

test('atLeast tolerates a v prefix and rejects garbage', () => {
  assert.equal(atLeast('v2.2.0', SERVER_2_2), true);
  assert.equal(atLeast('2.2.0-beta.4', SERVER_2_2), true);
  assert.equal(atLeast('2.1.0', SERVER_2_2), false);
  assert.equal(atLeast('dev', SERVER_2_2), false);
  assert.equal(atLeast(null, SERVER_2_2), false);
});

test('isVersionInfo accepts a /version reply and rejects any other body', () => {
  assert.equal(isVersionInfo({ current: { version: '2.4.1' }, latest: null }), true);
  assert.equal(isVersionInfo('<!doctype html><html><body>Sign in</body></html>'), false);
  assert.equal(isVersionInfo({ error: 'Not Found' }), false);
  assert.equal(isVersionInfo({ current: {} }), false);
  assert.equal(isVersionInfo(null), false);
});
