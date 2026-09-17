import { View, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Workflow } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { useAutomations, useRuns } from '@/hooks';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Text } from '@/components/ui/text';
import { latestRunByAutomation } from '@/lib/automations';
import { ACCENT_COLOR, spacing } from '@/lib/theme';
import { AutomationRow } from './AutomationRow';

export function AutomationsList({ horizontalPadding }: { horizontalPadding: number }) {
  const { t } = useTranslation(['pages', 'mobile', 'common']);
  const automations = useAutomations();
  // GET /automations carries no run data, so a row's last run comes from the newest
  // page of the feed and is left blank for an automation that is not in it.
  const runs = useRuns();

  const { controlKey, refreshControlProps } = usePullToRefresh(() =>
    Promise.all([automations.refetch(), runs.refetch()])
  );

  const rows = automations.data?.data ?? [];
  const total = automations.data?.meta.total ?? 0;
  const lastRuns = latestRunByAutomation(runs.data?.pages.flatMap((page) => page.data) ?? []);

  return (
    <FlashList
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <AutomationRow automation={item} lastRun={lastRuns.get(item.id)} />}
      extraData={lastRuns}
      contentContainerStyle={{
        paddingHorizontal: horizontalPadding,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
      }}
      refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
      ListHeaderComponent={
        rows.length > 0 ? (
          <Text className="text-muted-foreground mb-4 text-sm">
            {t('common:count.automation', { count: total })}
          </Text>
        ) : null
      }
      ListFooterComponent={
        rows.length > 0 ? (
          <View className="gap-2 pt-1">
            {total > rows.length ? (
              <Text className="text-warning text-xs">
                {t('mobile:automations.truncated', {
                  shown: rows.length,
                  total,
                  defaultValue:
                    'Showing the first {{shown}} of {{total}} automations. The rest are in the Tracearr web app.',
                })}
              </Text>
            ) : null}
            <Text className="text-muted-foreground text-xs">
              {t('mobile:automations.editOnWeb', {
                defaultValue: 'Automations are created and edited in the Tracearr web app.',
              })}
            </Text>
          </View>
        ) : null
      }
      ListEmptyComponent={
        automations.isPending ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color={ACCENT_COLOR} />
          </View>
        ) : automations.isError && !automations.data ? (
          <ErrorState
            message={automations.error.message}
            onRetry={() => void automations.refetch()}
          />
        ) : (
          <EmptyState
            icon={Workflow}
            title={t('pages:automations.emptyTitle')}
            description={t('mobile:automations.emptyDescription', {
              defaultValue: 'Create automations in the Tracearr web app and they show up here.',
            })}
          />
        )
      }
    />
  );
}
