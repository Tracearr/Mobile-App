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

const published = ['2.3.0', '2.4.0-beta.1', '2.4.0', '2.4.1', '2.5.0-beta.1'];
const noNetwork = () => {
  throw new Error('npm queried for a version the pins already match');
};

test('pins that match the tag exactly are accepted without asking npm', () => {
  assert.deepEqual(verifyPins(pkg('2.4.1', '2.4.1'), 'v2.4.1', noNetwork), {
    expected: '2.4.1',
    mismatches: [],
  });
});

test('a mobile patch the server never published passes on the newest published version', () => {
  assert.deepEqual(
    verifyPins(pkg('2.4.1', '2.4.1'), 'v2.4.2', () => published),
    { expected: '2.4.1', mismatches: [] }
  );
});

test('a mobile patch on an older published version fails', () => {
  assert.deepEqual(
    verifyPins(pkg('2.4.0', '2.4.0'), 'v2.4.2', () => published),
    {
      expected: '2.4.1',
      mismatches: [
        { name: '@tracearr/shared', expected: '2.4.1', actual: '2.4.0' },
        { name: '@tracearr/translations', expected: '2.4.1', actual: '2.4.0' },
      ],
    }
  );
});

test('a version the server did publish still needs its exact pins', () => {
  assert.deepEqual(
    verifyPins(pkg('2.4.0', '2.4.0'), 'v2.4.1', () => published),
    {
      expected: '2.4.1',
      mismatches: [
        { name: '@tracearr/shared', expected: '2.4.1', actual: '2.4.0' },
        { name: '@tracearr/translations', expected: '2.4.1', actual: '2.4.0' },
      ],
    }
  );
});

test('a prerelease needs its exact pins even when npm has no such version', () => {
  assert.deepEqual(
    verifyPins(pkg('2.4.1', '2.4.1'), 'v2.5.0-beta.2', () => published),
    {
      expected: '2.5.0-beta.2',
      mismatches: [
        { name: '@tracearr/shared', expected: '2.5.0-beta.2', actual: '2.4.1' },
        { name: '@tracearr/translations', expected: '2.5.0-beta.2', actual: '2.4.1' },
      ],
    }
  );
});

test('a major.minor with no published release has nothing to fall back to', () => {
  assert.deepEqual(
    verifyPins(pkg('2.4.1', '2.4.1'), 'v2.6.1', () => published),
    {
      expected: '2.6.1',
      mismatches: [
        { name: '@tracearr/shared', expected: '2.6.1', actual: '2.4.1' },
        { name: '@tracearr/translations', expected: '2.6.1', actual: '2.4.1' },
      ],
    }
  );
});

test('the newest published patch compares numerically', () => {
  assert.equal(mobileOnlyPinVersion('v2.4.11', ['2.4.2', '2.4.10', '2.4.9']), '2.4.10');
});
