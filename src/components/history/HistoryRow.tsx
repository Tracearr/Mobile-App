/**
 * History row component - rich display with poster, content, quality, and progress
 * Matches web history table quality in a mobile-optimized layout
 */
import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
import { format, isToday, isYesterday } from 'date-fns';
import {
  Film,
  Tv,
  Music,
  Radio,
  Play,
  MonitorPlay,
  Repeat2,
  ChevronRight,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/authStore';
import { colors, spacing, borderRadius } from '@/lib/theme';
import type { SessionWithDetails, MediaType } from '@tracearr/shared';

interface HistoryRowProps {
  session: SessionWithDetails;
  onPress: () => void;
}

// Format duration from milliseconds to compact string
function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return '<1m';
}

// Calculate progress percentage (playback position)
// Uses progressMs (where in the video) not durationMs (how long watched)
function getProgress(session: SessionWithDetails): number {
  if (!session.totalDurationMs || session.totalDurationMs === 0) return 0;
  const progress = session.progressMs ?? 0;
  return Math.min(100, Math.round((progress / session.totalDurationMs) * 100));
}

// Get content title with proper formatting for different media types
function getContentTitle(session: SessionWithDetails): { primary: string; secondary?: string } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    const epNum =
      session.seasonNumber && session.episodeNumber
        ? `S${session.seasonNumber.toString().padStart(2, '0')}E${session.episodeNumber.toString().padStart(2, '0')}`
        : '';
    return {
      primary: session.grandparentTitle,
      secondary: `${epNum}${epNum ? ' · ' : ''}${session.mediaTitle}`,
    };
  }
  if (session.mediaType === 'track') {
    const parts: string[] = [];
    if (session.artistName) parts.push(session.artistName);
    if (session.albumName) parts.push(session.albumName);
    return {
      primary: session.mediaTitle,
      secondary: parts.length > 0 ? parts.join(' · ') : undefined,
    };
  }
  return {
    primary: session.mediaTitle,
    secondary: session.year ? `(${session.year})` : undefined,
  };
}

// Media type icon component
function MediaTypeIcon({ type }: { type: MediaType }) {
  const icons: Record<string, typeof Film> = {
    movie: Film,
    episode: Tv,
    track: Music,
    live: Radio,
  };
  const Icon = icons[type] || Film;
  return <Icon size={14} color={colors.text.muted.dark} />;
}

// Quality badge showing transcode status
function QualityBadge({ session }: { session: SessionWithDetails }) {
  const isTranscode = session.isTranscode ?? false;
  const isCopy = session.videoDecision === 'copy' || session.audioDecision === 'copy';

  if (isTranscode) {
    return (
      <View style={[styles.qualityBadge, styles.transcodeBadge]}>
        <Repeat2 size={10} color={colors.warning} />
        <Text style={[styles.qualityText, styles.transcodeText]}>Transcode</Text>
      </View>
    );
  }

  if (isCopy) {
    return (
      <View style={[styles.qualityBadge, styles.directBadge]}>
        <MonitorPlay size={10} color={colors.cyan.core} />
        <Text style={[styles.qualityText, styles.directText]}>Direct Stream</Text>
      </View>
    );
  }

  return (
    <View style={[styles.qualityBadge, styles.directBadge]}>
      <Play size={10} color={colors.success} fill={colors.success} />
      <Text style={[styles.qualityText, styles.directPlayText]}>Direct Play</Text>
    </View>
  );
}

// Progress bar component
function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.progressText}>{progress}%</Text>
    </View>
  );
}

// Poster dimensions (2:3 aspect ratio for movie posters)
const POSTER_WIDTH = 40;
const POSTER_HEIGHT = 60;

export function HistoryRow({ session, onPress }: HistoryRowProps) {
  const { serverUrl } = useAuthStore();
  const displayName = session.user?.identityName ?? session.user?.username ?? 'Unknown';
  const title = getContentTitle(session);
  const progress = getProgress(session);

  // Format date - show "Today 2:30 PM", "Yesterday 9:15 AM", or "Jan 12, 2:30 PM"
  const startedAt = session.startedAt ? new Date(session.startedAt) : null;
  const isValidDate = startedAt && !isNaN(startedAt.getTime());
  let dateTimeStr = '-';
  if (isValidDate) {
    const timeStr = format(startedAt, 'h:mm a');
    if (isToday(startedAt)) {
      dateTimeStr = `Today ${timeStr}`;
    } else if (isYesterday(startedAt)) {
      dateTimeStr = `Yesterday ${timeStr}`;
    } else {
      dateTimeStr = format(startedAt, 'MMM d, h:mm a');
    }
  }
  const duration = formatDuration(session.durationMs);

  // Platform info
  const platform = session.platform || session.product;

  // Build poster URL using image proxy
  const posterUrl =
    serverUrl && session.thumbPath
      ? `${serverUrl}/api/v1/images/proxy?server=${session.serverId}&url=${encodeURIComponent(session.thumbPath)}&width=${POSTER_WIDTH * 2}&height=${POSTER_HEIGHT * 2}`
      : null;

  return (
    <Pressable onPress={onPress} style={styles.container}>
      {/* Row 1: Poster + Content title + Duration */}
      <View style={styles.mainRow}>
        {/* Poster */}
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Film size={18} color={colors.text.muted.dark} />
          </View>
        )}

        {/* Content info */}
        <View style={styles.content}>
          {/* Title with media type icon */}
          <View style={styles.titleRow}>
            <MediaTypeIcon type={session.mediaType || 'movie'} />
            <Text style={styles.title} numberOfLines={1}>
              {title.primary}
            </Text>
          </View>

          {/* Secondary info (episode name, year, etc) */}
          {title.secondary && (
            <Text style={styles.secondary} numberOfLines={1}>
              {title.secondary}
            </Text>
          )}

          {/* User and platform */}
          <Text style={styles.userLine} numberOfLines={1}>
            {displayName}
            {platform ? ` · ${platform}` : ''}
          </Text>
        </View>

        {/* Right side: Duration + Time */}
        <View style={styles.rightMeta}>
          <Text style={styles.duration}>{duration}</Text>
          <Text style={styles.time}>{dateTimeStr}</Text>
        </View>
      </View>

      {/* Row 2: Quality badge + Progress bar */}
      <View style={styles.bottomRow}>
        <QualityBadge session={session} />
        <ProgressBar progress={progress} />
        <ChevronRight size={14} color={colors.text.muted.dark} />
      </View>
    </Pressable>
  );
}

// For list separators
export function HistoryRowSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.card.dark,
    gap: spacing.xs,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface.dark,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  secondary: {
    fontSize: 12,
    color: colors.text.secondary.dark,
    marginLeft: 20, // Align with title (icon width + gap)
  },
  userLine: {
    fontSize: 11,
    color: colors.text.muted.dark,
    marginLeft: 20,
  },
  rightMeta: {
    alignItems: 'flex-end',
    gap: 2,
  },
  duration: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  time: {
    fontSize: 11,
    color: colors.text.muted.dark,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginLeft: 48, // Align with content (avatar width + gap)
  },
  qualityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  transcodeBadge: {
    backgroundColor: `${colors.warning}20`,
  },
  directBadge: {
    backgroundColor: `${colors.cyan.core}15`,
  },
  qualityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  transcodeText: {
    color: colors.warning,
  },
  directText: {
    color: colors.cyan.core,
  },
  directPlayText: {
    color: colors.success,
  },
  progressContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: colors.surface.dark,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan.core,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 10,
    color: colors.text.muted.dark,
    width: 28,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: colors.border.dark,
  },
});
