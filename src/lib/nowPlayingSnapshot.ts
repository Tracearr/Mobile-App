import {
  i18n,
  formatBitrate,
  formatDateTime,
  formatNumber,
  formatTime,
} from '@tracearr/translations/mobile';
import { PLAYBACK_DECISION_LABEL_KEYS, type ServerScope } from '@tracearr/shared';
import { api } from './api';
import { useAuthStateStore } from './authStateStore';
import { i18nReady } from './i18n';
import { publishNowPlaying, widgetsSupported } from './nowPlayingPublisher';
import {
  buildNowPlayingProps,
  signedOutProps,
  type NowPlayingText,
  type WidgetSession,
} from './nowPlayingWidget';

// The widget always covers every server. The in-app server selection is a view
// filter; a home screen count that silently followed it would under-report.
export const WIDGET_SCOPE: ServerScope = { mode: 'all' };

// Background launches get about 30 seconds in total and the axios default is 30.
const REFRESH_TIMEOUT_MS = 10_000;

let publishedAsOf = 0;

export function nowPlayingSnapshotAge(): number {
  return Date.now() - publishedAsOf;
}

// A widget layout cannot call t(): these are resolved here, in the app's
// language at snapshot time, and travel to the widget as props.
function widgetText(): NowPlayingText {
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

export function publishSessions(
  sessions: readonly WidgetSession[],
  unhealthyServers: readonly { serverName: string }[],
  asOf: number
): void {
  publishNowPlaying(buildNowPlayingProps(sessions, unhealthyServers, asOf, widgetText()));
  publishedAsOf = asOf;
}

export function publishSignedOut(): void {
  publishNowPlaying(signedOutProps(Date.now(), widgetText()));
  publishedAsOf = 0;
}

function authReady(): Promise<void> {
  if (!useAuthStateStore.getState().isInitializing) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubscribe = useAuthStateStore.subscribe((state) => {
      if (state.isInitializing) return;
      unsubscribe();
      resolve();
    });
  });
}

function isSignedOut(): boolean {
  const { server, tokenStatus } = useAuthStateStore.getState();
  return server === null || tokenStatus === 'revoked';
}

/**
 * Fetches a fresh snapshot outside React, for the background task, the push
 * task and the moment the app leaves the foreground. A failed fetch publishes
 * nothing: the previous snapshot stays up and its own timeline marks it stale.
 */
export async function refreshNowPlayingWidget(): Promise<boolean> {
  if (!widgetsSupported) return false;
  await Promise.all([authReady(), i18nReady.catch(() => undefined)]);
  if (isSignedOut()) {
    publishSignedOut();
    return true;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REFRESH_TIMEOUT_MS);
  try {
    const [sessions, unhealthyServers] = await Promise.all([
      api.sessions.active(WIDGET_SCOPE, controller.signal),
      api.servers.health(controller.signal),
    ]);
    publishSessions(sessions, unhealthyServers, Date.now());
    return true;
  } catch {
    // A 401 that could not be refreshed flips the store to revoked on its way out.
    if (isSignedOut()) publishSignedOut();
    return false;
  } finally {
    clearTimeout(timer);
  }
}
