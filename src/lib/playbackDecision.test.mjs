import { test } from 'node:test';
import assert from 'node:assert/strict';
import { playbackDecision } from './playbackDecision.ts';

test('isTranscode wins over the stream decisions', () => {
  assert.equal(
    playbackDecision({ isTranscode: true, videoDecision: 'copy', audioDecision: 'directplay' }),
    'transcode'
  );
});

test('a copied video or audio stream is a direct stream', () => {
  assert.equal(
    playbackDecision({ isTranscode: false, videoDecision: 'copy', audioDecision: 'directplay' }),
    'copy'
  );
  assert.equal(
    playbackDecision({ isTranscode: false, videoDecision: 'directplay', audioDecision: 'copy' }),
    'copy'
  );
});

test('everything else is direct play', () => {
  assert.equal(
    playbackDecision({ isTranscode: false, videoDecision: 'directplay', audioDecision: null }),
    'directplay'
  );
  assert.equal(playbackDecision({}), 'directplay');
});
