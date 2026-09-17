import { useState } from 'react';
import { View, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Activity } from 'lucide-react-native';
import { RUN_OUTCOMES, type RunOutcome } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { useAutomations, useRunCounts, useRuns } from '@/hooks';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Text } from '@/components/ui/text';
import { safeFormatDistanceToNow } from '@/lib/formatters';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, spacing } from '@/lib/theme';
import { RunRow } from './RunRow';

// Web's order and default: runs that did something first, the rest one tap away.
const OUTCOME_TABS = [...RUN_OUTCOMES, 'all'] as const;
type OutcomeTab = RunOutcome | 'all';

export function RunsFeed({ horizontalPadding }: { horizontalPadding: number }) {
  const { t } = useTranslation(['pages', 'common']);
  const [tab, setTab] = useState<OutcomeTab>('completed');

  const runs = useRuns(tab === 'all' ? {} : { outcome: tab });
  const counts = useRunCounts();
  const automations = useAutomations();

  const { controlKey, refreshControlProps } = usePullToRefresh(() =>
    Promise.all([runs.refetch(), counts.refetch()])
  );

  const rows = runs.data?.pages.flatMap((page) => page.data) ?? [];
  const automationsById = new Map(automations.data?.data.map((row) => [row.id, row]));
  const noMatches = counts.data?.stopped_by_condition ?? 0;
  const onlyNoMatches = tab === 'completed' && noMatches > 0;

  const tabOptions = OUTCOME_TABS.map((value) => {
    const label = t(`pages:automations.activity.tabs.${value}`);
    const count = counts.data ? (value === 'all' ? counts.data.total : counts.data[value]) : null;
    return {
      value,
      label: count === null ? label : `${label} ${count}`,
      accessibilityLabel: count === null ? label : `${label}, ${count}`,
    };
  });

  const handleTabChange = (next: OutcomeTab) => {
    haptics.selection();
    setTab(next);
  };

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <RunRow run={item} automation={automationsById.get(item.automationId)} />
      )}
      extraData={automationsById}
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
      }}
      onEndReached={() => {
        if (runs.hasNextPage && !runs.isFetchingNextPage) void runs.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
      ListHeaderComponent={
        <View className="mb-4 gap-3">
          {counts.data ? (
            <Text className="text-muted-foreground text-sm">
              {counts.data.completed > 0 && counts.data.lastRunAt
                ? t('pages:automations.detail.runsLine', {
                    count: counts.data.completed,
                    when: safeFormatDistanceToNow(
                      counts.data.lastRunAt,
                      t('common:labels.unknown')
                    ),
                  })
                : t('pages:automations.detail.noRuns')}
            </Text>
          ) : null}
          <SegmentedControl
            options={tabOptions}
            value={tab}
            onChange={handleTabChange}
            accessibilityLabel={t('pages:automations.activity.tabsLabel')}
          />
        </View>
      }
      ListFooterComponent={
        runs.isFetchingNextPage ? (
          <View className="items-center py-4">
            <ActivityIndicator size="small" color={ACCENT_COLOR} />
          </View>
        ) : undefined
      }
      ListEmptyComponent={
        runs.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={ACCENT_COLOR} />
          </View>
        ) : runs.isError && !runs.data ? (
          <ErrorState message={runs.error.message} onRetry={() => void runs.refetch()} />
        ) : (
          <EmptyState
            icon={Activity}
            title={t(
              onlyNoMatches
                ? 'pages:automations.activity.emptyRan'
                : 'pages:automations.activity.empty'
            )}
            description={
              onlyNoMatches
                ? t('pages:automations.activity.emptyRanDescription', { count: noMatches })
                : t('pages:automations.activity.emptyDescription')
            }
          />
        )
      }
    />
  );
}
