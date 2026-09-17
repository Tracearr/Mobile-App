import type { MediaType } from '@tracearr/shared';

const MEDIA_TYPE_LABEL_KEYS = {
  movie: 'common:media.movie',
  episode: 'common:media.episode',
  track: 'common:media.track',
  live: 'common:media.liveTV',
  photo: 'common:media.photo',
  trailer: 'pages:automations.options.trailer',
  unknown: 'common:labels.unknown',
} as const satisfies Record<MediaType, string>;

export function mediaTypeLabelKey(mediaType: MediaType | null | undefined) {
  return MEDIA_TYPE_LABEL_KEYS[mediaType ?? 'unknown'];
}
