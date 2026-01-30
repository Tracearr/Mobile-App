/**
 * History row component - rich display with poster, content, quality, and progress
 * Matches web history table quality in a mobile-optimized layout
 */
import React from 'react';
import { View, Pressable, Image, StyleSheet } from 'react-native';
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
import { useImageUrl } from '@/hooks/useImageUrl';
import { useTheme } from '@/providers/ThemeProvider';
import { colors } from '@/lib/theme';
import { formatDuration, formatListTimestamp } from '@/lib/formatters';
import type { SessionWithDetails, MediaType } from '@tracearr/shared';

interface HistoryRowProps {
  session: SessionWithDetails;
  onPress: () => void;
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
  return <Icon size={14} className="text-muted-foreground" />;
}

// Quality badge showing transcode status
function QualityBadge({ session }: { session: SessionWithDetails }) {
  const { accentColor } = useTheme();
  const isTranscode = session.isTranscode ?? false;
  const isCopy = session.videoDecision === 'copy' || session.audioDecision === 'copy';

  if (isTranscode) {
    return (
      <View
        className="flex-row items-center gap-1 rounded-sm px-1.5 py-0.5"
        style={styles.transcodeBadge}
      >
        <Repeat2 size={10} color={colors.warning} />
        <Text className="text-[10px] font-semibold" style={{ color: colors.warning }}>
          Transcode
        </Text>
      </View>
    );
  }

  if (isCopy) {
    return (
      <View
        className="flex-row items-center gap-1 rounded-sm px-1.5 py-0.5"
        style={{ backgroundColor: `${accentColor}15` }}
      >
        <MonitorPlay size={10} color={accentColor} />
        <Text className="text-[10px] font-semibold" style={{ color: accentColor }}>
          Direct Stream
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-row items-center gap-1 rounded-sm px-1.5 py-0.5"
      style={{ backgroundColor: `${accentColor}15` }}
    >
      <Play size={10} color={colors.success} fill={colors.success} />
      <Text className="text-[10px] font-semibold" style={{ color: colors.success }}>
        Direct Play
      </Text>
    </View>
  );
}

// Progress bar component
function ProgressBar({ progress }: { progress: number }) {
  const { accentColor } = useTheme();
  return (
    <View className="flex-1 flex-row items-center gap-1.5">
      <View className="bg-card h-1 flex-1 overflow-hidden rounded-sm">
        <View
          className="h-full rounded-sm"
          style={{ width: `${progress}%`, backgroundColor: accentColor }}
        />
      </View>
      <Text className="text-muted-foreground w-7 text-right text-[10px]">{progress}%</Text>
    </View>
  );
}

// Poster dimensions (2:3 aspect ratio for movie posters)
const POSTER_WIDTH = 40;
const POSTER_HEIGHT = 60;

export function HistoryRow({ session, onPress }: HistoryRowProps) {
  const getImageUrl = useImageUrl();
  const displayName = session.user?.identityName ?? session.user?.username ?? 'Unknown';
  const title = getContentTitle(session);
  const progress = getProgress(session);

  // Format date - show "Today 2:30 PM", "Yesterday 9:15 AM", or "Jan 12, 2:30 PM"
  const dateTimeStr = formatListTimestamp(session.startedAt);
  const duration = formatDuration(session.durationMs);

  // Platform info
  const platform = session.platform || session.product;

  // Build poster URL using image proxy
  const posterUrl = getImageUrl({
    serverId: session.serverId,
    path: session.thumbPath,
    width: POSTER_WIDTH * 2,
    height: POSTER_HEIGHT * 2,
  });

  return (
    <Pressable onPress={onPress} className="bg-card gap-1 px-4 py-2">
      {/* Row 1: Poster + Content title + Duration */}
      <View className="flex-row items-start gap-2">
        {/* Poster */}
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Film size={18} className="text-muted-foreground" />
          </View>
        )}

        {/* Content info */}
        <View className="flex-1 gap-0.5">
          {/* Title with media type icon */}
          <View className="flex-row items-center gap-1.5">
            <MediaTypeIcon type={session.mediaType || 'movie'} />
            <Text className="flex-1 text-sm font-semibold" numberOfLines={1}>
              {title.primary}
            </Text>
          </View>

          {/* Secondary info (episode name, year, etc) */}
          {title.secondary && (
            <Text className="text-muted-foreground ml-5 text-xs" numberOfLines={1}>
              {title.secondary}
            </Text>
          )}

          {/* User and platform */}
          <Text className="text-muted-foreground ml-5 text-[11px]" numberOfLines={1}>
            {displayName}
            {platform ? ` · ${platform}` : ''}
          </Text>
        </View>

        {/* Right side: Duration + Time */}
        <View className="items-end gap-0.5">
          <Text className="text-[13px] font-semibold">{duration}</Text>
          <Text className="text-muted-foreground text-[11px]">{dateTimeStr}</Text>
        </View>
      </View>

      {/* Row 2: Quality badge + Progress bar */}
      <View className="ml-12 flex-row items-center gap-2">
        <QualityBadge session={session} />
        <ProgressBar progress={progress} />
        <ChevronRight size={14} className="text-muted-foreground" />
      </View>
    </Pressable>
  );
}

// For list separators
export function HistoryRowSeparator() {
  return <View className="bg-border h-px" />;
}

// Keep StyleSheet for dimensions and complex positioning
const styles = StyleSheet.create({
  poster: {
    width: POSTER_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: 4,
    backgroundColor: colors.surface.dark,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  transcodeBadge: {
    backgroundColor: `${colors.warning}20`,
  },
});
