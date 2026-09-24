import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimelineFromInput } from './buildTimeline.ts';
import { buildNowPlayingProps, nowPlayingTimeline } from '../../src/lib/nowPlayingWidget.ts';
import { widgetText } from '../../src/lib/nowPlayingText.ts';

const NOW = 1_800_000_000_000;
const resources = {
  en: {
    common: {
      count: { stream_one: '{{count}} stream', stream_other: '{{count}} streams' },
      playback: {
        paused: 'Paused',
        directPlay: 'Direct Play',
        directStream: 'Direct Stream',
        transcode: 'Transcode',
      },
    },
    pages: {
      dashboard: {
        nowPlaying: 'Now Playing',
        noActiveStreams: 'No active streams',
        streamsAppearHere: 'Streams appear here',
      },
    },
    mobile: { widget: { asOf: 'as of {{time}}', signedOut: 'Open Tracearr to pair a server.' } },
    settings: { serverHealth: { unreachable: '{{serverName}} is unreachable' } },
  },
};
const session = {
  id: 's1',
  state: 'playing',
  isTranscode: false,
  videoDecision: 'directplay',
  audioDecision: 'directplay',
  transcodeInfo: null,
  mediaType: 'movie',
  mediaTitle: 'Heat',
  grandparentTitle: null,
  seasonNumber: null,
  episodeNumber: null,
  quality: '1080p',
  bitrate: 12000,
  device: 'TV',
  product: 'Plex for TV',
  progressMs: 60_000,
  totalDurationMs: 600_000,
  user: { username: 'alice', identityName: null },
};
const input = {
  sessions: [session],
  unhealthyServers: [{ serverName: 'Plex' }],
  context: { writtenAt: NOW - 1000, serverUrl: 'https://tracearr.local/', lng: 'en', resources },
  now: NOW,
};

test('buildTimelineFromInput returns the same timeline the app would publish', () => {
  const entries = buildTimelineFromInput(input);
  // widgetText reads the default i18next instance, which the builder just initialised.
  const expected = nowPlayingTimeline(
    buildNowPlayingProps(input.sessions, input.unhealthyServers, NOW, widgetText())
  );
  assert.deepEqual(
    entries,
    expected.map((e) => ({ timestamp: e.date.getTime(), props: e.props }))
  );
  assert.equal(entries[0].props.heading, 'Now Playing');
  assert.equal(entries[0].props.streamsLabel, '1 stream');
  assert.equal(entries[0].props.serversDownLabel, 'Plex is unreachable');
});

test('buildTimelineFromInput leaves the server url alone', () => {
  buildTimelineFromInput(input);
  assert.equal(input.context.serverUrl, 'https://tracearr.local/');
});
