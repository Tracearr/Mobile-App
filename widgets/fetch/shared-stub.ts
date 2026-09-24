// What @tracearr/shared resolves to inside the widget fetch bundle
// (widgets/fetch/metro.config.js): the two helpers the props builder uses,
// without the package index and the zod schemas it constructs at load.
export { formatEpisodeLabel } from '@tracearr/shared/media';
export { PLAYBACK_DECISION_LABEL_KEYS, playbackDecision } from '@tracearr/shared/playbackDecision';
