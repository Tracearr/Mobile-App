/**
 * History aggregates summary bar
 * Shows key stats: Total Plays, Watch Time, Unique Users, Unique Titles
 */
import React from 'react';
import { View } from 'react-native';
import { Play, Clock, Users, Film, type LucideIcon } from 'lucide-react-native';
import { formatNumber, useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { cn } from '@/lib/utils';
import { ACCENT_COLOR } from '@/lib/theme';
import { formatWatchTime } from '@/lib/formatters';
import type { HistoryAggregates as AggregatesType } from '@tracearr/shared';

interface HistoryAggregatesProps {
  aggregates: AggregatesType | undefined;
  isLoading?: boolean;
  isFetching?: boolean;
  error?: Error | null;
  onRetry: () => void;
}

interface StatItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
  isLoading?: boolean;
}

function StatItem({ icon: Icon, label, value, isLoading }: StatItemProps) {
  return (
    <View
      accessible
      accessibilityLabel={isLoading ? label : `${label}: ${value}`}
      className="flex-1 items-center px-1"
    >
      <View className="flex-row items-center gap-1">
        <Icon size={12} color={ACCENT_COLOR} />
        <Text numberOfLines={1} className="text-sm font-semibold">
          {isLoading ? '-' : value}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
        className="text-muted-foreground text-[10px]"
      >
        {label}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="bg-border h-[80%] w-px self-center" />;
}

export function HistoryAggregates({
  aggregates,
  isLoading,
  isFetching,
  error,
  onRetry,
}: HistoryAggregatesProps) {
  const { t } = useTranslation(['pages', 'common']);

  if (error && !aggregates) {
    return (
      <Card padding="none" className="mb-4">
        <ErrorState compact message={error.message} onRetry={onRetry} />
      </Card>
    );
  }

  return (
    <Card
      padding="none"
      className={cn('mb-4 flex-row px-1 py-2', isFetching && !isLoading && 'opacity-60')}
    >
      <StatItem
        icon={Play}
        label={t('pages:history.totalPlays', { defaultValue: 'Total Plays' })}
        value={formatNumber(aggregates?.playCount ?? 0)}
        isLoading={isLoading}
      />
      <Divider />
      <StatItem
        icon={Clock}
        label={t('common:labels.watchTime')}
        value={formatWatchTime(aggregates?.totalWatchTimeMs ?? 0)}
        isLoading={isLoading}
      />
      <Divider />
      <StatItem
        icon={Users}
        label={t('pages:history.uniqueUsers', { defaultValue: 'Unique Users' })}
        value={formatNumber(aggregates?.uniqueUsers ?? 0)}
        isLoading={isLoading}
      />
      <Divider />
      <StatItem
        icon={Film}
        label={t('pages:history.uniqueTitles', { defaultValue: 'Unique Titles' })}
        value={formatNumber(aggregates?.uniqueContent ?? 0)}
        isLoading={isLoading}
      />
    </Card>
  );
}
