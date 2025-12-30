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
import { useAuthStore } from '@/lib/authStore';
import { useEstimatedProgress } from '@/hooks/useEstimatedProgress';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
import type { ActiveSession } from '@tracearr/shared';

interface NowPlayingCardProps {
  session: ActiveSession;
  onPress?: (session: ActiveSession) => void;
}

/**
 * Format duration in ms to readable string (HH:MM:SS or MM:SS)
 */
function formatDuration(ms: number | null): string {
  if (!ms) return '--:--';
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get display title for media (handles TV shows vs movies)
 */
function getMediaDisplay(session: ActiveSession): { title: string; subtitle: string | null } {
  if (session.mediaType === 'episode' && session.grandparentTitle) {
    // TV Show episode
    const episodeInfo =
      session.seasonNumber && session.episodeNumber
        ? `S${session.seasonNumber.toString().padStart(2, '0')}E${session.episodeNumber.toString().padStart(2, '0')}`
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
  if (videoDecision === 'directplay' && (audioDecision === 'directplay' || audioDecision === 'copy')) {
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
  const { serverUrl } = useAuthStore();
  const { isTablet, select } = useResponsive();
  const { title, subtitle } = getMediaDisplay(session);

  // Use estimated progress for smooth updates between SSE/poll events
  const { estimatedProgressMs, progressPercent } = useEstimatedProgress(session);

  // Responsive sizing
  const posterWidth = select({ base: 50, md: 70 });
  const posterHeight = select({ base: 75, md: 105 });
  const avatarSize = select({ base: 16, md: 20 });

  // Build poster URL using image proxy (request larger size for tablets)
  const posterUrl =
    serverUrl && session.thumbPath
      ? `${serverUrl}/api/v1/images/proxy?server=${session.serverId}&url=${encodeURIComponent(session.thumbPath)}&width=${posterWidth * 2}&height=${posterHeight * 2}`
      : null;

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
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress?.(session)}
    >
      {/* Main content row */}
      <View style={styles.contentRow}>
        {/* Poster */}
        <View style={[styles.posterContainer, { marginRight: isTablet ? spacing.md : spacing.sm }]}>
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={[styles.poster, { width: posterWidth, height: posterHeight }]}
              resizeMode="cover"
            />
          ) : (
            <View
              style={[
                styles.poster,
                styles.posterPlaceholder,
                { width: posterWidth, height: posterHeight },
              ]}
            >
              <Ionicons name="film-outline" size={isTablet ? 28 : 24} color={colors.text.muted.dark} />
            </View>
          )}
          {/* Paused overlay */}
          {isPaused && (
            <View style={styles.pausedOverlay}>
              <Ionicons name="pause" size={isTablet ? 24 : 20} color={colors.text.primary.dark} />
            </View>
          )}
        </View>

        {/* Info section */}
        <View style={styles.info}>
          {/* Title row - with device icon on tablet */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, isTablet && styles.titleTablet]} numberOfLines={1}>
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
            <Text style={[styles.subtitle, isTablet && styles.subtitleTablet]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}

          {/* User + time row combined */}
          <View style={styles.userTimeRow}>
            <View style={styles.userSection}>
              <UserAvatar thumbUrl={userThumbUrl} username={username} size={avatarSize} />
              <Text style={styles.username} numberOfLines={1}>
                {displayName}
              </Text>
              {/* Show quality badge on tablet, just transcode icon on phone */}
              {isTablet ? (
                <View
                  style={[styles.qualityBadge, { backgroundColor: qualityInfo.bgColor }]}
                >
                  <Text style={[styles.qualityText, { color: qualityInfo.color }]}>
                    {qualityInfo.label}
                  </Text>
                </View>
              ) : (
                session.isTranscode && <Ionicons name="flash" size={10} color={colors.warning} />
              )}
            </View>
            <View style={styles.timeSection}>
              <View style={[styles.statusDot, isPaused && styles.statusDotPaused]}>
                <Ionicons
                  name={isPaused ? 'pause' : 'play'}
                  size={6}
                  color={isPaused ? colors.warning : colors.cyan.core}
                />
              </View>
              <Text style={[styles.timeText, isPaused && styles.pausedText]}>
                {isPaused
                  ? 'Paused'
                  : `${formatDuration(estimatedProgressMs)} / ${formatDuration(session.totalDurationMs)}`}
              </Text>
            </View>
          </View>

          {/* Location footer - tablet only */}
          {isTablet && location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={10} color={colors.text.muted.dark} />
              <Text style={styles.locationText} numberOfLines={1}>
                {location}
              </Text>
            </View>
          )}
        </View>

        {/* Chevron */}
        <View style={styles.chevron}>
          <Ionicons name="chevron-forward" size={isTablet ? 18 : 16} color={colors.text.muted.dark} />
        </View>
      </View>

      {/* Bottom progress bar - full width */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  posterContainer: {
    position: 'relative',
  },
  poster: {
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.dark,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pausedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary.dark,
    lineHeight: 16,
    flex: 1,
  },
  titleTablet: {
    fontSize: typography.fontSize.base,
    lineHeight: 20,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
  },
  subtitleTablet: {
    fontSize: typography.fontSize.sm,
  },
  userTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  username: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary.dark,
  },
  qualityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 4,
  },
  qualityText: {
    fontSize: 9,
    fontWeight: '600',
  },
  timeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(24, 209, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDotPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
  },
  pausedText: {
    color: colors.warning,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  locationText: {
    fontSize: 10,
    color: colors.text.muted.dark,
    flex: 1,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surface.dark,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan.core,
  },
  chevron: {
    marginLeft: 4,
    opacity: 0.5,
  },
});
