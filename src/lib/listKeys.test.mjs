import { test } from 'node:test';
import assert from 'node:assert/strict';
import { keyById } from './listKeys.ts';

test('keys on the id, and on the index when FlashList passes no item', () => {
  assert.equal(keyById({ id: 'abc' }, 0), 'abc');
  assert.equal(keyById(undefined, 7), 'missing-7');
});
