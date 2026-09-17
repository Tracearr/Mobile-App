import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Play, Clock, Tv, Globe, Film, Music } from 'lucide-react-native';
import { formatEpisodeLabel, type Session } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { api, type UserDetailScope } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useImageUrl } from '@/hooks/useImageUrl';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ServerTag } from '@/components/server/ServerTag';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { formatDuration } from '@/lib/formatters';
import { colors } from '@/lib/theme';
import { UserSection, SectionRow, SectionEmptyText } from './UserSection';
import { LoadMoreButton } from './LoadMoreButton';
import { useMoreRows, SECTION_PAGE_SIZE } from './useMoreRows';
import { mediaTypeLabelKey } from './mediaTypeLabel';

function mediaIcon(mediaType: Session['mediaType']) {
  if (mediaType === 'episode') return Tv;
  if (mediaType === 'track') return Music;
  return Film;
}

function sessionTitle(session: Session): { primary: string; secondary: string | null } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    const episode = formatEpisodeLabel(session.seasonNumber, session.episodeNumber);
    return {
      primary: session.grandparentTitle,
      secondary: episode ? `${episode} · ${session.mediaTitle}` : session.mediaTitle,
    };
  }
  return { primary: session.mediaTitle, secondary: null };
}

function SessionRow({
  session,
  isFirst,
  showServer,
  onPress,
}: {
  session: Session;
  isFirst: boolean;
  showServer: boolean;
  onPress: () => void;
}) {
  const { t } = useTranslation(['common', 'pages']);
  const getImageUrl = useImageUrl();
  const { serverColor } = useMediaServer();
  const posterUrl = getImageUrl({
    serverId: session.serverId,
    path: session.thumbPath,
    width: 80,
    height: 120,
  });
  const MediaIcon = mediaIcon(session.mediaType);
  const title = sessionTitle(session);
  const locationText = [session.geoCity, session.geoCountry].filter(Boolean).join(', ');

  const state = session.watched
    ? ({
        label: t('common:playback.watched', { defaultValue: 'Watched' }),
        variant: 'success',
      } as const)
    : session.state === 'playing'
      ? ({ label: t('common:playback.playing'), variant: 'success' } as const)
      : session.state === 'paused'
        ? ({ label: t('common:playback.paused'), variant: 'warning' } as const)
        : ({ label: t('common:playback.stopped'), variant: 'secondary' } as const);

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-70">
      <SectionRow isFirst={isFirst} className="flex-row">
        <View className="bg-surface mr-3 h-14 w-10 overflow-hidden rounded-md">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={{ duration: 150, skipOnCacheHit: 'all' }}
            />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <MediaIcon size={18} color={colors.text.muted.dark} />
            </View>
          )}
        </View>

        <View className="flex-1">
          <View className="mb-1 flex-row items-start justify-between">
            <View className="mr-2 flex-1">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {title.primary}
              </Text>
              <Text className="text-muted-foreground text-xs" numberOfLines={1}>
                {title.secondary ?? t(mediaTypeLabelKey(session.mediaType))}
              </Text>
            </View>
            <Badge variant={state.variant}>{state.label}</Badge>
          </View>
          <View className="mt-1 flex-row flex-wrap items-center gap-x-4 gap-y-1">
            <View className="flex-row items-center gap-1">
              <Clock size={12} color={colors.text.muted.dark} />
              <Text className="text-muted-foreground text-xs">
                {formatDuration(session.durationMs, { style: 'precise' })}
              </Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Tv size={12} color={colors.text.muted.dark} />
              <Text className="text-muted-foreground text-xs">
                {session.platform || t('common:labels.unknown')}
              </Text>
            </View>
            {locationText ? (
              <View className="flex-row items-center gap-1">
                <Globe size={12} color={colors.text.muted.dark} />
                <Text className="text-muted-foreground text-xs">{locationText}</Text>
              </View>
            ) : null}
            {showServer && (
              <ServerTag name={session.serverName} color={serverColor(session.serverId)} />
            )}
          </View>
        </View>
      </SectionRow>
    </Pressable>
  );
}

interface UserSessionsCardProps {
  userId: string;
  first: { data: Session[]; total: number; hasMore: boolean };
  scope: UserDetailScope;
  showServer: boolean;
  onSessionPress: (session: Session) => void;
}

export function UserSessionsCard({
  userId,
  first,
  scope,
  showServer,
  onSessionPress,
}: UserSessionsCardProps) {
  const { t } = useTranslation(['common', 'mobile']);
  const { rows, canLoadMore, isLoadingMore, loadMore } = useMoreRows({
    queryKey: queryKeys.users.sessions(userId, scope),
    first,
    fetchPage: (page, signal) =>
      api.users.sessions(
        userId,
        { page, pageSize: SECTION_PAGE_SIZE, scope: scope === 'identity' ? scope : undefined },
        signal
      ),
  });

  return (
    <UserSection
      icon={Play}
      title={t('common:labels.recentSessions')}
      meta={`${first.total} ${t('common:labels.total')}`}
      className="mb-4"
    >
      {rows.length === 0 && (
        <SectionEmptyText>{t('common:empty.noSessionsFound')}</SectionEmptyText>
      )}
      {rows.map((session, index) => (
        <SessionRow
          key={session.id}
          session={session}
          isFirst={index === 0}
          showServer={showServer}
          onPress={() => onSessionPress(session)}
        />
      ))}
      {canLoadMore && <LoadMoreButton onPress={loadMore} isLoading={isLoadingMore} />}
    </UserSection>
  );
}
