/**
 * Dashboard tab - overview of streaming activity
 * Supports multi-server selection with colored cards and map markers
 *
 * Responsive layout:
 * - Compact: single column, stacked cards
 * - Medium (600+): 2-column grid for Now Playing, larger map
 * - Expanded (840+): 3-column grid for Now Playing
 *
 * Now Playing columns follow the screen's own width, not the window's, so the
 * iPad sidebar and Android split windows get the columns that actually fit.
 */
import { useMemo, useState, type ReactNode } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useIsFocused, useRouter, Stack } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  Calendar,
  CirclePlay,
  Clock,
  MapPin,
  TriangleAlert,
  Tv,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useServerLiveStats } from '@/hooks/useServerLiveStats';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { cardColumns, useResponsive } from '@/hooks/useResponsive';
import { TabToolbar, androidHeaderOptions } from '@/components/navigation/TabHeaderButtons';
import { StreamMap } from '@/components/map/StreamMap';
import { NowPlayingCard } from '@/components/sessions';
import { ServerLoadCard, cpuValue, formatUtilization } from '@/components/server/ServerLoadCard';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { spacing, ACCENT_COLOR, colors } from '@/lib/theme';
import { SERVER_PROFILES, isServerType } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';

const TILE_GAP = spacing.sm;

function TileRow({ compact, children }: { compact: boolean; children: ReactNode }) {
  return compact ? (
    <Card padding="compact" className="flex-row gap-3">
      {children}
    </Card>
  ) : (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -TILE_GAP / 2 }}>
      {children}
    </View>
  );
}

/**
 * Web's StatCard: tinted icon, value over label, and the whole tile opens the matching screen
 */
function StatTile({
  icon: Icon,
  label,
  value,
  subValue,
  compact,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  // Phones show the four tiles as cells of one card, in a single row
  compact: boolean;
  onPress: () => void;
}) {
  const a11yLabel = [label, value, subValue].filter(Boolean).join(', ');
  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        hitSlop={{ top: 8, bottom: 8 }}
        style={({ pressed }) => ({ flex: 1, minWidth: 0, opacity: pressed ? 0.7 : 1 })}
      >
        <View className="flex-row items-center gap-1">
          <Icon size={13} color={ACCENT_COLOR} />
          <Text
            className="text-base font-semibold"
            style={{ fontVariant: ['tabular-nums'] }}
            numberOfLines={1}
          >
            {value}
          </Text>
        </View>
        {/* The sessions count stays in the accessibility label; a cell this narrow cuts it off */}
        <Text
          className="text-muted-foreground text-[11px]"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {label}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={{ width: '25%', padding: TILE_GAP / 2 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Card padding="compact" className="flex-row items-center gap-3">
          <View className="bg-primary/10 h-9 w-9 items-center justify-center rounded-md">
            <Icon size={16} color={ACCENT_COLOR} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-semibold" style={{ fontVariant: ['tabular-nums'] }}>
              {value}
            </Text>
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>
              {subValue ? `${label} (${subValue})` : label}
            </Text>
          </View>
        </Card>
      </Pressable>
    </View>
  );
}

export default function DashboardScreen() {
  const { t } = useTranslation(['pages', 'common', 'nav', 'mobile']);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { servers, selectedServers, isMultiServer, scope, serverColor } = useMediaServer();
  const { isTablet, select, horizontalPadding } = useResponsive();
  const [contentWidth, setContentWidth] = useState(0);
  const nowPlayingColumns = cardColumns(contentWidth);

  const serverOrderMap = useMemo(
    () => new Map(servers.map((s) => [s.id, s.displayOrder ?? 0])),
    [servers]
  );

  const {
    data: stats,
    error: statsError,
    refetch,
  } = useQuery({
    queryKey: queryKeys.dashboard.stats(scope),
    queryFn: ({ signal }) => api.stats.dashboard(scope, signal),
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  const {
    data: activeSessions,
    error: sessionsError,
    refetch: refetchSessions,
  } = useQuery({
    queryKey: queryKeys.sessions.active(scope),
    queryFn: ({ signal }) => api.sessions.active(scope, signal),
    staleTime: 1000 * 5,
    refetchInterval: 1000 * 30,
  });

  const sortedSessions = useMemo(() => {
    if (!activeSessions) return undefined;
    return [...activeSessions].sort((a, b) => {
      const orderA = serverOrderMap.get(a.server.id) ?? 0;
      const orderB = serverOrderMap.get(b.server.id) ?? 0;
      return orderA - orderB;
    });
  }, [activeSessions, serverOrderMap]);

  // A server type this build has no profile for has no stats source it can read, and a
  // historical server has no live stats at all.
  const resourceServers = useMemo(
    () =>
      selectedServers
        .filter((s) => isServerType(s.type) && !s.historicalAt)
        .sort((a, b) => (serverOrderMap.get(a.id) ?? 0) - (serverOrderMap.get(b.id) ?? 0)),
    [selectedServers, serverOrderMap]
  );
  const isFocused = useIsFocused();
  const liveStats = useServerLiveStats(resourceServers, isFocused);
  // Plex always has a stats source, so its card always shows. Any other card shows once its
  // source (SSE plugin, tofa or Silo metrics) has reported, and stays with "no data" when it goes
  // quiet: a card that vanished would read as fine when the load is unknown.
  const resourceCards = resourceServers.flatMap((server, index) => {
    const stats = liveStats[index];
    if (!stats) return [];
    return SERVER_PROFILES[server.type].hostStats === 'plexStatistics' || stats.reported
      ? [{ server, stats }]
      : [];
  });
  const showNetwork = resourceCards.some(
    ({ server }) => SERVER_PROFILES[server.type].reportsBandwidth
  );
  // The busiest server's CPU, shown beside the stream count so load stays in view however many
  // cards Now Playing holds. Across servers only process CPU compares like with like: Silo's
  // host-only figure counts everything on its box. A failed poll keeps old data, so it is skipped.
  const busiest = resourceCards.reduce<{
    cpu: number;
    server: (typeof resourceServers)[number];
  } | null>((top, { server, stats }) => {
    const cpu =
      stats.latest && !stats.error
        ? isMultiServer
          ? stats.latest.processCpu
          : cpuValue(stats.latest)
        : null;
    return cpu !== null && (top === null || cpu > top.cpu) ? { cpu, server } : top;
  }, null);
  const loadColumns = Math.min(nowPlayingColumns, resourceCards.length);
  const streamCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of activeSessions ?? []) {
      counts.set(session.server.id, (counts.get(session.server.id) ?? 0) + 1);
    }
    return counts;
  }, [activeSessions]);

  // Live stats are included so a server on the empty backoff is polled now, not in 30s.
  const { controlKey, refreshControlProps } = usePullToRefresh(() =>
    Promise.all([
      refetch(),
      refetchSessions(),
      ...resourceServers.map((s) =>
        queryClient.refetchQueries({ queryKey: queryKeys.servers.liveStats(s.id) })
      ),
    ])
  );

  const mapHeight = select({ compact: 200, medium: 280, expanded: 320 });

  const loadError = (!stats && statsError) || (!activeSessions && sessionsError) || null;
  const hasActiveStreams = !!sortedSessions && sortedSessions.length > 0;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}
        contentContainerClassName="pb-8"
        contentContainerStyle={loadError ? { flexGrow: 1 } : undefined}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
      >
        {loadError ? (
          <ErrorState
            className="flex-1 justify-center"
            message={loadError.message}
            onRetry={() => {
              void refetch();
              void refetchSessions();
            }}
          />
        ) : (
          <>
            {/* Today - web's tiles, in web's order */}
            <View
              style={{
                paddingHorizontal: horizontalPadding,
                paddingTop: spacing.sm + spacing.xs,
                marginBottom: spacing.md,
              }}
            >
              <SectionHeader icon={Calendar} title={t('common:time.today')} />
              <TileRow compact={!isTablet}>
                <StatTile
                  icon={TriangleAlert}
                  label={t('pages:dashboard.alerts')}
                  value={stats?.alertsLast24h ?? '-'}
                  compact={!isTablet}
                  onPress={() => router.push(ROUTES.ALERTS)}
                />
                <StatTile
                  icon={CirclePlay}
                  label={t('pages:dashboard.plays')}
                  value={stats?.todayPlays ?? '-'}
                  subValue={
                    stats && stats.todaySessions > stats.todayPlays
                      ? t('common:count.session', { count: stats.todaySessions })
                      : undefined
                  }
                  compact={!isTablet}
                  onPress={() => router.push(ROUTES.HISTORY)}
                />
                <StatTile
                  icon={Clock}
                  label={t('pages:dashboard.watchTime')}
                  value={stats ? `${stats.watchTimeHours}h` : '-'}
                  compact={!isTablet}
                  onPress={() => router.push(ROUTES.ACTIVITY)}
                />
                <StatTile
                  icon={Users}
                  label={t('pages:dashboard.activeUsers')}
                  value={stats?.activeUsersToday ?? '-'}
                  compact={!isTablet}
                  onPress={() => router.push(ROUTES.USERS)}
                />
              </TileRow>
            </View>

            {/* Now Playing - Active Streams */}
            <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
              <SectionHeader
                icon={Tv}
                title={t('pages:dashboard.nowPlaying')}
                right={
                  hasActiveStreams ? (
                    <View className="flex-row items-center gap-2">
                      {busiest ? (
                        <View
                          className="flex-row items-center gap-1"
                          accessible
                          accessibilityLabel={[
                            isMultiServer ? busiest.server.name : null,
                            `${t('mobile:resources.cpu')} ${formatUtilization(busiest.cpu)}`,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        >
                          {isMultiServer ? (
                            <View
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 3,
                                backgroundColor:
                                  serverColor(busiest.server.id) ?? colors.icon.default,
                              }}
                            />
                          ) : null}
                          <Text
                            className="text-muted-foreground text-xs"
                            style={{ fontVariant: ['tabular-nums'] }}
                          >
                            {`${t('mobile:resources.cpu')} ${formatUtilization(busiest.cpu)}`}
                          </Text>
                        </View>
                      ) : null}
                      <View className="bg-muted rounded-full px-2 py-0.5">
                        <Text className="text-xs font-medium">
                          {t('common:count.stream', { count: sortedSessions.length })}
                        </Text>
                      </View>
                    </View>
                  ) : undefined
                }
              />
              {hasActiveStreams ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginHorizontal: nowPlayingColumns > 1 ? -spacing.sm / 2 : 0,
                  }}
                >
                  {sortedSessions.map((session) => (
                    <View
                      key={session.id}
                      style={{
                        width: `${100 / nowPlayingColumns}%`,
                        paddingHorizontal: nowPlayingColumns > 1 ? spacing.sm / 2 : 0,
                      }}
                    >
                      <NowPlayingCard
                        session={session}
                        onPress={() => router.push(ROUTES.SESSION(session.id))}
                        isMultiServer={isMultiServer}
                        serverColor={serverColor(session.server.id)}
                      />
                    </View>
                  ))}
                </View>
              ) : !sortedSessions ? (
                <Card className="py-8">
                  <View className="items-center">
                    <ActivityIndicator size="large" color={ACCENT_COLOR} />
                  </View>
                </Card>
              ) : (
                <Card>
                  <EmptyState
                    compact
                    icon={Tv}
                    title={t('pages:dashboard.noActiveStreams')}
                    description={t('pages:dashboard.streamsAppearHere')}
                  />
                </Card>
              )}
            </View>

            {/* Server load - under Now Playing, above the map, one card per server */}
            {resourceCards.length > 0 && (
              <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
                <SectionHeader icon={Activity} title={t('pages:dashboard.serverResources')} />
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginHorizontal: loadColumns > 1 ? -spacing.sm / 2 : 0,
                    rowGap: spacing.sm,
                  }}
                >
                  {resourceCards.map(({ server, stats }) => (
                    <View
                      key={server.id}
                      style={{
                        width: `${100 / loadColumns}%`,
                        paddingHorizontal: loadColumns > 1 ? spacing.sm / 2 : 0,
                      }}
                    >
                      <ServerLoadCard
                        stats={stats}
                        showNetwork={showNetwork}
                        showSystem={!isMultiServer}
                        serverName={isMultiServer ? server.name : undefined}
                        serverColor={isMultiServer ? serverColor(server.id) : undefined}
                        streamCount={isMultiServer ? streamCounts.get(server.id) : undefined}
                      />
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Stream Map - only show when there are active streams */}
            {hasActiveStreams && (
              <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
                <SectionHeader icon={MapPin} title={t('pages:dashboard.streamLocations')} />
                <StreamMap
                  sessions={sortedSessions}
                  height={mapHeight}
                  serverColor={isMultiServer ? serverColor : undefined}
                />
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Stack.Screen options={{ title: t('nav:dashboard'), ...androidHeaderOptions }} />
      <TabToolbar />
    </>
  );
}
