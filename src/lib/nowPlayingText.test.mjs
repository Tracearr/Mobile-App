import { test } from 'node:test';
import assert from 'node:assert/strict';
import { widgetResources, WIDGET_TEXT_KEYS } from './nowPlayingText.ts';

const bundles = {
  en: {
    common: {
      count: { stream_one: '{{count}} stream', stream_other: '{{count}} streams', user: 'user' },
      playback: { paused: 'Paused', directPlay: 'Direct Play', other: 'x' },
    },
    pages: { dashboard: { nowPlaying: 'Now Playing', unrelated: 'no' } },
    mobile: { widget: { asOf: 'as of {{time}}' } },
    settings: { serverHealth: { unreachable: '{{serverName}} is unreachable' } },
  },
  'pl-PL': {
    common: {
      count: {
        stream_one: '{{count}} strumień',
        stream_few: '{{count}} strumienie',
        stream_many: '{{count}} strumieni',
        stream_other: '{{count}} strumienia',
      },
    },
  },
};
const bundle = (lng, ns) => bundles[lng]?.[ns];

test('widgetResources copies a listed key and its plural siblings, nothing else', () => {
  const out = widgetResources(bundle, 'en');
  assert.deepEqual(out.en.common.count, {
    stream_one: '{{count}} stream',
    stream_other: '{{count}} streams',
  });
  assert.equal(out.en.pages.dashboard.nowPlaying, 'Now Playing');
  assert.equal(out.en.pages.dashboard.unrelated, undefined);
  assert.equal(out.en.common.playback.other, undefined);
});

test('widgetResources includes every plural category of the requested language plus en', () => {
  const out = widgetResources(bundle, 'pl-PL');
  assert.deepEqual(Object.keys(out['pl-PL'].common.count).sort(), [
    'stream_few',
    'stream_many',
    'stream_one',
    'stream_other',
  ]);
  assert.equal(out.en.common.count.stream_other, '{{count}} streams');
});

test('widgetResources skips namespaces that are not loaded', () => {
  const out = widgetResources(bundle, 'pl-PL');
  assert.equal(out['pl-PL'].pages, undefined);
});

test('WIDGET_TEXT_KEYS covers every key widgetText reads', () => {
  const keys = new Set(WIDGET_TEXT_KEYS.map(({ ns, key }) => `${ns}:${key}`));
  for (const k of [
    'pages:dashboard.nowPlaying',
    'pages:dashboard.noActiveStreams',
    'pages:dashboard.streamsAppearHere',
    'mobile:widget.signedOut',
    'common:playback.paused',
    'common:playback.directPlay',
    'common:playback.directStream',
    'common:playback.transcode',
    'common:count.stream',
    'mobile:widget.streamUnit',
    'mobile:widget.transcodes',
    'mobile:widget.statStreams',
    'mobile:widget.statTranscodes',
    'mobile:widget.statDirect',
    'mobile:widget.more',
    'mobile:widget.serversOk',
    'settings:serverHealth.unreachable',
    'settings:serverHealth.multipleUnreachable',
    'mobile:widget.serversDown',
    'mobile:widget.asOf',
  ]) {
    assert.ok(keys.has(k), k);
  }
});
