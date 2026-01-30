/**
 * Compact card showing an active streaming session
 * Displays poster, title, user, progress bar, and play/pause status
 *
 * Responsive enhancements for tablets:
 * - Larger poster (80x120 vs 50x75)
 * - Quality badge (Direct Play/Direct Stream/Transcode)
 * - Device icon
 * - Location footer
 */
import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useImageUrl } from '@/hooks/useImageUrl';
import { useEstimatedProgress } from '@/hooks/useEstimatedProgress';
import { useResponsive } from '@/hooks/useResponsive';
import { ACCENT_COLOR, colors, spacing } from '@/lib/theme';
import { formatDuration } from '@/lib/formatters';
import type { ActiveSession } from '@tracearr/shared';

interface NowPlayingCardProps {
  session: ActiveSession;
  onPress?: (session: ActiveSession) => void;
}

/**
 * Get display title for media (handles TV shows vs movies)
 */
function getMediaDisplay(session: ActiveSession): { title: string; subtitle: string | null } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    // TV Show episode
    const episodeInfo =
      session.seasonNumber && session.episodeNumber
        ? `S${session.seasonNumber.toString().padStart(2, '0')} E${session.episodeNumber.toString().padStart(2, '0')}`
        : '';
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
 * Get quality decision label and color
 */
function getQualityInfo(session: ActiveSession): {
  label: string;
  color: string;
  bgColor: string;
} {
  const videoDecision = session.videoDecision?.toLowerCase();
  const audioDecision = session.audioDecision?.toLowerCase();

  // If either is transcoding, show as transcode
  if (videoDecision === 'transcode' || audioDecision === 'transcode') {
    return { label: 'Transcode', color: colors.warning, bgColor: 'rgba(245, 158, 11, 0.15)' };
  }
  // If video is direct play and audio is direct play or copy
  if (
    videoDecision === 'directplay' &&
    (audioDecision === 'directplay' || audioDecision === 'copy')
  ) {
    return { label: 'Direct Play', color: colors.success, bgColor: 'rgba(34, 197, 94, 0.15)' };
  }
  // Direct stream (video copy or direct stream)
  if (videoDecision === 'copy' || videoDecision === 'directstream') {
    return { label: 'Direct Stream', color: colors.info, bgColor: 'rgba(59, 130, 246, 0.15)' };
  }
  // Fallback based on isTranscode flag
  if (session.isTranscode) {
    return { label: 'Transcode', color: colors.warning, bgColor: 'rgba(245, 158, 11, 0.15)' };
  }
  return { label: 'Direct Play', color: colors.success, bgColor: 'rgba(34, 197, 94, 0.15)' };
}

/**
 * Get device icon based on device/product/platform info
 */
function getDeviceIcon(session: ActiveSession): keyof typeof Ionicons.glyphMap {
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
    return 'tv-outline';
  }
  // Tablets
  if (device.includes('ipad') || device.includes('tablet')) {
    return 'tablet-portrait-outline';
  }
  // Phones
  if (
    device.includes('iphone') ||
    device.includes('phone') ||
    device.includes('android') ||
    platform.includes('ios') ||
    platform.includes('android')
  ) {
    return 'phone-portrait-outline';
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
    return 'desktop-outline';
  }
  // Default
  return 'hardware-chip-outline';
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

export function NowPlayingCard({ session, onPress }: NowPlayingCardProps) {
  const getImageUrl = useImageUrl();
  const { isTablet, select } = useResponsive();
  const { title, subtitle } = getMediaDisplay(session);

  // Use estimated progress for smooth updates between SSE/poll events
  const { estimatedProgressMs, progressPercent } = useEstimatedProgress(session);

  // Responsive sizing
  const posterWidth = select({ base: 50, md: 70 });
  const posterHeight = select({ base: 75, md: 105 });
  const avatarSize = select({ base: 16, md: 20 });

  // Build poster URL using image proxy (request larger size for tablets)
  const posterUrl = getImageUrl({
    serverId: session.serverId,
    path: session.thumbPath,
    width: posterWidth * 2,
    height: posterHeight * 2,
  });

  const isPaused = session.state === 'paused';
  const username = session.user?.username ?? 'Unknown';
  const displayName = session.user?.identityName ?? username;
  const userThumbUrl = session.user?.thumbUrl || null;

  // Tablet-only info
  const qualityInfo = getQualityInfo(session);
  const deviceIcon = getDeviceIcon(session);
  const location = getLocationString(session);

  return (
    <Pressable
      className="bg-card mb-2 overflow-hidden rounded-xl"
      style={({ pressed }) => pressed && { opacity: 0.7 }}
      onPress={() => onPress?.(session)}
    >
      {/* Background with poster blur - matches web's blur-xl */}
      {posterUrl && (
        <Image
          source={{ uri: posterUrl }}
          style={[StyleSheet.absoluteFill, { opacity: 0.25 }]}
          blurRadius={40}
          resizeMode="cover"
        />
      )}

      {/* Main content row */}
      <View className="flex-row items-center px-2 py-1">
        {/* Poster */}
        <View className="relative" style={{ marginRight: isTablet ? spacing.md : spacing.sm }}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              className="bg-card rounded-lg"
              style={{ width: posterWidth, height: posterHeight }}
              resizeMode="cover"
            />
          ) : (
            <View
              className="bg-card items-center justify-center rounded-lg"
              style={{ width: posterWidth, height: posterHeight }}
            >
              <Ionicons name="film-outline" size={isTablet ? 28 : 24} color={colors.icon.default} />
            </View>
          )}
          {/* Paused overlay */}
          {isPaused && (
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center rounded-lg bg-black/60"
            >
              <Ionicons name="pause" size={isTablet ? 24 : 20} color={colors.text.primary.dark} />
            </View>
          )}
        </View>

        {/* Info section */}
        <View className="flex-1 justify-center gap-0.5">
          {/* Title row - with device icon on tablet */}
          <View className="flex-row items-center">
            <Text
              className={`flex-1 leading-4 font-semibold ${isTablet ? 'text-base leading-5' : 'text-sm'}`}
              numberOfLines={1}
            >
              {title}
            </Text>
            {isTablet && (
              <Ionicons
                name={deviceIcon}
                size={14}
                color={colors.text.muted.dark}
                style={{ marginLeft: 6 }}
              />
            )}
          </View>
          {subtitle && (
            <Text
              className={`text-muted-foreground ${isTablet ? 'text-sm' : 'text-xs'}`}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}

          {/* User + time row combined */}
          <View className="mt-0.5 flex-row items-center justify-between">
            <View className="flex-1 flex-row items-center gap-1">
              <UserAvatar thumbUrl={userThumbUrl} username={username} size={avatarSize} />
              <Text className="text-secondary-foreground text-xs" numberOfLines={1}>
                {displayName}
              </Text>
              {/* Show quality badge on tablet, just transcode icon on phone */}
              {isTablet ? (
                <View
                  className="ml-1 rounded px-1.5 py-0.5"
                  style={{ backgroundColor: qualityInfo.bgColor }}
                >
                  <Text className="text-[9px] font-semibold" style={{ color: qualityInfo.color }}>
                    {qualityInfo.label}
                  </Text>
                </View>
              ) : (
                session.isTranscode && <Ionicons name="flash" size={10} color={colors.warning} />
              )}
            </View>
            <View className="flex-row items-center gap-1">
              <View
                className="h-3 w-3 items-center justify-center rounded-full"
                style={{
                  backgroundColor: isPaused ? 'rgba(245, 158, 11, 0.15)' : `${ACCENT_COLOR}15`,
                }}
              >
                <Ionicons
                  name={isPaused ? 'pause' : 'play'}
                  size={6}
                  color={isPaused ? colors.warning : ACCENT_COLOR}
                />
              </View>
              <Text className={`text-muted-foreground text-xs ${isPaused ? 'text-warning' : ''}`}>
                {isPaused
                  ? 'Paused'
                  : `${formatDuration(estimatedProgressMs, { style: 'clock' })} / ${formatDuration(session.totalDurationMs, { style: 'clock' })}`}
              </Text>
            </View>
          </View>

          {/* Location footer - tablet only */}
          {isTablet && location && (
            <View className="mt-0.5 flex-row items-center gap-0.5">
              <Ionicons name="location-outline" size={10} color={colors.text.muted.dark} />
              <Text className="text-muted-foreground flex-1 text-[10px]" numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <View className="ml-1 opacity-50">
          <Ionicons name="chevron-forward" size={isTablet ? 18 : 16} color={colors.icon.default} />
        </View>
      </View>

      {/* Bottom progress bar - full width */}
      <View style={{ height: 3, backgroundColor: colors.surface.dark }}>
        <View
          style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: ACCENT_COLOR }}
        />
      </View>
    </Pressable>
  );
}
