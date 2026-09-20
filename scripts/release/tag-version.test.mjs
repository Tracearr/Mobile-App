import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTag } from './tag-version.mjs';

test('stable tag maps to production', () => {
  assert.deepEqual(parseTag('v2.1.0'), {
    tag: 'v2.1.0',
    baseTag: 'v2.1.0',
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
    baseTag: 'v2.2.0-beta.3',
    marketingVersion: '2.2.0',
    packageVersion: '2.2.0-beta.3',
    isPrerelease: true,
    defaultProfile: 'beta',
    npmDistTag: 'next',
  });
});

test('a mobile hotfix keeps the base version and builds as production', () => {
  assert.deepEqual(parseTag('v2.4.1-mobile.1'), {
    tag: 'v2.4.1-mobile.1',
    baseTag: 'v2.4.1',
    marketingVersion: '2.4.1',
    packageVersion: '2.4.1',
    isPrerelease: false,
    defaultProfile: 'production',
    npmDistTag: 'latest',
  });
});

test('a mobile hotfix on a beta stays a beta', () => {
  assert.deepEqual(parseTag('v2.4.1-beta.2-mobile.3'), {
    tag: 'v2.4.1-beta.2-mobile.3',
    baseTag: 'v2.4.1-beta.2',
    marketingVersion: '2.4.1',
    packageVersion: '2.4.1-beta.2',
    isPrerelease: true,
    defaultProfile: 'beta',
    npmDistTag: 'next',
  });
});

test('a malformed mobile suffix is rejected rather than read as a prerelease', () => {
  for (const tag of [
    'v2.4.1-mobile',
    'v2.4.1-mobile.0',
    'v2.4.1-mobile.01',
    'v2.4.1-beta.mobile.1',
    'v2.4.1-mobile.1-mobile.2',
  ]) {
    assert.throws(() => parseTag(tag), /Not a mobile hotfix tag/, tag);
  }
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
