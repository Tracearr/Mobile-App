import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPinMismatches, TRACEARR_PACKAGES, verifyPins } from './verify-pins.mjs';

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

const published = {
  '@tracearr/shared': ['2.4.1', '2.5.0-beta.4', '2.5.0', '2.5.1'],
  '@tracearr/translations': ['2.4.1', '2.5.0-beta.4', '2.5.0'],
};
const fetchPublished = (name) => published[name];
const noNetwork = () => {
  throw new Error('npm queried when the pins already disagree');
};

test('equal stable pins that npm has pass a stable tag', () => {
  assert.deepEqual(verifyPins(pkg('2.5.0', '2.5.0'), 'v2026.9.1', fetchPublished), {
    expected: '2.5.0',
    mismatches: [],
    reason: null,
  });
});

test('equal stable pins that npm has pass a legacy stable tag', () => {
  assert.deepEqual(verifyPins(pkg('2.5.0', '2.5.0'), 'v2.5.0', fetchPublished), {
    expected: '2.5.0',
    mismatches: [],
    reason: null,
  });
});

test('a prerelease pin fails a stable tag', () => {
  assert.deepEqual(
    verifyPins(pkg('2.5.0-beta.4', '2.5.0-beta.4'), 'v2026.9.1', fetchPublished),
    {
      expected: '2.5.0-beta.4',
      mismatches: [],
      reason: 'a production release needs a stable pin, main is pinned to 2.5.0-beta.4; sync a stable Tracearr release first',
    }
  );
});

test('a prerelease pin passes a prerelease tag', () => {
  assert.deepEqual(
    verifyPins(pkg('2.5.0-beta.4', '2.5.0-beta.4'), 'v2026.9.1-beta.1', fetchPublished),
    { expected: '2.5.0-beta.4', mismatches: [], reason: null }
  );
});

test('a pin npm lacks for one package fails', () => {
  assert.deepEqual(verifyPins(pkg('2.5.1', '2.5.1'), 'v2026.9.1', fetchPublished), {
    expected: '2.5.1',
    mismatches: [],
    reason: 'pins are 2.5.1, which npm does not have for @tracearr/translations',
  });
});

test('unequal pins fail without asking npm', () => {
  assert.deepEqual(verifyPins(pkg('2.5.0', '2.4.1'), 'v2026.9.1', noNetwork), {
    expected: null,
    mismatches: [{ name: '@tracearr/translations', expected: '2.5.0', actual: '2.4.1' }],
    reason: 'pins disagree',
  });
});

test('a range fails without asking npm', () => {
  const result = verifyPins(pkg('^2.5.0', '2.5.0'), 'v2026.9.1', noNetwork);
  assert.equal(result.expected, null);
  assert.equal(result.reason, 'pins disagree');
  assert.deepEqual(result.mismatches, [
    { name: '@tracearr/shared', expected: '2.5.0', actual: '^2.5.0' },
  ]);
});

test('a missing pin fails without asking npm', () => {
  const result = verifyPins({ dependencies: { '@tracearr/shared': '2.5.0' } }, 'v2026.9.1', noNetwork);
  assert.equal(result.reason, 'pins disagree');
  assert.deepEqual(result.mismatches, [
    { name: '@tracearr/translations', expected: '2.5.0', actual: null },
  ]);
});
