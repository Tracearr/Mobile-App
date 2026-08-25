import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinPackages } from './pin-packages.mjs';
import { findPinMismatches } from './verify-pins.mjs';

const pkg = () => ({
  name: '@tracearr/mobile',
  dependencies: {
    '@tracearr/shared': '2.1.0',
    '@tracearr/translations': '2.1.0',
    axios: '^1.19.0',
  },
});

test('pins both tracearr packages to the exact version', () => {
  const out = pinPackages(pkg(), '2.2.0-beta.3');
  assert.equal(out.dependencies['@tracearr/shared'], '2.2.0-beta.3');
  assert.equal(out.dependencies['@tracearr/translations'], '2.2.0-beta.3');
});

test('leaves other dependencies alone', () => {
  const out = pinPackages(pkg(), '2.2.0-beta.3');
  assert.equal(out.dependencies.axios, '^1.19.0');
});

test('preserves top-level fields', () => {
  const out = pinPackages(pkg(), '2.2.0-beta.3');
  assert.equal(out.name, '@tracearr/mobile');
});

test('does not mutate its input', () => {
  const input = pkg();
  pinPackages(input, '2.2.0-beta.3');
  assert.equal(input.dependencies['@tracearr/shared'], '2.1.0');
});

test('adds the packages when the dependencies block is empty', () => {
  const out = pinPackages({}, '2.1.0');
  assert.equal(out.dependencies['@tracearr/shared'], '2.1.0');
  assert.equal(out.dependencies['@tracearr/translations'], '2.1.0');
});

test('output always satisfies the verifier', () => {
  for (const version of ['2.1.0', '2.2.0-beta.3', '10.0.1-rc.2']) {
    assert.deepEqual(findPinMismatches(pinPackages(pkg(), version), version), []);
  }
});
