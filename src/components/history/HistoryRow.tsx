/**
 * History row component - rich display with poster, content, quality, and progress
 * Matches web history table quality in a mobile-optimized layout
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Film, Tv, Music, Radio, ChevronRight } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { QualityBadge } from '@/components/sessions/QualityBadge';
import { useImageUrl } from '@/hooks/useImageUrl';
import { borderRadius, colors } from '@/lib/theme';
import { formatDuration, formatListTimestamp } from '@/lib/formatters';
import { formatEpisodeLabel, type SessionWithDetails, type MediaType } from '@tracearr/shared';

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
    const epNum = formatEpisodeLabel(session.seasonNumber, session.episodeNumber) ?? '';
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

function ProgressBar({ progress }: { progress: number }) {
  return (
    <View className="flex-1 flex-row items-center gap-1.5">
      <View className="bg-surface h-1 flex-1 overflow-hidden rounded-full">
        <View className="bg-primary h-full rounded-full" style={{ width: `${progress}%` }} />
      </View>
      <Text className="text-muted-foreground min-w-7 text-right text-[10px]">{progress}%</Text>
    </View>
  );
}

// Poster dimensions (2:3 aspect ratio for movie posters)
const POSTER_WIDTH = 40;
const POSTER_HEIGHT = 60;

export function HistoryRow({ session, onPress }: HistoryRowProps) {
  const { t } = useTranslation(['common']);
  const getImageUrl = useImageUrl();
  const displayName =
    session.user?.identityName ?? session.user?.username ?? t('common:labels.unknown');
  const title = getContentTitle(session);
  const progress = getProgress(session);
  const dateTimeStr = formatListTimestamp(session.startedAt);
  const duration = formatDuration(session.durationMs);
  const platform = session.platform || session.product;

  const posterUrl = getImageUrl({
    serverId: session.serverId,
    path: session.thumbPath,
    width: POSTER_WIDTH * 2,
    height: POSTER_HEIGHT * 2,
  });

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[title.primary, title.secondary, displayName, dateTimeStr]
        .filter(Boolean)
        .join(', ')}
      className="bg-card flex-row items-center gap-2.5 px-4 py-2.5"
    >
      {posterUrl ? (
        <Image
          source={{ uri: posterUrl }}
          recyclingKey={session.id}
          style={{
            width: POSTER_WIDTH,
            height: POSTER_HEIGHT,
            borderRadius: borderRadius.sm,
            backgroundColor: colors.surface.dark,
          }}
          contentFit="cover"
        />
      ) : (
        <View
          className="bg-surface items-center justify-center rounded-sm"
          style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}
        >
          <Film size={18} color={colors.icon.default} />
        </View>
      )}

      <View className="flex-1 justify-between">
        <View className="flex-row items-start">
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <MediaTypeIcon type={session.mediaType || 'movie'} />
              <Text numberOfLines={1} className="flex-1 text-sm font-semibold">
                {title.primary}
              </Text>
            </View>

            {title.secondary && (
              <Text numberOfLines={1} className="text-muted-foreground ml-5 text-xs">
                {title.secondary}
              </Text>
            )}

            <Text numberOfLines={1} className="text-muted-foreground ml-5 text-[11px]">
              {displayName}
              {platform ? ` · ${platform}` : ''}
            </Text>
          </View>

          <View className="items-end gap-0.5">
            <Text className="text-[13px] font-semibold">{duration}</Text>
            <Text className="text-muted-foreground text-[11px]">{dateTimeStr}</Text>
          </View>
        </View>

        <View className="mt-1.5 flex-row items-center gap-2">
          <QualityBadge session={session} />
          <ProgressBar progress={progress} />
          <ChevronRight size={14} color={colors.icon.default} />
        </View>
      </View>
    </Pressable>
  );
}

export function HistoryRowSeparator() {
  return <View className="bg-border h-px" />;
}
