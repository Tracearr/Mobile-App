import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPinMismatches, TRACEARR_PACKAGES } from './verify-pins.mjs';
import { parseTag } from './tag-version.mjs';

const pkg = (shared, translations) => ({
  dependencies: {
    '@tracearr/shared': shared,
    '@tracearr/translations': translations,
    axios: '^1.19.0',
  },
});

test('both packages covered', () => {
  assert.deepEqual(TRACEARR_PACKAGES, ['@tracearr/shared', '@tracearr/translations']);
});

test('exact match yields no mismatches', () => {
  assert.deepEqual(findPinMismatches(pkg('2.2.0-beta.3', '2.2.0-beta.3'), '2.2.0-beta.3'), []);
});

test('one stale pin is reported', () => {
  assert.deepEqual(findPinMismatches(pkg('2.1.0', '2.2.0-beta.3'), '2.2.0-beta.3'), [
    { name: '@tracearr/shared', expected: '2.2.0-beta.3', actual: '2.1.0' },
  ]);
});

test('a range instead of an exact pin is a mismatch', () => {
  assert.deepEqual(findPinMismatches(pkg('^2.2.0-beta.3', '2.2.0-beta.3'), '2.2.0-beta.3'), [
    { name: '@tracearr/shared', expected: '2.2.0-beta.3', actual: '^2.2.0-beta.3' },
  ]);
});

test('a missing dependency is reported with a null actual', () => {
  assert.deepEqual(findPinMismatches({ dependencies: {} }, '2.1.0'), [
    { name: '@tracearr/shared', expected: '2.1.0', actual: null },
    { name: '@tracearr/translations', expected: '2.1.0', actual: null },
  ]);
});

test('a package.json with no dependencies block does not throw', () => {
  assert.equal(findPinMismatches({}, '2.1.0').length, 2);
});

test('a mobile hotfix accepts the pins its base tag shipped with', () => {
  const { packageVersion } = parseTag('v2.4.1-mobile.1');
  assert.deepEqual(findPinMismatches(pkg('2.4.1', '2.4.1'), packageVersion), []);
});

test('a mobile hotfix still rejects pins from another version', () => {
  const { packageVersion } = parseTag('v2.4.1-mobile.1');
  assert.deepEqual(findPinMismatches(pkg('2.4.0', '2.4.1'), packageVersion), [
    { name: '@tracearr/shared', expected: '2.4.1', actual: '2.4.0' },
  ]);
});
