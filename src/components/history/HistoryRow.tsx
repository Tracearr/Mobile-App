/**
 * History row component - rich display with poster, content, quality, and progress
 * Matches web history table quality in a mobile-optimized layout
 */
import React from 'react';
import { View, Pressable, Image } from 'react-native';
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
import { ACCENT_COLOR, colors } from '@/lib/theme';
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
  return <Icon size={14} color={colors.icon.default} />;
}

// Quality badge showing transcode status
function QualityBadge({ session }: { session: SessionWithDetails }) {
  const isTranscode = session.isTranscode ?? false;
  const isCopy = session.videoDecision === 'copy' || session.audioDecision === 'copy';

  const badgeStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  };

  if (isTranscode) {
    return (
      <View style={{ ...badgeStyle, backgroundColor: `${colors.warning}20` }}>
        <Repeat2 size={12} color={colors.warning} />
        <Text style={{ fontSize: 11, fontWeight: '600', color: colors.warning }}>Transcode</Text>
      </View>
    );
  }

  if (isCopy) {
    return (
      <View style={{ ...badgeStyle, backgroundColor: `${ACCENT_COLOR}15` }}>
        <MonitorPlay size={12} color={ACCENT_COLOR} />
        <Text style={{ fontSize: 11, fontWeight: '600', color: ACCENT_COLOR }}>Direct Stream</Text>
      </View>
    );
  }

  return (
    <View style={{ ...badgeStyle, backgroundColor: `${colors.success}15` }}>
      <Play size={12} color={colors.success} fill={colors.success} />
      <Text style={{ fontSize: 11, fontWeight: '600', color: colors.success }}>Direct Play</Text>
    </View>
  );
}

// Progress bar component
function ProgressBar({ progress }: { progress: number }) {
  return (
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          flex: 1,
          height: 4,
          backgroundColor: colors.surface.dark,
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            height: '100%',
            width: `${progress}%`,
            backgroundColor: ACCENT_COLOR,
            borderRadius: 2,
          }}
        />
      </View>
      <Text style={{ fontSize: 10, color: colors.text.muted.dark, width: 28, textAlign: 'right' }}>
        {progress}%
      </Text>
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
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: colors.card.dark,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
      }}
    >
      {/* Poster */}
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          style={{
            width: POSTER_WIDTH,
            height: POSTER_HEIGHT,
            borderRadius: 4,
            backgroundColor: colors.surface.dark,
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{
            width: POSTER_WIDTH,
            height: POSTER_HEIGHT,
            borderRadius: 4,
            backgroundColor: colors.surface.dark,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Film size={18} color={colors.icon.default} />
        </View>
      )}

      {/* Content area - all text and badges */}
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        {/* Top section: Title + Duration */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, gap: 2 }}>
            {/* Title with media type icon */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MediaTypeIcon type={session.mediaType || 'movie'} />
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.text.primary.dark,
                }}
              >
                {title.primary}
              </Text>
            </View>

            {/* Secondary info (episode name, year, etc) */}
            {title.secondary && (
              <Text
                numberOfLines={1}
                style={{ fontSize: 12, color: colors.text.muted.dark, marginLeft: 20 }}
              >
                {title.secondary}
              </Text>
            )}

            {/* User and platform */}
            <Text
              numberOfLines={1}
              style={{ fontSize: 11, color: colors.text.muted.dark, marginLeft: 20 }}
            >
              {displayName}
              {platform ? ` · ${platform}` : ''}
            </Text>
          </View>

          {/* Right side: Duration + Time */}
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary.dark }}>
              {duration}
            </Text>
            <Text style={{ fontSize: 11, color: colors.text.muted.dark }}>{dateTimeStr}</Text>
          </View>
        </View>

        {/* Bottom section: Quality badge + Progress bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
          <QualityBadge session={session} />
          <ProgressBar progress={progress} />
          <ChevronRight size={14} color={colors.icon.default} />
        </View>
      </View>
    </Pressable>
  );
}

// For list separators
export function HistoryRowSeparator() {
  return <View className="bg-border h-px" />;
}
