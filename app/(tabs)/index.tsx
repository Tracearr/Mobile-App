/**
 * Dashboard tab - overview of streaming activity
 */
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

function StatCard({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={styles.statValue}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const { serverName } = useAuthStore();

  const {
    data: stats,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.stats.dashboard,
  });

  const {
    data: activeSessions,
  } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: api.sessions.active,
  });

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.cyan.core}
          />
        }
      >
        {/* Server Name Header */}
        <View style={styles.header}>
          <Text style={styles.serverName}>{serverName || 'Tracearr'}</Text>
          <Text style={styles.headerSubtitle}>Stream Monitor</Text>
        </View>

        {/* Active Streams */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Now Playing</Text>
          <View style={styles.nowPlayingContainer}>
            {activeSessions && activeSessions.length > 0 ? (
              <View style={styles.activeCount}>
                <Text style={styles.activeCountNumber}>{activeSessions.length}</Text>
                <Text style={styles.activeCountLabel}>Active {activeSessions.length === 1 ? 'Stream' : 'Streams'}</Text>
              </View>
            ) : (
              <View style={styles.noStreams}>
                <Text style={styles.noStreamsText}>No active streams</Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats Grid */}
        {stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today</Text>
            <View style={styles.statsGrid}>
              <StatCard
                title="Active Streams"
                value={stats.activeStreams}
              />
              <StatCard
                title="Plays Today"
                value={stats.todayPlays}
              />
              <StatCard
                title="Watch Time"
                value={stats.watchTimeHours}
                subtitle="hours"
              />
              <StatCard
                title="Alerts (24h)"
                value={stats.alertsLast24h}
              />
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Alerts Today</Text>
              <Text style={[styles.activityValue, { color: stats?.alertsLast24h ? colors.error : colors.success }]}>
                {stats?.alertsLast24h || 0}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.activityRow}>
              <Text style={styles.activityLabel}>Plays Today</Text>
              <Text style={styles.activityValue}>{stats?.todayPlays || 0}</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  serverName: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary.dark,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
    marginTop: spacing.xs,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  nowPlayingContainer: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  activeCount: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  activeCountNumber: {
    fontSize: typography.fontSize['4xl'],
    fontWeight: 'bold',
    color: colors.cyan.core,
  },
  activeCountLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary.dark,
    marginTop: spacing.xs,
  },
  noStreams: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  noStreamsText: {
    fontSize: typography.fontSize.base,
    color: colors.text.muted.dark,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
  },
  statCard: {
    width: '50%',
    padding: spacing.xs,
  },
  statTitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.dark,
    overflow: 'hidden',
  },
  statValue: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary.dark,
    marginTop: spacing.xs,
  },
  statSubtitle: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    marginTop: 2,
  },
  activityCard: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  activityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  activityLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary.dark,
  },
  activityValue: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.dark,
    marginVertical: spacing.xs,
  },
});
