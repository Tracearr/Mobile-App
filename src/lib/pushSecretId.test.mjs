import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { pushSecretId } from './pushSecretId.ts';

const nodeSha256 = (input) => createHash('sha256').update(input).digest('hex');

test('matches the key id server 2.6.2 sends for a fixed secret', () => {
  const kid = pushSecretId('fixed-secret-for-kid-test-0123456789', nodeSha256);
  assert.equal(kid, '5e5b8805d3fa81cc');
  assert.equal(kid.length, 16);
});
