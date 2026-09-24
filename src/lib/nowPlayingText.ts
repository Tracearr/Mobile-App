import {
  i18n,
  formatBitrate,
  formatDateTime,
  formatNumber,
  formatTime,
} from '@tracearr/translations/mobile';
import { PLAYBACK_DECISION_LABEL_KEYS } from '@tracearr/shared';
import type { NowPlayingText } from './nowPlayingWidget';

// Every key widgetText reads. The widget extension carries only these (and their
// plural siblings) into its own i18next, so a new t() call below needs a row here.
export const WIDGET_TEXT_KEYS: readonly { ns: string; key: string }[] = [
  { ns: 'pages', key: 'dashboard.nowPlaying' },
  { ns: 'pages', key: 'dashboard.noActiveStreams' },
  { ns: 'pages', key: 'dashboard.streamsAppearHere' },
  { ns: 'mobile', key: 'widget.signedOut' },
  { ns: 'common', key: 'playback.paused' },
  { ns: 'common', key: 'playback.directPlay' },
  { ns: 'common', key: 'playback.directStream' },
  { ns: 'common', key: 'playback.transcode' },
  { ns: 'common', key: 'count.stream' },
  { ns: 'mobile', key: 'widget.streamUnit' },
  { ns: 'mobile', key: 'widget.transcodes' },
  { ns: 'mobile', key: 'widget.statStreams' },
  { ns: 'mobile', key: 'widget.statTranscodes' },
  { ns: 'mobile', key: 'widget.statDirect' },
  { ns: 'mobile', key: 'widget.more' },
  { ns: 'mobile', key: 'widget.serversOk' },
  { ns: 'settings', key: 'serverHealth.unreachable' },
  { ns: 'settings', key: 'serverHealth.multipleUnreachable' },
  { ns: 'mobile', key: 'widget.serversDown' },
  { ns: 'mobile', key: 'widget.asOf' },
];

export type WidgetResources = Record<string, Record<string, Record<string, unknown>>>;

// What the app hands the widget extension so it can build the same props itself.
export type WidgetContext = {
  writtenAt: number;
  serverUrl: string;
  lng: string;
  resources: WidgetResources;
};

type Tree = Record<string, unknown>;

function isTree(value: unknown): value is Tree {
  return typeof value === 'object' && value !== null;
}

function child(node: unknown, name: string): Tree | undefined {
  if (!isTree(node)) return undefined;
  const value = node[name];
  return isTree(value) ? value : undefined;
}

function place(root: Tree, path: string[], value: unknown): void {
  let node = root;
  for (const part of path.slice(0, -1)) {
    const next = node[part];
    if (isTree(next)) {
      node = next;
    } else {
      const created: Tree = {};
      node[part] = created;
      node = created;
    }
  }
  node[path[path.length - 1]] = value;
}

/**
 * Copies the widget's keys out of loaded i18next bundles for lng and en. Plural
 * forms are siblings named key_one, key_few and so on, so every sibling that
 * shares the key's prefix comes along.
 */
export function widgetResources(
  bundle: (lng: string, ns: string) => unknown,
  lng: string
): WidgetResources {
  const out: WidgetResources = {};
  for (const language of new Set([lng, 'en'])) {
    for (const { ns, key } of WIDGET_TEXT_KEYS) {
      const path = key.split('.');
      const leaf = path[path.length - 1];
      const parents = path.slice(0, -1);
      let node: unknown = bundle(language, ns);
      for (const part of parents) node = child(node, part);
      if (!isTree(node)) continue;
      for (const [name, value] of Object.entries(node)) {
        if (typeof value !== 'string') continue;
        if (name === leaf || name.startsWith(`${leaf}_`)) {
          place(out, [language, ns, ...parents, name], value);
        }
      }
    }
  }
  return out;
}

// A widget layout cannot call t(): these are resolved here, in the app's
// language at snapshot time, and travel to the widget as props.
export function widgetText(): NowPlayingText {
  return {
    heading: i18n.t('pages:dashboard.nowPlaying'),
    noStreams: i18n.t('pages:dashboard.noActiveStreams'),
    noStreamsHint: i18n.t('pages:dashboard.streamsAppearHere'),
    signedOut: i18n.t('mobile:widget.signedOut', {
      defaultValue: 'Open Tracearr to pair a server.',
    }),
    paused: i18n.t('common:playback.paused'),
    decision: (decision) => i18n.t(`common:${PLAYBACK_DECISION_LABEL_KEYS[decision]}`),
    bitrate: (kbps) => formatBitrate(kbps * 1000),
    mbps: (kbps) => formatNumber(kbps / 1000, { maximumFractionDigits: 1 }),
    streams: (count) => i18n.t('common:count.stream', { count }),
    streamUnit: (count) =>
      i18n.t('mobile:widget.streamUnit', {
        count,
        defaultValue: 'streams',
        defaultValue_one: 'stream',
        defaultValue_other: 'streams',
      }),
    transcodes: (count) =>
      i18n.t('mobile:widget.transcodes', {
        count,
        defaultValue: '{{count}} transcodes',
        defaultValue_one: '{{count}} transcode',
        defaultValue_other: '{{count}} transcodes',
      }),
    statStreams: i18n.t('mobile:widget.statStreams', { defaultValue: 'Streams' }),
    statTranscodes: i18n.t('mobile:widget.statTranscodes', { defaultValue: 'Transcodes' }),
    statDirect: i18n.t('mobile:widget.statDirect', { defaultValue: 'Direct' }),
    more: (count) =>
      i18n.t('mobile:widget.more', {
        count,
        defaultValue: '+{{count}} more',
        defaultValue_one: '+{{count}} more',
        defaultValue_other: '+{{count}} more',
      }),
    serversOk: i18n.t('mobile:widget.serversOk', { defaultValue: 'All servers reachable' }),
    serversDown: (names) =>
      names.length === 1
        ? i18n.t('settings:serverHealth.unreachable', { serverName: names[0] })
        : i18n.t('settings:serverHealth.multipleUnreachable', {
            count: names.length,
            serverNames: names.join(', '),
          }),
    serversDownCount: (count) =>
      i18n.t('mobile:widget.serversDown', {
        count,
        defaultValue: '{{count}} servers down',
        defaultValue_one: '{{count}} server down',
        defaultValue_other: '{{count}} servers down',
      }),
    time: (ms) => formatTime(ms, 'short'),
    asOf: (ms, dated) =>
      i18n.t('mobile:widget.asOf', {
        defaultValue: 'as of {{time}}',
        time: dated ? formatDateTime(ms, 'medium', 'short') : formatTime(ms, 'short'),
      }),
  };
}
