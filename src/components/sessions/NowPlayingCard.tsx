/**
 * Compact card showing an active streaming session
 * Displays poster, title, user, progress bar, and play/pause status
 */
import React from 'react';
import { View, Image, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useAuthStore } from '@/lib/authStore';
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

export function NowPlayingCard({ session, onPress }: NowPlayingCardProps) {
  const { serverUrl } = useAuthStore();
  const { title, subtitle } = getMediaDisplay(session);

  // Calculate progress percentage
  const progress =
    session.progressMs && session.totalDurationMs
      ? Math.min((session.progressMs / session.totalDurationMs) * 100, 100)
      : 0;

  // Build poster URL using image proxy
  const posterUrl =
    serverUrl && session.thumbPath
      ? `${serverUrl}/api/v1/images/proxy?server=${session.serverId}&url=${encodeURIComponent(session.thumbPath)}&width=80&height=120`
      : null;

  const isPaused = session.state === 'paused';
  const username = session.user?.username || 'Unknown';
  const userThumbUrl = session.user?.thumbUrl || null;

  return (
    <Pressable
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
      onPress={() => onPress?.(session)}
    >
      {/* Poster */}
      <View style={styles.posterContainer}>
        {posterUrl ? (
          <Image source={{ uri: posterUrl }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]}>
            <Ionicons name="film-outline" size={24} color={colors.text.muted.dark} />
          </View>
        )}
        {/* Play/Pause overlay */}
        <View style={[styles.statusOverlay, isPaused && styles.statusOverlayVisible]}>
          <Ionicons
            name={isPaused ? 'pause' : 'play'}
            size={20}
            color="#FFFFFF"
          />
        </View>
      </View>

      {/* Info section */}
      <View style={styles.info}>
        {/* Top: Title and status */}
        <View style={styles.titleRow}>
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {subtitle && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            )}
          </View>
          {/* Status indicator */}
          <View style={[styles.statusBadge, isPaused && styles.statusBadgePaused]}>
            <Ionicons
              name={isPaused ? 'pause' : 'play'}
              size={10}
              color={isPaused ? colors.warning : colors.cyan.core}
            />
          </View>
        </View>

        {/* Middle: User */}
        <View style={styles.userRow}>
          <UserAvatar thumbUrl={userThumbUrl} username={username} size={18} />
          <Text style={styles.username} numberOfLines={1}>
            {username}
          </Text>
          {session.isTranscode && (
            <View style={styles.transcodeBadge}>
              <Ionicons name="flash" size={10} color={colors.warning} />
            </View>
          )}
        </View>

        {/* Bottom: Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatDuration(session.progressMs)}</Text>
            <Text style={styles.timeText}>
              {isPaused ? (
                <Text style={styles.pausedText}>Paused</Text>
              ) : (
                formatDuration(session.totalDurationMs)
              )}
            </Text>
          </View>
        </View>
      </View>

      {/* Chevron */}
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color={colors.text.muted.dark} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  pressed: {
    opacity: 0.7,
  },
  posterContainer: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  poster: {
    width: 50,
    height: 75,
    borderRadius: borderRadius.md,
    backgroundColor: colors.surface.dark,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  statusOverlayVisible: {
    opacity: 1,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
    height: 75,
    paddingVertical: 2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing.xs,
  },
  title: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary.dark,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    marginTop: 1,
  },
  statusBadge: {
    width: 18,
    height: 18,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(24, 209, 231, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBadgePaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  username: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary.dark,
    flex: 1,
  },
  transcodeBadge: {
    marginLeft: 4,
  },
  progressSection: {
    gap: 3,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.cyan.core,
    borderRadius: borderRadius.full,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeText: {
    fontSize: 10,
    color: colors.text.muted.dark,
  },
  pausedText: {
    color: colors.warning,
    fontWeight: '500',
  },
  chevron: {
    marginLeft: spacing.xs,
    opacity: 0.5,
  },
});
