import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareVersions, atLeast, SERVER_2_2 } from './serverVersion.ts';

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
