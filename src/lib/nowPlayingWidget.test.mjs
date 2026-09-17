import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildNowPlayingProps,
  nowPlayingTimeline,
  signedOutProps,
  WIDGET_DATED_AFTER_MS,
  WIDGET_STALE_AFTER_MS,
} from './nowPlayingWidget.ts';

const NOW = 1_800_000_000_000;

const text = {
  heading: 'Now Playing',
  noStreams: 'No active streams',
  signedOut: 'Open Tracearr to pair a server.',
  paused: 'Paused',
  transcode: 'Transcode',
  streams: (n) => `${n} streams`,
  transcodes: (n) => `${n} transcodes`,
  serversDown: (names) => `${names.join(', ')} unreachable`,
  serversDownCount: (n) => `${n} down`,
  time: (ms) => `T${ms - NOW}`,
  asOf: (ms, dated) => `as of ${dated ? 'D' : ''}T${ms - NOW}`,
};

const session = (id, over = {}) => ({
  id,
  state: 'playing',
  isTranscode: false,
  mediaType: 'movie',
  mediaTitle: `Movie ${id}`,
  grandparentTitle: null,
  user: { username: `user-${id}`, identityName: null },
  ...over,
});

test('counts streams and transcodes and labels them', () => {
  const props = buildNowPlayingProps(
    [session('a'), session('b', { isTranscode: true }), session('c', { state: 'stopped' })],
    [],
    NOW,
    text
  );
  assert.equal(props.status, 'ok');
  assert.equal(props.streamCount, 2);
  assert.equal(props.transcodeCount, 1);
  assert.equal(props.streamsLabel, '2 streams');
  assert.equal(props.transcodesLabel, '1 transcodes');
});

test('no transcodes leaves the transcode label empty', () => {
  assert.equal(buildNowPlayingProps([session('a')], [], NOW, text).transcodesLabel, '');
});

test('rows put playing streams first and stop at three', () => {
  const props = buildNowPlayingProps(
    [session('a', { state: 'paused' }), session('b'), session('c'), session('d'), session('e')],
    [],
    NOW,
    text
  );
  assert.deepEqual(
    props.rows.map((r) => r.id),
    ['b', 'c', 'd']
  );
  assert.equal(props.streamCount, 5);
});

test('a row shows the series title, the person and the state', () => {
  const [row] = buildNowPlayingProps(
    [
      session('a', {
        state: 'paused',
        isTranscode: true,
        mediaType: 'episode',
        mediaTitle: 'Pilot',
        grandparentTitle: 'Lost',
        user: { username: 'bob', identityName: 'Bob K' },
      }),
    ],
    [],
    NOW,
    text
  ).rows;
  assert.deepEqual(row, {
    id: 'a',
    title: 'Lost',
    detail: 'Bob K · Paused · Transcode',
    paused: true,
  });
});

test('a down server is named on the home screen and only counted for the lock screen', () => {
  const props = buildNowPlayingProps(
    [],
    [{ serverName: 'Emby' }, { serverName: 'Plex' }],
    NOW,
    text
  );
  assert.equal(props.serversDownLabel, 'Emby, Plex unreachable');
  assert.equal(props.serversDownCountLabel, '2 down');
  assert.equal(buildNowPlayingProps([], [], NOW, text).serversDownLabel, '');
});

test('exactly one stream links to that session, anything else to the app', () => {
  assert.equal(buildNowPlayingProps([session('a')], [], NOW, text).url, 'tracearr://session/a');
  assert.equal(
    buildNowPlayingProps([session('a'), session('b')], [], NOW, text).url,
    'tracearr://'
  );
  assert.equal(buildNowPlayingProps([], [], NOW, text).url, 'tracearr://');
});

test('the snapshot time rides along with both staleness thresholds', () => {
  const props = buildNowPlayingProps([], [], NOW, text);
  assert.equal(props.asOfMs, NOW);
  assert.equal(props.timeLabel, 'T0');
  assert.equal(props.asOfLabel, 'as of T0');
  assert.equal(props.asOfDatedLabel, 'as of DT0');
  assert.equal(props.staleAtMs, NOW + WIDGET_STALE_AFTER_MS);
  assert.equal(props.datedAtMs, NOW + WIDGET_DATED_AFTER_MS);
});

test('the timeline re-renders the same props at each threshold', () => {
  const props = buildNowPlayingProps([session('a')], [], NOW, text);
  const entries = nowPlayingTimeline(props);
  assert.deepEqual(
    entries.map((e) => e.date.getTime()),
    [NOW, props.staleAtMs, props.datedAtMs]
  );
  assert.ok(entries.every((e) => e.props === props));
});

test('signed out carries no stream data and a single entry', () => {
  const props = signedOutProps(NOW, text);
  assert.equal(props.status, 'signedOut');
  assert.equal(props.message, 'Open Tracearr to pair a server.');
  assert.deepEqual(props.rows, []);
  assert.equal(props.streamCount, 0);
  assert.equal(nowPlayingTimeline(props).length, 1);
});

test('props survive JSON with no null or undefined, which the app group store rejects', () => {
  const props = buildNowPlayingProps([session('a', { user: null })], [], NOW, text);
  const walk = (value) =>
    value !== null &&
    value !== undefined &&
    (typeof value !== 'object' || Object.values(value).every(walk));
  assert.ok(walk(props));
  assert.deepEqual(JSON.parse(JSON.stringify(props)), props);
});
