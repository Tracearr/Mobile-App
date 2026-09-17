/**
 * Activity tab - streaming statistics and charts
 * Query keys are scoped by the global ServerScope selection for cache isolation
 *
 * Responsive layout:
 * - Phone: Single column, smaller chart heights
 * - Tablet (md+): 2-column grid, taller charts, increased padding
 */
import { useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { useQuery, type QueryKey } from '@tanstack/react-query';
import { serverScopeKey, type ServerScope } from '@tracearr/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import { TabToolbar, androidHeaderOptions } from '@/components/navigation/TabHeaderButtons';
import { spacing } from '@/lib/theme';
import { Card } from '@/components/ui/card';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { TimeRangePicker, type TimePeriod } from '@/components/history';
import {
  PlaysChart,
  ConcurrentChart,
  PlatformChart,
  DayOfWeekChart,
  HourOfDayChart,
  QualityChart,
} from '@/components/charts';
import { useTranslation } from '@tracearr/translations/mobile';
import { ObserveInteractiveMarker } from 'expo-observe';

// A period switch keeps the last period's chart on screen, dimmed, until the new one
// arrives. A scope switch never does: another server's chart must not pass for this one.
// Relies on every queryKeys.stats key ending in serverScopeKey(scope).
function useStat<T>(
  queryKey: QueryKey,
  scope: ServerScope,
  queryFn: (signal: AbortSignal) => Promise<T>
) {
  const scopeKey = serverScopeKey(scope);
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[previousQuery.queryKey.length - 1] === scopeKey
        ? previousData
        : undefined,
  });
}

interface ChartSectionProps {
  title: string;
  query: { error: Error | null; isPlaceholderData: boolean; refetch: () => unknown };
  hasData: boolean;
  height: number;
  children: React.ReactNode;
}

function ChartSection({ title, query, hasData, height, children }: ChartSectionProps) {
  return (
    <View style={{ flex: 1, opacity: query.isPlaceholderData ? 0.5 : 1 }}>
      <SectionHeader title={title} className="mb-2" />
      {query.error && !hasData ? (
        <Card padding="none" className="justify-center" style={{ minHeight: height }}>
          <ErrorState compact message={query.error.message} onRetry={() => void query.refetch()} />
        </Card>
      ) : (
        children
      )}
    </View>
  );
}

export default function ActivityScreen() {
  const { t } = useTranslation(['mobile', 'common', 'nav']);
  const [period, setPeriod] = useState<TimePeriod>('month');
  const { scope } = useMediaServer();
  const { isTablet, select } = useResponsive();

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const chartHeightLarge = select({ base: 180, md: 250 });
  const chartHeightSmall = select({ base: 160, md: 220 });
  const qualityHeight = select({ base: 120, md: 160 });

  const plays = useStat(queryKeys.stats.plays(period, scope), scope, (signal) =>
    api.stats.plays({ period, scope }, signal)
  );
  const dayOfWeek = useStat(queryKeys.stats.dayOfWeek(period, scope), scope, (signal) =>
    api.stats.playsByDayOfWeek({ period, scope }, signal)
  );
  const hourOfDay = useStat(queryKeys.stats.hourOfDay(period, scope), scope, (signal) =>
    api.stats.playsByHourOfDay({ period, scope }, signal)
  );
  const platforms = useStat(queryKeys.stats.platforms(period, scope), scope, (signal) =>
    api.stats.platforms({ period, scope }, signal)
  );
  const quality = useStat(queryKeys.stats.quality(period, scope), scope, (signal) =>
    api.stats.quality({ period, scope }, signal)
  );
  const concurrent = useStat(queryKeys.stats.concurrent(period, scope), scope, (signal) =>
    api.stats.concurrent({ period, scope }, signal)
  );

  const { controlKey, refreshControlProps } = usePullToRefresh(() =>
    Promise.all([
      plays.refetch(),
      concurrent.refetch(),
      dayOfWeek.refetch(),
      hourOfDay.refetch(),
      platforms.refetch(),
      quality.refetch(),
    ])
  );

  const rowStyle = {
    flexDirection: isTablet ? 'row' : 'column',
    gap: isTablet ? spacing.md : spacing.sm,
  } as const;
  const rowGap = isTablet ? spacing.md : spacing.sm;

  return (
    <>
      <ObserveInteractiveMarker />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        }}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
      >
        <View className="mb-4">
          <TimeRangePicker value={period} onChange={setPeriod} />
        </View>

        <View style={[rowStyle, { marginBottom: rowGap }]}>
          <ChartSection
            title={t('mobile:activity.playsOverTime')}
            query={plays}
            hasData={!!plays.data}
            height={chartHeightLarge}
          >
            <PlaysChart
              data={plays.data?.data ?? []}
              isLoading={plays.isLoading}
              height={chartHeightLarge}
            />
          </ChartSection>

          <ChartSection
            title={t('mobile:activity.concurrentStreams')}
            query={concurrent}
            hasData={!!concurrent.data}
            height={chartHeightLarge}
          >
            <ConcurrentChart
              data={concurrent.data?.data ?? []}
              isLoading={concurrent.isLoading}
              height={chartHeightLarge}
            />
          </ChartSection>
        </View>

        <View style={[rowStyle, { marginBottom: rowGap }]}>
          <ChartSection
            title={t('common:periods.byDay')}
            query={dayOfWeek}
            hasData={!!dayOfWeek.data}
            height={chartHeightSmall}
          >
            <DayOfWeekChart
              data={dayOfWeek.data?.data ?? []}
              isLoading={dayOfWeek.isLoading}
              height={chartHeightSmall}
            />
          </ChartSection>

          <ChartSection
            title={t('common:periods.byHour')}
            query={hourOfDay}
            hasData={!!hourOfDay.data}
            height={chartHeightSmall}
          >
            <HourOfDayChart
              data={hourOfDay.data?.data ?? []}
              isLoading={hourOfDay.isLoading}
              height={chartHeightSmall}
            />
          </ChartSection>
        </View>

        <View style={rowStyle}>
          <ChartSection
            title={t('mobile:activity.platforms')}
            query={platforms}
            hasData={!!platforms.data}
            height={chartHeightSmall}
          >
            <PlatformChart
              data={platforms.data?.data ?? []}
              isLoading={platforms.isLoading}
              height={chartHeightSmall}
            />
          </ChartSection>

          <ChartSection
            title={t('mobile:activity.playbackQuality')}
            query={quality}
            hasData={!!quality.data}
            height={qualityHeight}
          >
            <QualityChart
              directPlay={quality.data?.directPlay}
              directStream={quality.data?.directStream}
              transcode={quality.data?.transcode}
              directPlayPercent={quality.data?.directPlayPercent}
              directStreamPercent={quality.data?.directStreamPercent}
              transcodePercent={quality.data?.transcodePercent}
              isLoading={quality.isLoading}
              height={qualityHeight}
            />
          </ChartSection>
        </View>
      </ScrollView>

      <Stack.Screen options={{ title: t('nav:activity'), ...androidHeaderOptions }} />
      <TabToolbar />
    </>
  );
}
