/**
 * Shared configuration for media servers, session states, and media types
 * Provides consistent styling and labels across the app
 */
import {
  Play,
  Pause,
  Square,
  Tv,
  Film,
  Music,
  Radio,
  ImageIcon,
  CircleHelp,
  Clapperboard,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from './theme';
import type { SessionState, MediaType, ServerType } from '@tracearr/shared';

/**
 * Media server type configuration (Plex, Jellyfin, Emby)
 */
export const SERVER_CONFIG: Record<ServerType, { label: string; color: string }> = {
  plex: { label: 'Plex', color: '#E5A00D' },
  jellyfin: { label: 'Jellyfin', color: '#A855F7' },
  emby: { label: 'Emby', color: '#22C55E' },
};

/**
 * Session state configuration (playing, paused, stopped)
 */
export const STATE_CONFIG: Record<
  SessionState,
  { icon: LucideIcon; color: string; label: string }
> = {
  playing: { icon: Play, color: colors.success, label: 'Playing' },
  paused: { icon: Pause, color: colors.warning, label: 'Paused' },
  stopped: { icon: Square, color: colors.text.muted.dark, label: 'Stopped' },
};

/**
 * Media type configuration (movie, episode, track, etc.)
 */
export const MEDIA_CONFIG: Record<MediaType, { icon: LucideIcon; label: string }> = {
  movie: { icon: Film, label: 'Movie' },
  episode: { icon: Tv, label: 'Episode' },
  track: { icon: Music, label: 'Track' },
  live: { icon: Radio, label: 'Live TV' },
  photo: { icon: ImageIcon, label: 'Photo' },
  trailer: { icon: Clapperboard, label: 'Trailer' },
  unknown: { icon: CircleHelp, label: 'Unknown' },
};

/**
 * Get server config with fallback for unknown types
 */
export function getServerConfig(type: string): { label: string; color: string } {
  return SERVER_CONFIG[type as ServerType] ?? { label: type, color: colors.text.muted.dark };
}

/**
 * Get state config with fallback for unknown states
 */
export function getStateConfig(state: string): { icon: LucideIcon; color: string; label: string } {
  return STATE_CONFIG[state as SessionState] ?? STATE_CONFIG.stopped;
}

/**
 * Get media config with fallback for unknown types
 */
export function getMediaConfig(type: string): { icon: LucideIcon; label: string } {
  return MEDIA_CONFIG[type as MediaType] ?? MEDIA_CONFIG.unknown;
}
