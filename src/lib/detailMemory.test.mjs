import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  forgetDetail,
  isQuietScroll,
  newToken,
  QUIET_SCROLL_MS,
  recallScroll,
  recallTab,
  rememberScroll,
  rememberTab,
  restoreStep,
  scrollKey,
  startOffset,
  subscribeTabs,
} from './detailMemory.ts';

test('scroll offsets are remembered per key and default to 0', () => {
  assert.equal(recallScroll('user:a:sessions'), 0);
  rememberScroll('user:a:sessions', 412);
  assert.equal(recallScroll('user:a:sessions'), 412);
});

test('the selected tab is remembered per token', () => {
  assert.equal(recallTab('a'), undefined);
  rememberTab('a', 'violations');
  assert.equal(recallTab('a'), 'violations');
});

test('tab subscribers hear changes only, until they unsubscribe', () => {
  let calls = 0;
  const unsubscribe = subscribeTabs(() => calls++);
  rememberTab('b', 'sessions');
  rememberTab('b', 'sessions');
  assert.equal(calls, 1);
  unsubscribe();
  rememberTab('b', 'overview');
  assert.equal(calls, 1);
  assert.equal(recallTab('b'), 'overview');
});

test('every opened detail gets its own token', () => {
  const a = newToken();
  const b = newToken();
  assert.notEqual(a, b);
  assert.equal(scrollKey(a, 'sessions'), `${a}:sessions`);
  assert.equal(scrollKey(a), a);
});

test('negative offsets are remembered as 0', () => {
  rememberScroll('pull', -64);
  assert.equal(recallScroll('pull'), 0);
});

test('a scroll is quiet only away from layout events', () => {
  assert.equal(isQuietScroll(1000, 1000 - QUIET_SCROLL_MS), true);
  assert.equal(isQuietScroll(1000, 1000 - QUIET_SCROLL_MS + 1), false);
  assert.equal(isQuietScroll(1000, 990), false);
});

test('a key with no remembered offset keeps the current one up to the ceiling', () => {
  assert.equal(startOffset('user:s:new', 300, 120), 120);
  assert.equal(startOffset('user:s:new', 40, 120), 40);
  assert.equal(startOffset('user:s:new', 300), 0);
});

test('a remembered offset wins over the ceiling, zero included', () => {
  rememberScroll('user:s:seen', 500);
  rememberScroll('user:s:top', 0);
  assert.equal(startOffset('user:s:seen', 300, 120), 500);
  assert.equal(startOffset('user:s:top', 300, 120), 0);
});

const size = (height, width = 400) => ({ width, height });

test('a target inside the layout is reached and ends the restore', () => {
  assert.deepEqual(restoreStep(400, size(1500), size(800)), { y: 400, done: true });
  assert.deepEqual(restoreStep(700, size(1500), size(800)), { y: 700, done: true });
});

test('a target past the layout maximum scrolls to the bottom and stays open', () => {
  assert.deepEqual(restoreStep(900, size(1500), size(800)), { y: 700, done: false });
  assert.deepEqual(restoreStep(300, size(600), size(800)), { y: 0, done: false });
});

test('nothing restores until the content and the viewport are measured', () => {
  assert.equal(restoreStep(400, size(0), size(800)), null);
  assert.equal(restoreStep(400, size(1500), size(0)), null);
});

test('nothing restores while content and viewport come from different widths', () => {
  assert.equal(restoreStep(400, size(3200, 443), size(1500, 852)), null);
  assert.deepEqual(restoreStep(400, size(2800, 852.4), size(1500, 852)), { y: 400, done: true });
});

// R22: closing a detail forgets it. R26: only that detail.
test('forgetting a token drops its offsets and tab, and only its own', () => {
  const c = newToken();
  const other = newToken();
  rememberScroll(scrollKey(c), 120);
  rememberScroll(scrollKey(c, 'sessions'), 300);
  rememberScroll(scrollKey(other, 'sessions'), 70);
  rememberTab(c, 'sessions');
  rememberTab(other, 'violations');
  forgetDetail(c);
  assert.equal(recallScroll(scrollKey(c)), 0);
  assert.equal(recallScroll(scrollKey(c, 'sessions')), 0);
  assert.equal(recallTab(c), undefined);
  assert.equal(recallScroll(scrollKey(other, 'sessions')), 70);
  assert.equal(recallTab(other), 'violations');
});

// R26: embedded A on Sessions, a session pushed over it, then A's row pushes a
// second copy of A. The second copy minted its own token, so it opens on
// Overview and its close leaves the embedded copy alone.
test('two copies of one id keep separate memory', () => {
  const embedded = newToken();
  const second = newToken();
  rememberTab(embedded, 'sessions');
  rememberScroll(scrollKey(embedded, 'sessions'), 640);
  rememberTab(second, 'overview');
  assert.equal(recallTab(embedded), 'sessions');
  forgetDetail(second);
  assert.equal(recallTab(embedded), 'sessions');
  assert.equal(recallScroll(scrollKey(embedded, 'sessions')), 640);
});

test('forgetting a token with a tab tells tab subscribers once', () => {
  const d = newToken();
  rememberTab(d, 'violations');
  let calls = 0;
  const unsubscribe = subscribeTabs(() => calls++);
  forgetDetail(d);
  forgetDetail(d);
  unsubscribe();
  assert.equal(calls, 1);
});
