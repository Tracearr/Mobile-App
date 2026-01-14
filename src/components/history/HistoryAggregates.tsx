/**
 * History aggregates summary bar
 * Shows key stats: Total Plays, Watch Time, Unique Users, Unique Titles
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Play, Clock, Users, Film } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { colors, spacing, borderRadius } from '@/lib/theme';
import type { HistoryAggregates as AggregatesType } from '@tracearr/shared';

interface HistoryAggregatesProps {
  aggregates: AggregatesType | undefined;
  isLoading?: boolean;
}

// Format duration from milliseconds to human-readable string
function formatWatchTime(ms: number | null): string {
  if (!ms) return '0h';
  const totalHours = Math.floor(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) return `${days}d ${hours}h`;
  return `${totalHours}h`;
}

interface StatItemProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  isLoading?: boolean;
}

function StatItem({ icon: Icon, label, value, isLoading }: StatItemProps) {
  return (
    <View style={styles.statItem}>
      <View style={styles.iconContainer}>
        <Icon size={12} color={colors.cyan.core} />
      </View>
      <View style={styles.statContent}>
        <Text style={styles.statValue}>
          {isLoading ? '-' : typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </View>
  );
}

export function HistoryAggregates({ aggregates, isLoading }: HistoryAggregatesProps) {
  return (
    <View style={styles.container}>
      <StatItem
        icon={Play}
        label="Plays"
        value={aggregates?.playCount ?? 0}
        isLoading={isLoading}
      />
      <View style={styles.divider} />
      <StatItem
        icon={Clock}
        label="Watch Time"
        value={formatWatchTime(aggregates?.totalWatchTimeMs ?? 0)}
        isLoading={isLoading}
      />
      <View style={styles.divider} />
      <StatItem
        icon={Users}
        label="Users"
        value={aggregates?.uniqueUsers ?? 0}
        isLoading={isLoading}
      />
      <View style={styles.divider} />
      <StatItem
        icon={Film}
        label="Titles"
        value={aggregates?.uniqueContent ?? 0}
        isLoading={isLoading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.md,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: `${colors.cyan.core}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  statLabel: {
    fontSize: 10,
    color: colors.text.muted.dark,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: colors.border.dark,
  },
});
