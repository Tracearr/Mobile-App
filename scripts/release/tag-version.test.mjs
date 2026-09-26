import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTag } from './tag-version.mjs';

test('stable tag maps to production', () => {
  assert.deepEqual(parseTag('v2.1.0'), {
    tag: 'v2.1.0',
    marketingVersion: '2.1.0',
    packageVersion: '2.1.0',
    isPrerelease: false,
    defaultProfile: 'production',
    npmDistTag: 'latest',
    scheme: 'legacy',
  });
});

test('beta tag keeps the prerelease in the package version only', () => {
  assert.deepEqual(parseTag('v2.2.0-beta.3'), {
    tag: 'v2.2.0-beta.3',
    marketingVersion: '2.2.0',
    packageVersion: '2.2.0-beta.3',
    isPrerelease: true,
    defaultProfile: 'beta',
    npmDistTag: 'next',
    scheme: 'legacy',
  });
});

test('multi-digit patch parses', () => {
  assert.equal(parseTag('v1.4.31').marketingVersion, '1.4.31');
});

test('a bare version normalises to a v-prefixed tag', () => {
  assert.equal(parseTag('2.1.0').tag, 'v2.1.0');
  assert.equal(parseTag('2.2.0-beta.3').tag, 'v2.2.0-beta.3');
});

test('a v-prefixed tag stays unchanged', () => {
  assert.equal(parseTag('v2.2.0-beta.3').tag, 'v2.2.0-beta.3');
});

test('both input forms produce identical output', () => {
  assert.deepEqual(parseTag('2.2.0-beta.3'), parseTag('v2.2.0-beta.3'));
});

test('non-numeric version is rejected', () => {
  assert.throws(() => parseTag('vfoo'), /Not a Tracearr release tag/);
});

test('trailing junk is rejected', () => {
  assert.throws(() => parseTag('v2.1.0 '), /Not a Tracearr release tag/);
});

test('an app tag parses with the app scheme', () => {
  assert.deepEqual(parseTag('v2026.9.1'), {
    tag: 'v2026.9.1',
    marketingVersion: '2026.9.1',
    packageVersion: '2026.9.1',
    isPrerelease: false,
    defaultProfile: 'production',
    npmDistTag: 'latest',
    scheme: 'app',
  });
});

test('an app beta keeps the prerelease out of the marketing version', () => {
  const parsed = parseTag('v2026.9.2-beta.1');
  assert.equal(parsed.marketingVersion, '2026.9.2');
  assert.equal(parsed.packageVersion, '2026.9.2-beta.1');
  assert.equal(parsed.defaultProfile, 'beta');
  assert.equal(parsed.scheme, 'app');
});

test('a server-shaped tag parses with the legacy scheme', () => {
  assert.equal(parseTag('v2.5.0').scheme, 'legacy');
  assert.equal(parseTag('v2.5.0-beta.4').scheme, 'legacy');
});

test('a leading zero in the month is rejected', () => {
  assert.throws(() => parseTag('v2026.09.1'), /Not a Tracearr release tag/);
});

test('a two-part version is rejected', () => {
  assert.throws(() => parseTag('v2026.9'), /Not a Tracearr release tag/);
});
