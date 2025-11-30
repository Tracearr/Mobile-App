/**
 * Activity tab - active sessions and history
 */
import { View, Text, StyleSheet, ScrollView, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
import type { ActiveSession } from '@tracearr/shared';

function SessionCard({ session }: { session: ActiveSession }) {
  const progressPercent = session.progressMs && session.totalDurationMs
    ? Math.round((session.progressMs / session.totalDurationMs) * 100)
    : 0;

  return (
    <View style={styles.sessionCard}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionUser}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {session.user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text style={styles.username}>{session.user.username}</Text>
            <Text style={styles.device}>{session.playerName || session.platform || 'Unknown Device'}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, session.isTranscode ? styles.transcodeBadge : styles.directBadge]}>
          <Text style={styles.statusText}>
            {session.isTranscode ? 'Transcode' : 'Direct'}
          </Text>
        </View>
      </View>

      <View style={styles.mediaInfo}>
        <Text style={styles.mediaTitle} numberOfLines={1}>
          {session.mediaTitle || 'Unknown Media'}
        </Text>
        {session.grandparentTitle && (
          <Text style={styles.mediaSubtitle} numberOfLines={1}>
            {session.grandparentTitle}
            {session.seasonNumber !== null && ` • S${session.seasonNumber}E${session.episodeNumber}`}
          </Text>
        )}
      </View>

      <View style={styles.sessionFooter}>
        <Text style={styles.locationText}>
          {session.geoCity || session.ipAddress || 'Unknown Location'}
        </Text>
        <Text style={styles.progressText}>
          {progressPercent}%
        </Text>
      </View>
    </View>
  );
}

export default function ActivityScreen() {
  const {
    data: activeSessions,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: api.sessions.active,
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={activeSessions || []}
        keyExtractor={(item) => item.sessionKey || item.id}
        renderItem={({ item }) => <SessionCard session={item} />}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.cyan.core}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Active Streams</Text>
            <Text style={styles.headerCount}>
              {activeSessions?.length || 0} {(activeSessions?.length || 0) === 1 ? 'stream' : 'streams'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyTitle}>No Active Streams</Text>
            <Text style={styles.emptySubtitle}>
              When users start streaming, they&apos;ll appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  headerCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
  },
  sessionCard: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sessionUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.cyan.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: typography.fontSize.lg,
    fontWeight: 'bold',
    color: colors.text.primary.dark,
  },
  username: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  device: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  directBadge: {
    backgroundColor: colors.success + '20',
  },
  transcodeBadge: {
    backgroundColor: colors.warning + '20',
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '500',
    color: colors.text.primary.dark,
  },
  mediaInfo: {
    marginBottom: spacing.sm,
  },
  mediaTitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary.dark,
  },
  mediaSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
    marginTop: 2,
  },
  sessionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  locationText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
  },
  progressText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.cyan.core,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
    textAlign: 'center',
  },
});
