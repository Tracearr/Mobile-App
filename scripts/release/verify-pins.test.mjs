import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findPinMismatches,
  mobileOnlyPinVersion,
  TRACEARR_PACKAGES,
  verifyPins,
} from './verify-pins.mjs';

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

const published = ['2.3.0', '2.4.0-beta.1', '2.4.0-beta.2', '2.4.0', '2.5.0-beta.1'];
const noNetwork = () => {
  throw new Error('npm queried for an exact match');
};

test('a tag matching the pins passes without querying npm', () => {
  assert.deepEqual(verifyPins(pkg('2.4.0', '2.4.0'), 'v2.4.0', noNetwork), {
    expected: '2.4.0',
    mismatches: [],
  });
});

test('a mobile-only patch passes on the newest published patch of its minor', () => {
  assert.deepEqual(
    verifyPins(pkg('2.4.0', '2.4.0'), 'v2.4.1', () => published),
    {
      expected: '2.4.0',
      mismatches: [],
    }
  );
});

test('a mobile-only patch on an older patch of its minor fails', () => {
  const versions = [...published, '2.4.1'];
  assert.deepEqual(verifyPins(pkg('2.4.0', '2.4.0'), 'v2.4.3', () => versions).mismatches, [
    { name: '@tracearr/shared', expected: '2.4.1', actual: '2.4.0' },
    { name: '@tracearr/translations', expected: '2.4.1', actual: '2.4.0' },
  ]);
});

test('a patch the server published still needs the exact pins', () => {
  const versions = [...published, '2.4.1'];
  assert.equal(verifyPins(pkg('2.4.0', '2.4.0'), 'v2.4.1', () => versions).expected, '2.4.1');
});

test('the newest patch compares numerically', () => {
  assert.equal(mobileOnlyPinVersion('v2.4.11', ['2.4.2', '2.4.10', '2.4.9']), '2.4.10');
});

test('a prerelease tag never takes the mobile-only rule', () => {
  assert.equal(mobileOnlyPinVersion('v2.4.1-beta.1', published), null);
});

test('a minor with no stable release has no mobile-only pin', () => {
  assert.equal(mobileOnlyPinVersion('v2.5.1', published), null);
});
