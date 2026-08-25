import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyVersion } from './apply-version.mjs';

test('sets the marketing version', () => {
  const out = applyVersion({ expo: { name: 'Tracearr', version: '1.5.0' } }, '2.2.0');
  assert.equal(out.expo.version, '2.2.0');
});

test('leaves other expo config untouched', () => {
  const out = applyVersion({ expo: { name: 'Tracearr', version: '1.5.0', slug: 'tracearr' } }, '2.2.0');
  assert.equal(out.expo.name, 'Tracearr');
  assert.equal(out.expo.slug, 'tracearr');
});

test('does not write a build number', () => {
  const out = applyVersion({ expo: { version: '1.5.0', ios: {}, android: {} } }, '2.2.0');
  assert.equal(out.expo.ios.buildNumber, undefined);
  assert.equal(out.expo.android.versionCode, undefined);
});

test('does not mutate its input', () => {
  const input = { expo: { version: '1.5.0' } };
  applyVersion(input, '2.2.0');
  assert.equal(input.expo.version, '1.5.0');
});

test('rejects config with no expo block', () => {
  assert.throws(() => applyVersion({}, '2.2.0'), /missing an expo block/);
});
