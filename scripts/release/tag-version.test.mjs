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
