/**
 * Session detail screen
 * Shows comprehensive information about a specific session/stream
 * Matches the design of web/src/components/history/SessionDetailSheet.tsx
 */
import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useQuery } from '@tanstack/react-query';
import { ObserveInteractiveMarker } from 'expo-observe';
import { maybeRequestReview } from '@/lib/reviewPrompt';
import {
  Play,
  Pause,
  Square,
  Server,
  MapPin,
  Smartphone,
  Clock,
  Gauge,
  Tv,
  Film,
  Music,
  Radio,
  ImageIcon,
  CircleHelp,
  Globe,
  Eye,
  ChevronRight,
  X,
  Clapperboard,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { haptics } from '@/lib/haptics';
import {
  formatDuration,
  safeFormatDate,
  safeFormatDistanceToNow,
  safeParseDate,
} from '@/lib/formatters';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useImageUrl } from '@/hooks/useImageUrl';
import { useResponsive } from '@/hooks/useResponsive';
import { ACCENT_COLOR, colors, spacing, withAlpha } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StreamDetailsPanel } from '@/components/session';
import { QualityBadge } from '@/components/sessions/QualityBadge';
import { TerminateSessionDialog } from '@/components/sessions';
import {
  SERVER_TYPE_BRAND_COLORS,
  formatEpisodeLabel,
  type SessionWithDetails,
  type SessionState,
  type MediaType,
  type ServerType,
} from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';

const POSTER_WIDTH = 56;
const POSTER_HEIGHT = 80;
const DATE_TIME_FORMAT = 'MMM d, h:mm a';

const SERVER_LABELS: Record<ServerType, string> = {
  plex: 'Plex',
  jellyfin: 'Jellyfin',
  emby: 'Emby',
};

const STATE_CONFIG = {
  playing: { icon: Play, color: colors.success, labelKey: 'common:playback.playing' },
  paused: { icon: Pause, color: colors.warning, labelKey: 'common:playback.paused' },
  stopped: { icon: Square, color: colors.text.muted.dark, labelKey: 'common:playback.stopped' },
} as const satisfies Record<SessionState, { icon: typeof Play; color: string; labelKey: string }>;

const MEDIA_CONFIG = {
  movie: { icon: Film, labelKey: 'common:media.movie' },
  episode: { icon: Tv, labelKey: 'common:media.episode' },
  track: { icon: Music, labelKey: 'common:media.track' },
  live: { icon: Radio, labelKey: 'common:media.liveTV' },
  photo: { icon: ImageIcon, labelKey: 'common:media.photo' },
  trailer: { icon: Clapperboard, labelKey: 'pages:automations.options.trailer' },
  unknown: { icon: CircleHelp, labelKey: 'common:labels.unknown' },
} as const satisfies Record<MediaType, { icon: typeof Film; labelKey: string }>;

function getWatchTime(session: SessionWithDetails): number | null {
  if (session.durationMs) {
    return session.durationMs;
  }

  if (session.startedAt && !session.stoppedAt) {
    const startTime = safeParseDate(session.startedAt)?.getTime();
    if (!startTime) return null;
    return Math.max(0, Date.now() - startTime - (session.pausedDurationMs ?? 0));
  }

  return null;
}

// Get progress percentage (playback position)
// Uses progressMs (where in the video) not durationMs (how long watched)
function getProgress(session: SessionWithDetails): number | null {
  if (!session.totalDurationMs) return null;
  const progress = session.progressMs ?? 0;
  return Math.min(100, Math.round((progress / session.totalDurationMs) * 100));
}

// Get media title formatted
function getMediaTitle(session: SessionWithDetails): { primary: string; secondary?: string } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    const epNum = formatEpisodeLabel(session.seasonNumber, session.episodeNumber, {
      spaced: true,
    });
    return {
      primary: session.grandparentTitle,
      secondary: epNum ? `${epNum} · ${session.mediaTitle}` : session.mediaTitle,
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
    secondary: session.year ? `${session.year}` : undefined,
  };
}

// Format transcode reason codes into human-friendly labels
function formatReason(reason: string): string {
  return reason
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .trim();
}

// Get country name from country code
function getCountryName(countryCode: string | null): string | null {
  if (!countryCode) return null;
  try {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
    return displayNames.of(countryCode) ?? countryCode;
  } catch {
    return countryCode;
  }
}

// Section container
function Section({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof Server;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card padding="compact">
      <SectionHeader icon={Icon} title={title} right={badge} className="mb-2" />
      {children}
    </Card>
  );
}

// Info row component
function InfoRow({
  label,
  value,
  subValue,
  mono,
}: {
  label: string;
  value: string;
  subValue?: string;
  mono?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted-foreground text-[13px]">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1">
        <Text
          className={`text-foreground text-[13px] font-medium ${mono ? 'font-mono text-[11px]' : ''}`}
          numberOfLines={1}
        >
          {value}
        </Text>
        {subValue ? <Text className="text-muted-foreground text-[11px]">{subValue}</Text> : null}
      </View>
    </View>
  );
}

export default function SessionDetailScreen() {
  const { t } = useTranslation(['mobile', 'common', 'pages']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { selectedServerId } = useMediaServer();
  const connectionState = useAuthStateStore((s) => s.connectionState);
  const isOffline = connectionState !== 'connected';
  const getImageUrl = useImageUrl();
  const { select } = useResponsive();
  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });

  const [terminateModalVisible, setTerminateModalVisible] = useState(false);

  const handleTerminate = () => {
    haptics.warning();
    setTerminateModalVisible(true);
  };

  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useQuery<SessionWithDetails>({
    queryKey: queryKeys.sessions.detail(id, selectedServerId),
    queryFn: ({ signal }) => api.sessions.get(id, signal),
    enabled: !!id,
  });

  const loaded = session !== undefined;
  useEffect(() => {
    if (loaded) void maybeRequestReview();
  }, [loaded]);

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: colors.background.dark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
        edges={['left', 'right', 'bottom']}
      >
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </SafeAreaView>
    );
  }

  if (!session) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        <ErrorState
          className="flex-1 justify-center"
          title={t('mobile:errors.failedToLoadSession')}
          message={error?.message}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const stateConfig = STATE_CONFIG[session.state];
  const mediaConfig = MEDIA_CONFIG[session.mediaType];
  const MediaIcon = mediaConfig.icon;
  const StateIcon = stateConfig.icon;
  const title = getMediaTitle(session);
  const progress = getProgress(session);

  // /sessions/:id answers a live stream from the poller cache, which carries
  // canTerminate. A row read from the database has no such field.
  const canTerminate =
    session.state !== 'stopped' && !('canTerminate' in session && session.canTerminate === false);

  const posterUrl = getImageUrl({
    serverId: session.serverId,
    path: session.thumbPath,
    width: POSTER_WIDTH * 2,
    height: POSTER_HEIGHT * 2,
  });

  // Build location string
  const locationParts = [
    session.geoCity,
    session.geoRegion,
    getCountryName(session.geoCountry),
  ].filter(Boolean);
  const locationString = locationParts.join(', ');

  const transcodeReasons = session.transcodeInfo?.reasons ?? [];
  const hasTranscodeReason = transcodeReasons.length > 0;
  const transcodeReasonText = transcodeReasons.map(formatReason).join(', ');
  const startedAt = safeParseDate(session.startedAt);
  const stoppedAt = safeParseDate(session.stoppedAt);
  const displayName = session.user.identityName ?? session.user.username;

  return (
    <>
      <ObserveInteractiveMarker />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            gap: 12,
            paddingHorizontal: horizontalPadding,
            paddingTop: spacing.sm,
            paddingBottom: spacing.xl,
          }}
        >
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1 flex-row items-center gap-2">
              <StateIcon size={16} color={stateConfig.color} />
              <Text
                accessibilityRole="header"
                className="text-foreground flex-shrink text-base font-semibold"
                numberOfLines={1}
              >
                {t('common:labels.sessionDetails')}
              </Text>
              <Badge
                variant={
                  session.state === 'playing'
                    ? 'success'
                    : session.state === 'paused'
                      ? 'warning'
                      : 'secondary'
                }
              >
                {t(stateConfig.labelKey)}
              </Badge>
            </View>
            {canTerminate && (
              <Button
                variant="destructive"
                size="sm"
                className={cn('min-h-11 gap-1.5', isOffline && 'opacity-50')}
                onPress={handleTerminate}
                disabled={isOffline}
                accessibilityLabel={t('pages:terminateStream.title')}
              >
                <X size={16} color={colors.text.primary.dark} />
                <Text className="text-destructive-foreground text-xs font-medium">
                  {t('common:actions.terminate')}
                </Text>
              </Button>
            )}
          </View>

          <Card padding="compact" className="flex-row gap-3">
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                className="bg-surface rounded-lg"
                style={{ width: POSTER_WIDTH, height: POSTER_HEIGHT }}
                contentFit="cover"
                transition={{ duration: 200, skipOnCacheHit: 'all' }}
              />
            ) : null}
            <View className="min-w-0 flex-1">
              <View className="mb-1 flex-row items-center gap-1">
                <MediaIcon size={12} color={colors.text.muted.dark} />
                <Text className="text-muted-foreground text-[11px]">{t(mediaConfig.labelKey)}</Text>
                {session.year ? (
                  <Text className="text-muted-foreground text-[11px]">· {session.year}</Text>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1">
                <Text className="text-foreground flex-1 text-[15px] font-medium" numberOfLines={2}>
                  {title.primary}
                </Text>
                {session.watched && <Eye size={14} color={colors.success} />}
              </View>
              {title.secondary ? (
                <Text className="text-muted-foreground mt-0.5 text-[13px]" numberOfLines={1}>
                  {title.secondary}
                </Text>
              ) : null}
              {progress !== null && (
                <View className="mt-2 flex-row items-center gap-2">
                  <View className="bg-border h-1.5 flex-1 overflow-hidden rounded-sm">
                    <View
                      className="bg-primary h-full rounded-sm"
                      style={{ width: `${progress}%` }}
                    />
                  </View>
                  <Text className="text-muted-foreground w-8 text-[11px]">{progress}%</Text>
                </View>
              )}
            </View>
          </Card>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${displayName}, ${t('common:actions.viewProfile')}`}
            onPress={() => router.push(ROUTES.USER(session.serverUserId))}
          >
            <Card padding="compact" className="flex-row items-center gap-3">
              <UserAvatar
                thumbUrl={session.user.thumbUrl}
                serverId={session.serverId}
                username={session.user.username}
                size={36}
              />
              <View className="min-w-0 flex-1">
                <Text className="text-foreground text-[15px] font-medium" numberOfLines={1}>
                  {displayName}
                </Text>
                {session.user.identityName &&
                  session.user.identityName !== session.user.username && (
                    <Text className="text-muted-foreground text-xs">@{session.user.username}</Text>
                  )}
                {!session.user.identityName && (
                  <Text className="text-muted-foreground text-xs">
                    {t('common:actions.viewProfile')}
                  </Text>
                )}
              </View>
              <ChevronRight size={16} color={colors.text.muted.dark} />
            </Card>
          </Pressable>

          <Section icon={Server} title={t('common:labels.server')}>
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground text-[13px]">{t('common:labels.server')}</Text>
              <View className="flex-row items-center gap-1">
                <Text
                  className="text-[13px] font-medium"
                  style={{ color: SERVER_TYPE_BRAND_COLORS[session.server.type] }}
                >
                  {SERVER_LABELS[session.server.type]}
                </Text>
                <Text className="text-muted-foreground text-[13px]">·</Text>
                <Text className="text-foreground text-[13px] font-medium">
                  {session.server.name}
                </Text>
              </View>
            </View>
          </Section>

          <Section
            icon={Clock}
            title={t('common:labels.playback', { defaultValue: 'Playback' })}
            badge={
              session.segmentCount && session.segmentCount > 1 ? (
                <Badge variant="outline">
                  {t('common:count.segment', {
                    count: session.segmentCount,
                    defaultValue: '{{count}} segments',
                  })}
                </Badge>
              ) : null
            }
          >
            <View className="gap-1.5">
              {startedAt && (
                <InfoRow
                  label={t('common:labels.started')}
                  value={safeFormatDate(startedAt, DATE_TIME_FORMAT)}
                  subValue={`(${safeFormatDistanceToNow(startedAt)})`}
                />
              )}
              {stoppedAt && (
                <InfoRow
                  label={t('common:labels.stopped')}
                  value={safeFormatDate(stoppedAt, DATE_TIME_FORMAT)}
                />
              )}
              <InfoRow
                label={t('common:labels.watchTime')}
                value={formatDuration(getWatchTime(session))}
              />
              {session.pausedDurationMs > 0 && (
                <InfoRow
                  label={t('common:labels.pausedTime')}
                  value={formatDuration(session.pausedDurationMs)}
                />
              )}
              {session.totalDurationMs ? (
                <InfoRow
                  label={t('common:labels.mediaLength')}
                  value={formatDuration(session.totalDurationMs)}
                />
              ) : null}
            </View>
          </Section>

          <Section icon={MapPin} title={t('common:labels.location')}>
            <View className="gap-1.5">
              <InfoRow label={t('common:labels.ipAddress')} value={session.ipAddress || '-'} mono />
              {locationString ? (
                <View className="flex-row items-center gap-1">
                  <Globe size={14} color={colors.text.muted.dark} />
                  <Text className="text-foreground flex-1 text-[13px] font-medium">
                    {locationString}
                  </Text>
                </View>
              ) : null}
            </View>
          </Section>

          <Section icon={Smartphone} title={t('common:labels.device')}>
            <View className="gap-1.5">
              {session.platform ? (
                <InfoRow label={t('common:labels.platform')} value={session.platform} />
              ) : null}
              {session.product ? (
                <InfoRow label={t('common:labels.product')} value={session.product} />
              ) : null}
              {session.device ? (
                <InfoRow label={t('common:labels.device')} value={session.device} />
              ) : null}
              {session.playerName ? (
                <InfoRow label={t('common:labels.player')} value={session.playerName} />
              ) : null}
              {session.deviceId ? (
                <InfoRow label={t('common:labels.deviceId')} value={session.deviceId} mono />
              ) : null}
            </View>
          </Section>

          <Section
            icon={Gauge}
            title={t('common:labels.streamDetails')}
            badge={<QualityBadge session={session} />}
          >
            <StreamDetailsPanel
              sourceVideoCodec={session.sourceVideoCodec ?? null}
              sourceAudioCodec={session.sourceAudioCodec ?? null}
              sourceAudioChannels={session.sourceAudioChannels ?? null}
              sourceVideoWidth={session.sourceVideoWidth ?? null}
              sourceVideoHeight={session.sourceVideoHeight ?? null}
              streamVideoCodec={session.streamVideoCodec ?? null}
              streamAudioCodec={session.streamAudioCodec ?? null}
              sourceVideoDetails={session.sourceVideoDetails ?? null}
              sourceAudioDetails={session.sourceAudioDetails ?? null}
              streamVideoDetails={session.streamVideoDetails ?? null}
              streamAudioDetails={session.streamAudioDetails ?? null}
              transcodeInfo={session.transcodeInfo ?? null}
              subtitleInfo={session.subtitleInfo ?? null}
              videoDecision={session.videoDecision ?? null}
              audioDecision={session.audioDecision ?? null}
              bitrate={session.bitrate ?? null}
              serverType={session.server.type}
            />
          </Section>

          {/* Web shows the reasons in a tooltip on the transcode badge */}
          {session.isTranscode && hasTranscodeReason && (
            <View
              className="rounded-xl border p-3"
              style={{
                backgroundColor: withAlpha(colors.warning, '10'),
                borderColor: withAlpha(colors.warning, '30'),
              }}
            >
              <Text className="text-warning mb-1 text-[11px] font-semibold">
                {t('common:labels.transcodeReason')}
              </Text>
              <Text className="text-foreground text-xs font-medium">{transcodeReasonText}</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <TerminateSessionDialog
        visible={terminateModalVisible}
        onClose={() => setTerminateModalVisible(false)}
        sessionId={id}
        mediaTitle={title.primary}
        username={session.user.username}
        onTerminated={() => router.back()}
      />
    </>
  );
}
