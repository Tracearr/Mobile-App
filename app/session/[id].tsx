/**
 * Session detail screen
 * Shows comprehensive information about a specific session/stream
 * Matches the design of web/src/components/history/SessionDetailSheet.tsx
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { View, ScrollView, Pressable, ActivityIndicator, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, formatDistanceToNow } from 'date-fns';
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
  MonitorPlay,
  Repeat2,
  Eye,
  ChevronRight,
  X,
  Clapperboard,
} from 'lucide-react-native';
import { api, getServerUrl } from '@/lib/api';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useAuthStateStore } from '@/lib/authStateStore';
import { colors, withAlpha, ACCENT_COLOR } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { StreamDetailsPanel } from '@/components/session';
import type { SessionWithDetails, SessionState, MediaType, ServerType } from '@tracearr/shared';

// Server type configuration
const SERVER_CONFIG: Record<ServerType, { label: string; color: string }> = {
  plex: { label: 'Plex', color: '#E5A00D' },
  jellyfin: { label: 'Jellyfin', color: '#A855F7' },
  emby: { label: 'Emby', color: '#22C55E' },
};

// State configuration
const STATE_CONFIG: Record<SessionState, { icon: typeof Play; color: string; label: string }> = {
  playing: { icon: Play, color: colors.success, label: 'Playing' },
  paused: { icon: Pause, color: colors.warning, label: 'Paused' },
  stopped: { icon: Square, color: colors.text.muted.dark, label: 'Stopped' },
};

// Media type configuration
const MEDIA_CONFIG: Record<MediaType, { icon: typeof Film; label: string }> = {
  movie: { icon: Film, label: 'Movie' },
  episode: { icon: Tv, label: 'Episode' },
  track: { icon: Music, label: 'Track' },
  live: { icon: Radio, label: 'Live TV' },
  photo: { icon: ImageIcon, label: 'Photo' },
  trailer: { icon: Clapperboard, label: 'Trailer' },
  unknown: { icon: CircleHelp, label: 'Unknown' },
};

// Safe date parsing helper
function safeParseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Format duration
function formatDuration(ms: number | null): string {
  if (!ms) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

// Get watch time - for active sessions, calculate from elapsed time
function getWatchTime(session: SessionWithDetails): number | null {
  if (session.durationMs !== null) {
    return session.durationMs;
  }
  const startTime = safeParseDate(session.startedAt)?.getTime();
  if (!startTime) return null;
  const now = Date.now();
  const elapsedMs = now - startTime;
  const pausedMs = session.pausedDurationMs ?? 0;
  return Math.max(0, elapsedMs - pausedMs);
}

// Get progress percentage (playback position)
// Uses progressMs (where in the video) not durationMs (how long watched)
function getProgress(session: SessionWithDetails): number {
  if (!session.totalDurationMs || session.totalDurationMs === 0) return 0;
  const progress = session.progressMs ?? 0;
  return Math.min(100, Math.round((progress / session.totalDurationMs) * 100));
}

// Get media title formatted
function getMediaTitle(session: SessionWithDetails): { primary: string; secondary?: string } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    const epNum =
      session.seasonNumber && session.episodeNumber
        ? `S${session.seasonNumber.toString().padStart(2, '0')} E${session.episodeNumber.toString().padStart(2, '0')}`
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
    <View className="border-border rounded-xl border p-2">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="bg-primary/15 h-6 w-6 items-center justify-center rounded-full">
            <Icon size={14} color={ACCENT_COLOR} />
          </View>
          <Text className="text-foreground text-sm font-medium">{title}</Text>
        </View>
        {badge}
      </View>
      {children}
    </View>
  );
}

// Info row component
function InfoRow({
  label,
  value,
  valueColor,
  subValue,
  mono,
}: {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
  mono?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-muted-foreground text-[13px]">{label}</Text>
      <View className="flex-1 flex-row items-center justify-end gap-1">
        <Text
          className={`text-foreground text-[13px] ${mono ? 'font-mono text-[11px]' : ''}`}
          style={valueColor ? { color: valueColor } : undefined}
          numberOfLines={1}
        >
          {value}
        </Text>
        {subValue && <Text className="text-muted-foreground text-[11px]">{subValue}</Text>}
      </View>
    </View>
  );
}

export default function SessionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedServerId } = useMediaServer();
  const connectionState = useAuthStateStore((s) => s.connectionState);
  const isOffline = connectionState !== 'connected';
  const serverUrl = getServerUrl();

  // Terminate session mutation
  const terminateMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      api.sessions.terminate(sessionId, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', 'active'] });
      Alert.alert('Stream Terminated', 'The playback session has been stopped.');
      router.back();
    },
    onError: (error: Error) => {
      Alert.alert('Failed to Terminate', error.message);
    },
  });

  const handleTerminate = () => {
    Alert.prompt(
      'Terminate Stream',
      'Enter an optional message to show the user (leave empty to skip):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: (reason: string | undefined) => {
            terminateMutation.mutate({ sessionId: id, reason: reason?.trim() || undefined });
          },
        },
      ],
      'plain-text',
      '',
      'default'
    );
  };

  const {
    data: session,
    isLoading,
    error,
  } = useQuery<SessionWithDetails>({
    queryKey: ['session', id, selectedServerId],
    queryFn: () => api.sessions.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#09090B',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        edges={['left', 'right', 'bottom']}
      >
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </SafeAreaView>
    );
  }

  if (error || !session) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#09090B',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
        edges={['left', 'right', 'bottom']}
      >
        <Text className="text-destructive text-center">
          {error instanceof Error ? error.message : 'Failed to load session'}
        </Text>
      </SafeAreaView>
    );
  }

  const serverConfig = SERVER_CONFIG[session.server.type];
  const stateConfig = STATE_CONFIG[session.state];
  const mediaConfig = MEDIA_CONFIG[session.mediaType];
  const MediaIcon = mediaConfig.icon;
  const StateIcon = stateConfig.icon;
  const title = getMediaTitle(session);
  const progress = getProgress(session);

  // Get poster URL
  const posterUrl =
    session.thumbPath && serverUrl
      ? `${serverUrl}/api/v1/images/proxy?server=${session.serverId}&url=${encodeURIComponent(session.thumbPath)}&width=120&height=180&fallback=poster`
      : null;

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

  // Format dates safely
  const startedAt = safeParseDate(session.startedAt);
  const stoppedAt = safeParseDate(session.stoppedAt);

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#09090B' }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView style={{ flex: 1 }} contentContainerClassName="gap-2 p-3">
        {/* Header with state badge and terminate button */}
        <View className="flex-row items-center justify-between pb-2">
          <View className="flex-1 flex-row items-center gap-2">
            <StateIcon size={16} color={stateConfig.color} />
            <Text className="text-foreground text-base font-semibold">Session Details</Text>
            <Badge
              variant={
                session.state === 'playing'
                  ? 'success'
                  : session.state === 'paused'
                    ? 'warning'
                    : 'secondary'
              }
            >
              {stateConfig.label}
            </Badge>
          </View>
          {session.state !== 'stopped' && (
            <Pressable
              onPress={handleTerminate}
              disabled={terminateMutation.isPending || isOffline}
              className={`h-8 w-8 items-center justify-center rounded-full ${terminateMutation.isPending || isOffline ? 'opacity-50' : ''}`}
              style={{ backgroundColor: withAlpha(colors.error, '15') }}
            >
              <X size={18} color={colors.error} />
            </Pressable>
          )}
        </View>

        {/* Media Info - Hero section */}
        <View className="border-border flex-row gap-2 rounded-xl border p-2">
          {posterUrl && (
            <Image
              source={{ uri: posterUrl }}
              className="bg-surface rounded-lg"
              style={{ width: 56, height: 80 }}
              resizeMode="cover"
            />
          )}
          <View className="min-w-0 flex-1">
            <View className="mb-1 flex-row items-center gap-1">
              <MediaIcon size={12} color={colors.text.muted.dark} />
              <Text className="text-muted-foreground text-[11px]">{mediaConfig.label}</Text>
              {session.year && (
                <Text className="text-muted-foreground text-[11px]">· {session.year}</Text>
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <Text className="text-foreground flex-1 text-[15px] font-medium" numberOfLines={2}>
                {title.primary}
              </Text>
              {session.watched && <Eye size={14} color={colors.success} />}
            </View>
            {title.secondary && (
              <Text className="text-muted-foreground mt-0.5 text-[13px]" numberOfLines={1}>
                {title.secondary}
              </Text>
            )}
            {/* Progress inline */}
            <View className="mt-2 flex-row items-center gap-2">
              <View className="bg-border h-1.5 flex-1 overflow-hidden rounded-sm">
                <View className="bg-primary h-full rounded-sm" style={{ width: `${progress}%` }} />
              </View>
              <Text className="text-muted-foreground w-8 text-[11px]">{progress}%</Text>
            </View>
          </View>
        </View>

        {/* User - Tappable */}
        <Pressable
          className="border-border flex-row items-center gap-2 rounded-xl border p-2"
          onPress={() => router.push(`/user/${session.serverUserId}` as never)}
        >
          <UserAvatar thumbUrl={session.user.thumbUrl} username={session.user.username} size={36} />
          <View className="min-w-0 flex-1">
            <Text className="text-foreground text-[15px] font-medium" numberOfLines={1}>
              {session.user.identityName ?? session.user.username}
            </Text>
            {session.user.identityName && session.user.identityName !== session.user.username && (
              <Text className="text-muted-foreground text-xs">@{session.user.username}</Text>
            )}
            {!session.user.identityName && (
              <Text className="text-muted-foreground text-xs">View profile</Text>
            )}
          </View>
          <ChevronRight size={16} color={colors.text.muted.dark} />
        </Pressable>

        {/* Server */}
        <Section icon={Server} title="Server">
          <View className="flex-row items-center justify-between">
            <Text className="text-muted-foreground text-[13px]">Server</Text>
            <View className="flex-row items-center gap-1">
              <Text className="text-[13px] font-medium" style={{ color: serverConfig.color }}>
                {serverConfig.label}
              </Text>
              <Text className="text-muted-foreground text-[13px]">·</Text>
              <Text className="text-foreground text-[13px]">{session.server.name}</Text>
            </View>
          </View>
        </Section>

        {/* Playback Info */}
        <Section
          icon={Clock}
          title="Playback"
          badge={
            session.segmentCount && session.segmentCount > 1 ? (
              <Badge variant="outline">{session.segmentCount} segments</Badge>
            ) : null
          }
        >
          <View className="gap-1">
            {startedAt && (
              <InfoRow
                label="Started"
                value={format(startedAt, 'MMM d, h:mm a')}
                subValue={formatDistanceToNow(startedAt, { addSuffix: true })}
              />
            )}
            {stoppedAt && <InfoRow label="Stopped" value={format(stoppedAt, 'MMM d, h:mm a')} />}
            <InfoRow label="Watch time" value={formatDuration(getWatchTime(session))} />
            {session.pausedDurationMs > 0 && (
              <InfoRow label="Paused" value={formatDuration(session.pausedDurationMs)} />
            )}
            {session.totalDurationMs && (
              <InfoRow label="Media length" value={formatDuration(session.totalDurationMs)} />
            )}
          </View>
        </Section>

        {/* Location & Network */}
        <Section icon={MapPin} title="Location">
          <View className="gap-1">
            <InfoRow label="IP Address" value={session.ipAddress || '—'} mono />
            {locationString && (
              <View className="flex-row items-center gap-1">
                <Globe size={14} color={colors.text.muted.dark} />
                <Text className="text-foreground flex-1 text-[13px]">{locationString}</Text>
              </View>
            )}
          </View>
        </Section>

        {/* Device */}
        <Section icon={Smartphone} title="Device">
          <View className="gap-1">
            {session.platform && <InfoRow label="Platform" value={session.platform} />}
            {session.product && <InfoRow label="Product" value={session.product} />}
            {session.device && <InfoRow label="Device" value={session.device} />}
            {session.playerName && <InfoRow label="Player" value={session.playerName} />}
            {session.deviceId && <InfoRow label="Device ID" value={session.deviceId} mono />}
          </View>
        </Section>

        {/* Stream Details */}
        <Section
          icon={Gauge}
          title="Stream Details"
          badge={
            <Badge variant={session.isTranscode ? 'warning' : 'secondary'}>
              <View className="flex-row items-center gap-1">
                {session.isTranscode ? (
                  <>
                    <Repeat2 size={12} color={colors.warning} />
                    <Text className="text-warning text-[11px] font-semibold">Transcode</Text>
                  </>
                ) : session.videoDecision === 'copy' || session.audioDecision === 'copy' ? (
                  <>
                    <MonitorPlay size={12} color={colors.text.primary.dark} />
                    <Text className="text-foreground text-[11px] font-semibold">Direct Stream</Text>
                  </>
                ) : (
                  <>
                    <MonitorPlay size={12} color={colors.text.primary.dark} />
                    <Text className="text-foreground text-[11px] font-semibold">Direct Play</Text>
                  </>
                )}
              </View>
            </Badge>
          }
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

        {/* Transcode reason tooltip equivalent */}
        {session.isTranscode && hasTranscodeReason && (
          <View
            className="rounded-xl border p-2"
            style={{
              backgroundColor: withAlpha(colors.warning, '10'),
              borderColor: withAlpha(colors.warning, '30'),
            }}
          >
            <Text className="text-warning mb-1 text-[11px] font-semibold">Transcode Reason</Text>
            <Text className="text-foreground text-xs">{transcodeReasonText}</Text>
          </View>
        )}

        {/* Bottom padding */}
        <View className="h-6" />
      </ScrollView>
    </SafeAreaView>
  );
}
