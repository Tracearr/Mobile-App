/**
 * History tab - redesigned with filters, date ranges, and compact list view
 * Matches web UI quality with proper filtering and aggregates
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Play } from 'lucide-react-native';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { TabToolbar, androidHeaderOptions } from '@/components/navigation/TabHeaderButtons';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { ACCENT_COLOR } from '@/lib/theme';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import {
  HistoryFilters,
  HistoryRow,
  HistoryRowSeparator,
  HistoryAggregates,
  FilterBottomSheet,
  type TimePeriod,
  type FilterBottomSheetRef,
  type FilterState,
} from '@/components/history';
import type { SessionWithDetails } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';

const PAGE_SIZE = 50;
const DAY_MS = 24 * 60 * 60 * 1000;

const PERIOD_DAYS: Record<Exclude<TimePeriod, 'all'>, number> = {
  week: 7,
  month: 30,
  year: 365,
};

// No endDate: the server reads it as the end of that day, so one fixed at mount would
// hide every session started after midnight from later refetches.
function getStartDate(period: TimePeriod): Date | undefined {
  return period === 'all' ? undefined : new Date(Date.now() - PERIOD_DAYS[period] * DAY_MS);
}

const nonEmpty = <T,>(values: T[]): T[] | undefined => (values.length > 0 ? values : undefined);

export default function HistoryScreen() {
  const { t } = useTranslation(['mobile', 'common', 'nav']);
  const router = useRouter();
  const { scope } = useMediaServer();
  const filterSheetRef = useRef<FilterBottomSheetRef>(null);

  const [period, setPeriod] = useState<TimePeriod>('month');
  const [search, setSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    serverUserIds: [],
    platforms: [],
    geoCountries: [],
    mediaTypes: [],
    transcodeDecisions: [],
  });

  const activeFilterCount =
    advancedFilters.serverUserIds.length +
    advancedFilters.platforms.length +
    advancedFilters.geoCountries.length +
    advancedFilters.mediaTypes.length +
    advancedFilters.transcodeDecisions.length;

  const { data: filterOptions } = useQuery({
    queryKey: queryKeys.sessions.filterOptions(scope),
    queryFn: ({ signal }) => api.sessions.filterOptions(scope, signal),
    staleTime: 1000 * 60 * 5,
  });

  // One object feeds the list and the aggregates, so the totals cannot describe other rows.
  const filters = useMemo(
    () => ({
      startDate: getStartDate(period),
      search: search.trim() || undefined,
      serverUserIds: nonEmpty(advancedFilters.serverUserIds),
      platforms: nonEmpty(advancedFilters.platforms),
      geoCountries: nonEmpty(advancedFilters.geoCountries),
      mediaTypes: nonEmpty(advancedFilters.mediaTypes),
      transcodeDecisions: nonEmpty(advancedFilters.transcodeDecisions),
    }),
    [period, search, advancedFilters]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isLoading, error } =
    useInfiniteQuery({
      queryKey: queryKeys.sessions.history(scope, filters),
      queryFn: ({ pageParam, signal }) =>
        api.sessions.history(
          {
            ...filters,
            scope,
            cursor: pageParam,
            pageSize: PAGE_SIZE,
            orderBy: 'startedAt',
            orderDir: 'desc',
          },
          signal
        ),
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    });

  const { startDate, ...aggregateFilters } = filters;
  const {
    data: aggregates,
    isLoading: isLoadingAggregates,
    isFetching: isFetchingAggregates,
    error: aggregatesError,
    refetch: refetchAggregates,
  } = useQuery({
    queryKey: queryKeys.sessions.historyAggregates(scope, period, aggregateFilters),
    queryFn: ({ signal }) =>
      api.sessions.historyAggregates({ ...aggregateFilters, scope, startDate }, signal),
    // The list key carries startDate, so every filter change fetches the list fresh.
    // This key is reused per period, so it must refetch too rather than serve a cached total.
    staleTime: 0,
  });

  const sessions = useMemo(() => data?.pages.flatMap((page) => page.data) ?? [], [data]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item }: { item: SessionWithDetails }) => (
      <HistoryRow session={item} onPress={() => router.push(ROUTES.SESSION(item.id))} />
    ),
    [router]
  );

  const keyExtractor = useCallback((item: SessionWithDetails) => item.id, []);

  const { controlKey, refreshControlProps } = usePullToRefresh(() =>
    Promise.all([refetch(), refetchAggregates()])
  );

  const hasFilters = search.trim().length > 0 || activeFilterCount > 0;

  return (
    <>
      <View className="bg-background flex-1">
        <FlashList
          data={sessions}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={HistoryRowSeparator}
          contentContainerStyle={{ paddingBottom: 24 }}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
          ListHeaderComponent={
            <View className="px-4 pt-2">
              <HistoryFilters
                period={period}
                onPeriodChange={setPeriod}
                search={search}
                onSearchChange={setSearch}
                activeFilterCount={activeFilterCount}
                onFilterPress={() => filterSheetRef.current?.open()}
              />
              <HistoryAggregates
                aggregates={aggregates}
                isLoading={isLoadingAggregates}
                isFetching={isFetchingAggregates}
                error={aggregatesError}
                onRetry={() => void refetchAggregates()}
              />
            </View>
          }
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="items-center py-4">
                <ActivityIndicator size="small" color={ACCENT_COLOR} />
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            isLoading ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color={ACCENT_COLOR} />
              </View>
            ) : (
              <View className="px-4">
                <Card padding="none">
                  {error && !data ? (
                    <ErrorState message={error.message} onRetry={() => void refetch()} />
                  ) : (
                    <EmptyState
                      icon={Play}
                      title={t('common:empty.noSessionsFound')}
                      description={
                        hasFilters
                          ? t('mobile:history.adjustFilters')
                          : t('mobile:history.historyWillAppear')
                      }
                    />
                  )}
                </Card>
              </View>
            )
          }
        />

        <FilterBottomSheet
          ref={filterSheetRef}
          filterOptions={filterOptions}
          filters={advancedFilters}
          onFiltersChange={setAdvancedFilters}
        />
      </View>

      <Stack.Screen options={{ title: t('nav:history'), ...androidHeaderOptions }} />
      <TabToolbar />
    </>
  );
}
