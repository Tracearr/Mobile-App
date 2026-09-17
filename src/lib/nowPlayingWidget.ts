import type { ActiveSession } from '@tracearr/shared';

// A widget layout runs outside the app with no i18n and no network, so every
// string arrives already translated and every threshold arrives as a timestamp.
export type NowPlayingWidgetProps = {
  status: 'ok' | 'signedOut';
  heading: string;
  message: string;
  streamCount: number;
  transcodeCount: number;
  streamsLabel: string;
  transcodesLabel: string;
  emptyLabel: string;
  rows: NowPlayingRow[];
  serversDownLabel: string;
  // Lock screen families get this one: a count, never a server or user name.
  serversDownCountLabel: string;
  asOfMs: number;
  timeLabel: string;
  asOfLabel: string;
  asOfDatedLabel: string;
  staleAtMs: number;
  datedAtMs: number;
  url: string;
};

export type NowPlayingRow = {
  id: string;
  title: string;
  detail: string;
  paused: boolean;
};

export interface NowPlayingText {
  heading: string;
  noStreams: string;
  signedOut: string;
  paused: string;
  transcode: string;
  streams: (count: number) => string;
  transcodes: (count: number) => string;
  serversDown: (names: string[]) => string;
  serversDownCount: (count: number) => string;
  time: (ms: number) => string;
  asOf: (ms: number, dated: boolean) => string;
}

export type WidgetSession = Pick<
  ActiveSession,
  'id' | 'state' | 'isTranscode' | 'mediaType' | 'mediaTitle' | 'grandparentTitle'
> & { user: Pick<ActiveSession['user'], 'username' | 'identityName'> | null };

export const WIDGET_MAX_ROWS = 3;
export const WIDGET_STALE_AFTER_MS = 15 * 60 * 1000;
export const WIDGET_DATED_AFTER_MS = 12 * 60 * 60 * 1000;

const APP_URL = 'tracearr://';

function rowOf(session: WidgetSession, text: NowPlayingText): NowPlayingRow {
  const title =
    session.mediaType === 'episode' && session.grandparentTitle
      ? session.grandparentTitle
      : session.mediaTitle;
  const paused = session.state === 'paused';
  const detail = [
    session.user?.identityName ?? session.user?.username,
    paused ? text.paused : null,
    session.isTranscode ? text.transcode : null,
  ].filter(Boolean);
  return { id: session.id, title, detail: detail.join(' · '), paused };
}

function stamps(now: number, text: NowPlayingText) {
  return {
    asOfMs: now,
    timeLabel: text.time(now),
    asOfLabel: text.asOf(now, false),
    asOfDatedLabel: text.asOf(now, true),
    staleAtMs: now + WIDGET_STALE_AFTER_MS,
    datedAtMs: now + WIDGET_DATED_AFTER_MS,
  };
}

export function buildNowPlayingProps(
  sessions: readonly WidgetSession[],
  unhealthyServers: readonly { serverName: string }[],
  now: number,
  text: NowPlayingText
): NowPlayingWidgetProps {
  const live = sessions.filter((s) => s.state !== 'stopped');
  const transcodeCount = live.filter((s) => s.isTranscode).length;
  const playingFirst = [
    ...live.filter((s) => s.state !== 'paused'),
    ...live.filter((s) => s.state === 'paused'),
  ];
  const down = unhealthyServers.length;
  const only = live.length === 1 ? live[0] : undefined;
  return {
    status: 'ok',
    heading: text.heading,
    message: '',
    streamCount: live.length,
    transcodeCount,
    streamsLabel: text.streams(live.length),
    transcodesLabel: transcodeCount > 0 ? text.transcodes(transcodeCount) : '',
    emptyLabel: text.noStreams,
    rows: playingFirst.slice(0, WIDGET_MAX_ROWS).map((s) => rowOf(s, text)),
    serversDownLabel: down > 0 ? text.serversDown(unhealthyServers.map((s) => s.serverName)) : '',
    serversDownCountLabel: down > 0 ? text.serversDownCount(down) : '',
    ...stamps(now, text),
    url: only ? `${APP_URL}session/${only.id}` : APP_URL,
  };
}

export function signedOutProps(now: number, text: NowPlayingText): NowPlayingWidgetProps {
  return {
    status: 'signedOut',
    heading: text.heading,
    message: text.signedOut,
    streamCount: 0,
    transcodeCount: 0,
    streamsLabel: '',
    transcodesLabel: '',
    emptyLabel: '',
    rows: [],
    serversDownLabel: '',
    serversDownCountLabel: '',
    ...stamps(now, text),
    url: APP_URL,
  };
}

// WidgetKit renders each entry with its own date, which is how the layout
// learns the snapshot has aged without the app running.
export function nowPlayingTimeline(props: NowPlayingWidgetProps) {
  const dates =
    props.status === 'signedOut'
      ? [props.asOfMs]
      : [props.asOfMs, props.staleAtMs, props.datedAtMs];
  return dates.map((ms) => ({ date: new Date(ms), props }));
}
