import {
  formatEpisodeLabel,
  playbackDecision,
  type ActiveSession,
  type PlaybackDecision,
} from '@tracearr/shared';

// A widget layout runs outside the app with no i18n and no network, so every
// string arrives already translated and every threshold arrives as a timestamp.
export type NowPlayingWidgetProps = {
  status: 'ok' | 'signedOut';
  heading: string;
  message: string;
  streamCount: number;
  transcodeCount: number;
  directCount: number;
  streamsLabel: string;
  // The word beside the big count, which the layout sets apart from the number.
  streamUnitLabel: string;
  transcodesLabel: string;
  // Total bitrate of every live stream in Mbps; the label is empty when none is known.
  bitrateValue: string;
  bitrateLabel: string;
  statLabels: { streams: string; transcodes: string; direct: string; bitrate: string };
  emptyLabel: string;
  emptyHint: string;
  pausedLabel: string;
  rows: NowPlayingRow[];
  rowLimits: typeof WIDGET_ROW_LIMITS;
  // Indexed by how many rows the layout shows: "+N more" for the rest, or empty.
  moreLabels: string[];
  serversDownLabel: string;
  serversOkLabel: string;
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
  url: string;
  title: string;
  user: string;
  status: string;
  episode: string;
  episodeTitle: string;
  quality: string;
  player: string;
  decision: PlaybackDecision;
  decisionLabel: string;
  hardwareTranscode: boolean;
  progressMs: number;
  durationMs: number;
  progressLabel: string;
  durationLabel: string;
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
  noStreamsHint: string;
  signedOut: string;
  paused: string;
  decision: (decision: PlaybackDecision) => string;
  bitrate: (kbps: number) => string;
  mbps: (kbps: number) => string;
  streams: (count: number) => string;
  streamUnit: (count: number) => string;
  transcodes: (count: number) => string;
  statStreams: string;
  statTranscodes: string;
  statDirect: string;
  more: (count: number) => string;
  serversOk: string;
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
  | 'videoDecision'
  | 'audioDecision'
  | 'transcodeInfo'
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

// The most rows each size can show; both show fewer as each row grows extra lines.
export const WIDGET_ROW_LIMITS = { systemMedium: 3, systemLarge: 4 };
const SNAPSHOT_ROWS = Math.max(...Object.values(WIDGET_ROW_LIMITS));
export const WIDGET_STALE_AFTER_MS = 15 * 60 * 1000;
export const WIDGET_DATED_AFTER_MS = 12 * 60 * 60 * 1000;

const APP_URL = 'tracearr://';
const BITRATE_UNIT = 'Mbps';

// Shown before the app has ever run, when nothing has been translated yet.
export const WIDGET_INITIAL_PROPS: NowPlayingWidgetProps = {
  status: 'signedOut',
  heading: 'Now Playing',
  message: 'Open Tracearr to load your streams.',
  streamCount: 0,
  transcodeCount: 0,
  directCount: 0,
  streamsLabel: '',
  streamUnitLabel: '',
  transcodesLabel: '',
  bitrateValue: '',
  bitrateLabel: '',
  statLabels: { streams: '', transcodes: '', direct: '', bitrate: BITRATE_UNIT },
  emptyLabel: '',
  emptyHint: '',
  pausedLabel: '',
  rows: [],
  rowLimits: WIDGET_ROW_LIMITS,
  moreLabels: [],
  serversDownLabel: '',
  serversOkLabel: '',
  serversDownCountLabel: '',
  asOfMs: 0,
  timeLabel: '',
  asOfLabel: '',
  asOfDatedLabel: '',
  staleAtMs: 0,
  datedAtMs: 0,
  url: APP_URL,
};

function clock(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  const minutes = Math.floor(seconds / 60);
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}:${pad(minutes % 60)}:${pad(seconds % 60)}`
    : `${minutes}:${pad(seconds % 60)}`;
}

function rowOf(session: WidgetSession, text: NowPlayingText): NowPlayingRow {
  const series = session.mediaType === 'episode' ? session.grandparentTitle : null;
  const paused = session.state === 'paused';
  const decision = playbackDecision(session);
  const transcode = decision === 'transcode';
  const status = [paused ? text.paused : null, transcode ? text.decision(decision) : null];
  const quality = [session.quality, session.bitrate ? text.bitrate(session.bitrate) : null];
  const durationMs = session.totalDurationMs ?? 0;
  const progressMs = session.progressMs ?? 0;
  return {
    id: session.id,
    url: `${APP_URL}session/${session.id}`,
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
    decision,
    decisionLabel: text.decision(decision),
    hardwareTranscode:
      transcode && !!(session.transcodeInfo?.hwEncoding || session.transcodeInfo?.hwDecoding),
    progressMs,
    durationMs,
    progressLabel: durationMs > 0 ? clock(progressMs) : '',
    durationLabel: durationMs > 0 ? clock(durationMs) : '',
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
  const kbps = live.reduce((sum, s) => sum + (s.bitrate ?? 0), 0);
  const bitrateValue = text.mbps(kbps);
  return {
    status: 'ok',
    heading: text.heading,
    message: '',
    streamCount: live.length,
    transcodeCount,
    directCount: live.length - transcodeCount,
    streamsLabel: text.streams(live.length),
    streamUnitLabel: text.streamUnit(live.length),
    transcodesLabel: transcodeCount > 0 ? text.transcodes(transcodeCount) : '',
    bitrateValue,
    bitrateLabel: kbps > 0 ? `${bitrateValue} ${BITRATE_UNIT}` : '',
    statLabels: {
      streams: text.statStreams,
      transcodes: text.statTranscodes,
      direct: text.statDirect,
      bitrate: BITRATE_UNIT,
    },
    emptyLabel: text.noStreams,
    emptyHint: text.noStreamsHint,
    pausedLabel: text.paused,
    rows: playingFirst.slice(0, SNAPSHOT_ROWS).map((s) => rowOf(s, text)),
    rowLimits: WIDGET_ROW_LIMITS,
    moreLabels: Array.from({ length: SNAPSHOT_ROWS + 1 }, (_, shown) =>
      live.length > shown ? text.more(live.length - shown) : ''
    ),
    serversDownLabel: down > 0 ? text.serversDown(unhealthyServers.map((s) => s.serverName)) : '',
    serversOkLabel: down > 0 ? '' : text.serversOk,
    serversDownCountLabel: down > 0 ? text.serversDownCount(down) : '',
    ...stamps(now, text),
    url: only ? `${APP_URL}session/${only.id}` : APP_URL,
  };
}

export function signedOutProps(now: number, text: NowPlayingText): NowPlayingWidgetProps {
  return {
    ...WIDGET_INITIAL_PROPS,
    heading: text.heading,
    message: text.signedOut,
    ...stamps(now, text),
  };
}

// WidgetKit renders each entry with its own date, which is how the layout
// learns the snapshot has aged without the app running.
export function nowPlayingTimeline(props: NowPlayingWidgetProps) {
  // The last date is when WidgetKit asks for the next timeline, so even the
  // signed out card carries a far one instead of expiring the moment it lands.
  const dates =
    props.status === 'signedOut'
      ? [props.asOfMs, props.datedAtMs]
      : [props.asOfMs, props.staleAtMs, props.datedAtMs];
  return dates.map((ms) => ({ date: new Date(ms), props }));
}
