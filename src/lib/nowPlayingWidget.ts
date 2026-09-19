import { formatEpisodeLabel, type ActiveSession } from '@tracearr/shared';

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
  rowLimits: typeof WIDGET_ROW_LIMITS;
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

// Every row carries every field; the iOS widget's Edit Widget options choose
// which ones it shows, so the app never needs to know how a widget is set up.
export type NowPlayingRow = {
  id: string;
  title: string;
  user: string;
  status: string;
  episode: string;
  episodeTitle: string;
  quality: string;
  player: string;
  progressMs: number;
  durationMs: number;
  paused: boolean;
};

// Mirrors ios.configuration.parameters for the NowPlaying widget in app.json.
export type NowPlayingWidgetOptions = {
  showUser: boolean;
  showEpisode: boolean;
  showQuality: boolean;
  showPlayer: boolean;
  showProgress: boolean;
};

export interface NowPlayingText {
  heading: string;
  noStreams: string;
  signedOut: string;
  paused: string;
  transcode: string;
  bitrate: (kbps: number) => string;
  streams: (count: number) => string;
  transcodes: (count: number) => string;
  serversDown: (names: string[]) => string;
  serversDownCount: (count: number) => string;
  time: (ms: number) => string;
  asOf: (ms: number, dated: boolean) => string;
}

export type WidgetSession = Pick<
  ActiveSession,
  | 'id'
  | 'state'
  | 'isTranscode'
  | 'mediaType'
  | 'mediaTitle'
  | 'grandparentTitle'
  | 'seasonNumber'
  | 'episodeNumber'
  | 'quality'
  | 'bitrate'
  | 'device'
  | 'product'
  | 'progressMs'
  | 'totalDurationMs'
> & { user: Pick<ActiveSession['user'], 'username' | 'identityName'> | null };

// The most rows each size can show; the large layout shows fewer as each row
// grows extra lines.
export const WIDGET_ROW_LIMITS = { systemMedium: 3, systemLarge: 6 };
const SNAPSHOT_ROWS = Math.max(...Object.values(WIDGET_ROW_LIMITS));
export const WIDGET_STALE_AFTER_MS = 15 * 60 * 1000;
export const WIDGET_DATED_AFTER_MS = 12 * 60 * 60 * 1000;

const APP_URL = 'tracearr://';

// Shown before the app has ever run, when nothing has been translated yet.
export const WIDGET_INITIAL_PROPS: NowPlayingWidgetProps = {
  status: 'signedOut',
  heading: 'Now Playing',
  message: 'Open Tracearr to load your streams.',
  streamCount: 0,
  transcodeCount: 0,
  streamsLabel: '',
  transcodesLabel: '',
  emptyLabel: '',
  rows: [],
  rowLimits: WIDGET_ROW_LIMITS,
  serversDownLabel: '',
  serversDownCountLabel: '',
  asOfMs: 0,
  timeLabel: '',
  asOfLabel: '',
  asOfDatedLabel: '',
  staleAtMs: 0,
  datedAtMs: 0,
  url: APP_URL,
};

function rowOf(session: WidgetSession, text: NowPlayingText): NowPlayingRow {
  const series = session.mediaType === 'episode' ? session.grandparentTitle : null;
  const paused = session.state === 'paused';
  const status = [paused ? text.paused : null, session.isTranscode ? text.transcode : null];
  const quality = [session.quality, session.bitrate ? text.bitrate(session.bitrate) : null];
  return {
    id: session.id,
    title: series || session.mediaTitle,
    user: session.user?.identityName ?? session.user?.username ?? '',
    status: status.filter(Boolean).join(' · '),
    episode:
      formatEpisodeLabel(session.seasonNumber, session.episodeNumber, {
        mediaType: session.mediaType,
      }) ?? '',
    episodeTitle: series ? session.mediaTitle : '',
    quality: quality.filter(Boolean).join(' · '),
    player: session.product || session.device || '',
    progressMs: session.progressMs ?? 0,
    durationMs: session.totalDurationMs ?? 0,
    paused,
  };
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
    rows: playingFirst.slice(0, SNAPSHOT_ROWS).map((s) => rowOf(s, text)),
    rowLimits: WIDGET_ROW_LIMITS,
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
    rowLimits: WIDGET_ROW_LIMITS,
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
