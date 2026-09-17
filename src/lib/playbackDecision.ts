export type PlaybackDecision = 'directplay' | 'copy' | 'transcode';

export const PLAYBACK_DECISION_LABEL_KEYS = {
  directplay: 'common:playback.directPlay',
  copy: 'common:playback.directStream',
  transcode: 'common:playback.transcode',
} as const satisfies Record<PlaybackDecision, string>;

export interface PlaybackDecisionInput {
  isTranscode?: boolean | null;
  videoDecision?: string | null;
  audioDecision?: string | null;
}

/** Any copied stream makes the whole session a Direct Stream. */
export function playbackDecision(session: PlaybackDecisionInput): PlaybackDecision {
  if (session.isTranscode) return 'transcode';
  return session.videoDecision === 'copy' || session.audioDecision === 'copy'
    ? 'copy'
    : 'directplay';
}
