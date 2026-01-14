/**
 * History tab - redesigned with filters, date ranges, and compact list view
 * Matches web UI quality with proper filtering and aggregates
 */
import { useState, useMemo, useCallback, useRef } from 'react';
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';
import { api } from '@/lib/api';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { Text } from '@/components/ui/text';
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
import { colors, spacing } from '@/lib/theme';
import type { SessionWithDetails } from '@tracearr/shared';

const PAGE_SIZE = 50;

// Convert TimePeriod to date range
function getDateRange(period: TimePeriod): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = now;

  switch (period) {
    case '7d':
      return { startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), endDate };
    case '30d':
      return { startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), endDate };
    case '90d':
      return { startDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), endDate };
    case '1y':
      return { startDate: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000), endDate };
    case 'all':
      // Use a very old date for "all time"
      return { startDate: new Date('2000-01-01'), endDate };
  }
}

export default function HistoryScreen() {
  const router = useRouter();
  const { selectedServerId } = useMediaServer();
  const filterSheetRef = useRef<FilterBottomSheetRef>(null);

  // Filter state
  const [period, setPeriod] = useState<TimePeriod>('30d');
  const [search, setSearch] = useState('');
  const [advancedFilters, setAdvancedFilters] = useState<FilterState>({
    serverUserIds: [],
    platforms: [],
    geoCountries: [],
    mediaTypes: [],
    transcodeDecisions: [],
  });

  // Count active advanced filters
  const activeFilterCount = useMemo((): number => {
    const serverUserCount = advancedFilters.serverUserIds.length as number;
    const platformCount = advancedFilters.platforms.length as number;
    const geoCount = advancedFilters.geoCountries.length as number;
    const mediaCount = advancedFilters.mediaTypes.length as number;
    const transcodeCount = advancedFilters.transcodeDecisions.length as number;
    return serverUserCount + platformCount + geoCount + mediaCount + transcodeCount;
  }, [advancedFilters]);

  // Fetch filter options for the bottom sheet
  const { data: filterOptions } = useQuery({
    queryKey: ['sessions', 'filter-options', selectedServerId],
    queryFn: () => api.sessions.filterOptions(selectedServerId ?? undefined),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!selectedServerId,
  });

  // Build filters object
  const filters = useMemo(() => {
    const { startDate, endDate } = getDateRange(period);
    return {
      serverId: selectedServerId ?? undefined,
      startDate,
      endDate,
      search: search.trim() || undefined,
      serverUserIds:
        advancedFilters.serverUserIds.length > 0 ? advancedFilters.serverUserIds : undefined,
      platforms: advancedFilters.platforms.length > 0 ? advancedFilters.platforms : undefined,
      geoCountries:
        advancedFilters.geoCountries.length > 0 ? advancedFilters.geoCountries : undefined,
      mediaTypes: advancedFilters.mediaTypes.length > 0 ? advancedFilters.mediaTypes : undefined,
      transcodeDecisions:
        advancedFilters.transcodeDecisions.length > 0
          ? advancedFilters.transcodeDecisions
          : undefined,
      orderBy: 'startedAt' as const,
      orderDir: 'desc' as const,
    };
  }, [selectedServerId, period, search, advancedFilters]);

  // Fetch history with infinite scroll
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching, isLoading } =
    useInfiniteQuery({
      queryKey: ['sessions', 'history', selectedServerId, filters],
      queryFn: async ({ pageParam }) => {
        return api.sessions.history({
          ...filters,
          cursor: pageParam,
          pageSize: PAGE_SIZE,
        });
      },
      initialPageParam: undefined as string | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!selectedServerId,
    });

  // Fetch aggregates for summary stats
  const { data: aggregates, isLoading: isLoadingAggregates } = useQuery({
    queryKey: ['sessions', 'history', 'aggregates', selectedServerId, period],
    queryFn: () => {
      const { startDate, endDate } = getDateRange(period);
      return api.sessions.historyAggregates({
        serverId: selectedServerId ?? undefined,
        startDate,
        endDate,
      });
    },
    staleTime: 1000 * 60,
    enabled: !!selectedServerId,
  });

  // Flatten all pages into single array
  const sessions = useMemo(() => {
    return data?.pages.flatMap((page) => page.data) || [];
  }, [data]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleSessionPress = useCallback(
    (session: SessionWithDetails) => {
      router.push(`/session/${session.id}` as never);
    },
    [router]
  );

  const handleFilterPress = useCallback(() => {
    filterSheetRef.current?.open();
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SessionWithDetails }) => (
      <HistoryRow session={item} onPress={() => handleSessionPress(item)} />
    ),
    [handleSessionPress]
  );

  const keyExtractor = useCallback((item: SessionWithDetails) => item.id, []);

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <FlatList
        data={sessions}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={HistoryRowSeparator}
        contentContainerStyle={styles.listContent}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.cyan.core}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            {/* Filters */}
            <HistoryFilters
              period={period}
              onPeriodChange={setPeriod}
              search={search}
              onSearchChange={setSearch}
              activeFilterCount={activeFilterCount}
              onFilterPress={handleFilterPress}
            />

            {/* Aggregates */}
            <HistoryAggregates aggregates={aggregates} isLoading={isLoadingAggregates} />
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={colors.cyan.core} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.empty}>
              <ActivityIndicator size="large" color={colors.cyan.core} />
            </View>
          ) : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Play size={32} color={colors.text.muted.dark} />
              </View>
              <Text style={styles.emptyTitle}>No History Found</Text>
              <Text style={styles.emptySubtitle}>
                {search || activeFilterCount > 0
                  ? 'Try adjusting your filters'
                  : 'Session history will appear here once users start streaming'}
              </Text>
            </View>
          )
        }
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        ref={filterSheetRef}
        filterOptions={filterOptions}
        filters={advancedFilters}
        onFiltersChange={setAdvancedFilters}
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
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface.dark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.text.muted.dark,
    textAlign: 'center',
    lineHeight: 20,
  },
});
