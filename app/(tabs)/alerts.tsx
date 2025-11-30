/**
 * Alerts tab - violations and alerts
 */
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
import type { ViolationWithDetails } from '@tracearr/shared';

function SeverityBadge({ severity }: { severity: string }) {
  const severityColors: Record<string, string> = {
    low: colors.info,
    warning: colors.warning,
    high: colors.error,
    critical: colors.error,
  };
  const color = severityColors[severity] || colors.text.muted.dark;

  return (
    <View style={[styles.severityBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.severityText, { color }]}>{severity}</Text>
    </View>
  );
}

function ViolationCard({
  violation,
  onAcknowledge,
}: {
  violation: ViolationWithDetails;
  onAcknowledge: () => void;
}) {
  const ruleTypeLabels: Record<string, string> = {
    impossible_travel: 'Impossible Travel',
    simultaneous_locations: 'Simultaneous Locations',
    device_velocity: 'Device Velocity',
    concurrent_streams: 'Concurrent Streams',
    geo_restriction: 'Geo Restriction',
  };

  return (
    <View style={styles.violationCard}>
      <View style={styles.violationHeader}>
        <View style={styles.violationInfo}>
          <Text style={styles.violationUsername}>{violation.user?.username || 'Unknown User'}</Text>
          <Text style={styles.violationTime}>
            {new Date(violation.createdAt).toLocaleString()}
          </Text>
        </View>
        <SeverityBadge severity={violation.severity} />
      </View>

      <View style={styles.violationContent}>
        <Text style={styles.ruleType}>
          {ruleTypeLabels[violation.rule?.type || ''] || violation.rule?.type || 'Unknown Rule'}
        </Text>
        <Text style={styles.violationDetails} numberOfLines={2}>
          {violation.data ? JSON.stringify(violation.data) : 'No details available'}
        </Text>
      </View>

      {!violation.acknowledgedAt && (
        <Pressable style={styles.acknowledgeButton} onPress={onAcknowledge}>
          <Text style={styles.acknowledgeText}>Acknowledge</Text>
        </Pressable>
      )}

      {violation.acknowledgedAt && (
        <View style={styles.acknowledgedBadge}>
          <Text style={styles.acknowledgedText}>Acknowledged</Text>
        </View>
      )}
    </View>
  );
}

export default function AlertsScreen() {
  const queryClient = useQueryClient();

  const {
    data: violationsData,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['violations'],
    queryFn: () => api.violations.list({ pageSize: 50 }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });

  const violations = violationsData?.data || [];
  const unacknowledgedCount = violations.filter((v) => !v.acknowledgedAt).length;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={violations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ViolationCard
            violation={item}
            onAcknowledge={() => acknowledgeMutation.mutate(item.id)}
          />
        )}
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
            <Text style={styles.headerTitle}>Alerts</Text>
            {unacknowledgedCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{unacknowledgedCount} new</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>No Alerts</Text>
            <Text style={styles.emptySubtitle}>
              Rule violations will appear here when detected
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
  countBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  countText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.error,
  },
  violationCard: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.dark,
  },
  violationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  violationInfo: {
    flex: 1,
  },
  violationUsername: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  violationTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    marginTop: 2,
  },
  severityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  severityText: {
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  violationContent: {
    marginBottom: spacing.sm,
  },
  ruleType: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.cyan.core,
    marginBottom: spacing.xs,
  },
  violationDetails: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary.dark,
    lineHeight: 20,
  },
  acknowledgeButton: {
    backgroundColor: colors.cyan.core + '20',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acknowledgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.cyan.core,
  },
  acknowledgedBadge: {
    backgroundColor: colors.success + '10',
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  acknowledgedText: {
    fontSize: typography.fontSize.sm,
    color: colors.success,
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
    paddingHorizontal: spacing.lg,
  },
});
