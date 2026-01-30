/**
 * History aggregates summary bar
 * Shows key stats: Total Plays, Watch Time, Unique Users, Unique Titles
 */
import React from 'react';
import { View } from 'react-native';
import { Play, Clock, Users, Film } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { ACCENT_COLOR } from '@/lib/theme';
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
    <View className="flex-1 flex-row items-center justify-center gap-1.5">
      <View
        className="h-5 w-5 items-center justify-center rounded-full"
        style={{ backgroundColor: `${ACCENT_COLOR}15` }}
      >
        <Icon size={12} color={ACCENT_COLOR} />
      </View>
      <View className="items-start">
        <Text className="text-[13px] font-semibold">
          {isLoading ? '-' : typeof value === 'number' ? value.toLocaleString() : value}
        </Text>
        <Text className="text-muted-foreground text-[10px]">{label}</Text>
      </View>
    </View>
  );
}

export function HistoryAggregates({ aggregates, isLoading }: HistoryAggregatesProps) {
  return (
    <View className="bg-card mb-4 flex-row rounded-xl px-1 py-2">
      <StatItem
        icon={Play}
        label="Plays"
        value={aggregates?.playCount ?? 0}
        isLoading={isLoading}
      />
      <View className="bg-border h-[80%] w-px self-center" />
      <StatItem
        icon={Clock}
        label="Watch Time"
        value={formatWatchTime(aggregates?.totalWatchTimeMs ?? 0)}
        isLoading={isLoading}
      />
      <View className="bg-border h-[80%] w-px self-center" />
      <StatItem
        icon={Users}
        label="Users"
        value={aggregates?.uniqueUsers ?? 0}
        isLoading={isLoading}
      />
      <View className="bg-border h-[80%] w-px self-center" />
      <StatItem
        icon={Film}
        label="Titles"
        value={aggregates?.uniqueContent ?? 0}
        isLoading={isLoading}
      />
    </View>
  );
}
