/**
 * Compact card showing an active streaming session
 * Displays poster, title, user, playback badge, progress bar and play/pause
 * status, plus a terminate button when the session allows it.
 *
 * Responsive enhancements for tablets:
 * - Larger poster (65x95 vs 50x70)
 * - Device icon
 * - Location footer
 */
import React, { useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import {
  ChevronRight,
  Cpu,
  Film,
  MapPin,
  Monitor,
  Pause,
  Smartphone,
  Tablet,
  Tv,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ServerTag } from '@/components/server/ServerTag';
import { useImageUrl } from '@/hooks/useImageUrl';
import { useEstimatedProgress } from '@/hooks/useEstimatedProgress';
import { useResponsive } from '@/hooks/useResponsive';
import { useAuthStateStore } from '@/lib/authStateStore';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors, spacing, withAlpha } from '@/lib/theme';
import { formatDuration } from '@/lib/formatters';
import { formatEpisodeLabel, type ActiveSession } from '@tracearr/shared';
import { QualityBadge } from './QualityBadge';
import { TerminateSessionDialog } from './TerminateSessionDialog';

const TERMINATE_BUTTON_SIZE = 24;

interface NowPlayingCardProps {
  session: ActiveSession;
  onPress?: (session: ActiveSession) => void;
  isMultiServer?: boolean;
  serverColor?: string | null;
}

/**
 * Get display title for media (handles TV shows vs movies)
 */
function getMediaDisplay(session: ActiveSession): { title: string; subtitle: string | null } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    // TV Show episode
    const episodeInfo =
      formatEpisodeLabel(session.seasonNumber, session.episodeNumber, { spaced: true }) ?? '';
    return {
      title: session.grandparentTitle,
      subtitle: episodeInfo ? `${episodeInfo} · ${session.mediaTitle}` : session.mediaTitle,
    };
  }
  // Movie or music
  return {
    title: session.mediaTitle,
    subtitle: session.year ? `${session.year}` : null,
  };
}

/**
 * Get device icon based on device/product/platform info
 */
function getDeviceIcon(session: ActiveSession): LucideIcon {
  const device = session.device?.toLowerCase() || '';
  const product = session.product?.toLowerCase() || '';
  const platform = session.platform?.toLowerCase() || '';

  // TV devices
  if (
    device.includes('tv') ||
    product.includes('tv') ||
    platform.includes('tv') ||
    product.includes('roku') ||
    product.includes('firetv') ||
    product.includes('fire tv') ||
    product.includes('chromecast') ||
    product.includes('apple tv') ||
    product.includes('android tv')
  ) {
    return Tv;
  }
  // Tablets
  if (device.includes('ipad') || device.includes('tablet')) {
    return Tablet;
  }
  // Phones
  if (
    device.includes('iphone') ||
    device.includes('phone') ||
    device.includes('android') ||
    platform.includes('ios') ||
    platform.includes('android')
  ) {
    return Smartphone;
  }
  // Desktop/Web
  if (
    product.includes('web') ||
    product.includes('plex for windows') ||
    product.includes('plex for mac') ||
    product.includes('plex for linux') ||
    platform.includes('windows') ||
    platform.includes('macos') ||
    platform.includes('linux')
  ) {
    return Monitor;
  }
  // Default
  return Cpu;
}

/**
 * Get location string from session
 */
function getLocationString(session: ActiveSession): string | null {
  if (session.geoCity && session.geoCountry) {
    return `${session.geoCity}, ${session.geoCountry}`;
  }
  if (session.geoCountry) {
    return session.geoCountry;
  }
  if (session.geoCity) {
    return session.geoCity;
  }
  return null;
}

export function NowPlayingCard({
  session,
  onPress,
  isMultiServer,
  serverColor,
}: NowPlayingCardProps) {
  const { t } = useTranslation(['common', 'pages']);
  const getImageUrl = useImageUrl();
  const { isTablet, select } = useResponsive();
  const { title, subtitle } = getMediaDisplay(session);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const isOffline = useAuthStateStore((s) => s.connectionState !== 'connected');

  // Use estimated progress for smooth updates between SSE/poll events
  const { estimatedProgressMs, progressPercent } = useEstimatedProgress(session);

  // Responsive sizing
  const posterWidth = select({ compact: 50, medium: 65 });
  const posterHeight = select({ compact: 70, medium: 95 });
  const avatarSize = select({ compact: 16, medium: 20 });

  // Build poster URL using image proxy (request larger size for tablets)
  const posterUrl = getImageUrl({
    serverId: session.serverId,
    path: session.thumbPath,
    width: posterWidth * 2,
    height: posterHeight * 2,
  });

  const isPaused = session.state === 'paused';
  const username = session.user?.username ?? t('common:labels.unknown');
  const displayName = session.user?.identityName ?? username;
  const userThumbUrl = session.user?.thumbUrl || null;

  const DeviceIcon = getDeviceIcon(session);
  const location = getLocationString(session);

  return (
    <Card padding="none" className="mb-2 overflow-hidden">
      {/* Background with poster blur - matches web's blur-xl */}
      {posterUrl && (
        <Image
          source={{ uri: posterUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.25 }]}
          blurRadius={40}
          contentFit="cover"
        />
      )}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
        onPress={() => onPress?.(session)}
      >
        {/* Main content row */}
        <View className="flex-row p-2.5" style={{ gap: isTablet ? spacing.md : spacing.sm }}>
          {/* Poster */}
          <View className="relative">
            {posterUrl ? (
              <Image
                source={{ uri: posterUrl }}
                className="bg-card rounded-lg"
                style={{ width: posterWidth, height: posterHeight }}
                contentFit="cover"
              />
            ) : (
              <View
                className="bg-surface items-center justify-center rounded-lg"
                style={{ width: posterWidth, height: posterHeight }}
              >
                <Film size={isTablet ? 28 : 24} color={colors.icon.default} />
              </View>
            )}
            {/* Play/Pause overlay on poster - like web */}
            {isPaused && (
              <View
                style={StyleSheet.absoluteFill}
                className="items-center justify-center rounded-lg bg-black/60"
              >
                <Pause size={isTablet ? 24 : 20} color={colors.text.primary.dark} />
              </View>
            )}
          </View>

          {/* Info section: groups spaced apart, tight within */}
          <View className="flex-1" style={{ gap: isTablet ? 10 : 6 }}>
            {/* Title block */}
            <View>
              <View
                className="flex-row items-center gap-1.5"
                style={{
                  paddingRight: session.canTerminate ? TERMINATE_BUTTON_SIZE + 6 : 0,
                }}
              >
                <Text
                  className={`flex-1 font-semibold ${isTablet ? 'text-base leading-5' : 'text-sm leading-4'}`}
                  numberOfLines={1}
                >
                  {title}
                </Text>
                <QualityBadge session={session} iconOnly />
                {isTablet && (
                  <View className="bg-muted h-6 w-6 items-center justify-center rounded-md">
                    <DeviceIcon size={14} color={colors.text.muted.dark} />
                  </View>
                )}
              </View>
              {subtitle && (
                <Text
                  className={`text-muted-foreground mt-px ${isTablet ? 'text-sm' : 'text-xs'}`}
                  numberOfLines={1}
                >
                  {subtitle}
                </Text>
              )}
            </View>

            {/* User row */}
            <View className="flex-row items-center gap-1">
              <UserAvatar
                thumbUrl={userThumbUrl}
                serverId={session.serverId}
                username={username}
                size={avatarSize}
              />
              <Text className="text-secondary-foreground flex-1 text-xs" numberOfLines={1}>
                {displayName}
              </Text>
              <ChevronRight
                size={isTablet ? 16 : 14}
                color={colors.icon.default}
                style={{ opacity: 0.4 }}
              />
            </View>

            {/* Footer - server name (multi-server) and/or location */}
            {(isMultiServer || (isTablet && location)) && (
              <View className="flex-row items-center gap-1">
                {isMultiServer && <ServerTag name={session.server.name} color={serverColor} />}
                {isMultiServer && location && (
                  <Text className="text-muted-foreground text-[10px]">·</Text>
                )}
                {location && (
                  <View className="flex-row items-center gap-0.5" style={{ flexShrink: 1 }}>
                    <MapPin size={9} color={colors.text.muted.dark} />
                    <Text className="text-muted-foreground text-[10px]" numberOfLines={1}>
                      {location}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </View>

        {/* Progress bar with time labels - like web */}
        <View className="px-2.5 pb-2">
          <View className="bg-surface h-1 rounded-full">
            <View
              className="rounded-full"
              style={{
                height: '100%',
                width: `${progressPercent}%`,
                backgroundColor: isMultiServer && serverColor ? serverColor : ACCENT_COLOR,
              }}
            />
          </View>
          <View className="mt-0.5 flex-row justify-between">
            <Text className="text-muted-foreground text-[10px]">
              {formatDuration(estimatedProgressMs, { style: 'clock' })}
            </Text>
            {isPaused ? (
              <Text className="text-warning text-[10px] font-medium">
                {t('common:playback.paused')}
              </Text>
            ) : (
              <Text className="text-muted-foreground text-[10px]">
                {session.totalDurationMs && estimatedProgressMs
                  ? `-${formatDuration(session.totalDurationMs - estimatedProgressMs, { style: 'clock' })}`
                  : formatDuration(session.totalDurationMs, { style: 'clock' })}
              </Text>
            )}
          </View>
        </View>
      </Pressable>

      {/* A sibling of the card's Pressable: VoiceOver cannot reach a button nested in another. */}
      {session.canTerminate && (
        <>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('pages:terminateStream.title')}
            accessibilityState={{ disabled: isOffline }}
            disabled={isOffline}
            hitSlop={10}
            onPress={() => {
              haptics.warning();
              setTerminateOpen(true);
            }}
            className={`absolute top-2.5 right-2.5 items-center justify-center rounded-full ${isOffline ? 'opacity-50' : ''}`}
            style={{
              width: TERMINATE_BUTTON_SIZE,
              height: TERMINATE_BUTTON_SIZE,
              backgroundColor: withAlpha(colors.error, '15'),
            }}
          >
            <X size={14} color={colors.error} />
          </Pressable>
          <TerminateSessionDialog
            visible={terminateOpen}
            onClose={() => setTerminateOpen(false)}
            sessionId={session.id}
            mediaTitle={title}
            username={username}
          />
        </>
      )}
    </Card>
  );
}
