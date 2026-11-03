import { test } from 'node:test';
import assert from 'node:assert/strict';
import { flipCopy, isSplitWidth, splitFlip, splitListWidth } from './splitLayout.ts';

test('split width threshold is 600 on iOS, 840 on Android', () => {
  assert.equal(isSplitWidth(599, 'ios'), false);
  assert.equal(isSplitWidth(600, 'ios'), true);
  assert.equal(isSplitWidth(839, 'android'), false);
  assert.equal(isSplitWidth(840, 'android'), true);
  assert.equal(isSplitWidth(700, 'web'), true);
});

test('list pane is 40% of the width, capped at 380', () => {
  assert.equal(splitListWidth(600), 240);
  assert.equal(splitListWidth(840), 336);
  assert.equal(splitListWidth(1200), 380);
});

const base = { selectedId: null, pushedId: null, copy: null, detailRoute: 'user/[id]' };

test('becoming split embeds the detail this list pushed', () => {
  const input = { ...base, wasSplit: false, isSplit: true, pushedId: 'u1' };
  assert.deepEqual(splitFlip({ ...input, copy: { name: 'user/[id]', id: 'u1' } }), {
    type: 'embed',
    id: 'u1',
  });
  assert.deepEqual(splitFlip({ ...input, copy: { name: 'session/[id]', id: 's9' } }), {
    type: 'none',
  });
  assert.deepEqual(splitFlip({ ...input, pushedId: null, copy: { name: 'user/[id]', id: 'u1' } }), {
    type: 'none',
  });
});

test('leaving split pushes the selection', () => {
  const input = { ...base, wasSplit: true, isSplit: false };
  assert.deepEqual(splitFlip({ ...input, selectedId: 'u1' }), { type: 'push', id: 'u1' });
  assert.deepEqual(splitFlip(input), { type: 'none' });
});

test('no change in split state does nothing', () => {
  for (const s of [true, false]) {
    assert.deepEqual(
      splitFlip({
        ...base,
        wasSplit: s,
        isSplit: s,
        selectedId: 'u1',
        pushedId: 'u1',
        copy: { name: 'user/[id]', id: 'u1' },
      }),
      { type: 'none' }
    );
  }
});

// R14 and R27: the copy this list pushed is found by its token, wherever it
// sits in the list's own stack; nothing else embeds.
test('an unfold embeds the copy carrying the token, wherever it sits', () => {
  const routes = [
    { key: 'list' },
    { key: 'flip', params: { id: 'u1', mem: 'm7' } },
    { key: 'session', params: { id: 's1', mem: 'm8' } },
    { key: 'a2', params: { id: 'u1', mem: 'm9' } },
  ];
  assert.equal(flipCopy(routes, 'm7').key, 'flip');
  assert.equal(flipCopy(routes, 'm9').key, 'a2');
  assert.equal(flipCopy(routes, 'gone'), undefined);
  assert.equal(flipCopy(routes, null), undefined);
  assert.equal(flipCopy([], 'm7'), undefined);
});
