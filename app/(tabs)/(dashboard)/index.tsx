/**
 * Dashboard tab - overview of streaming activity
 * Supports multi-server selection with colored cards and map markers
 *
 * Responsive layout:
 * - Phone: Single column, stacked cards
 * - Tablet (md+): 2-column grid for Now Playing, larger map
 * - Large tablet (lg+): 3-column grid for Now Playing
 */
import { useMemo } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { useRouter, Stack } from 'expo-router';
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
import { useResponsive } from '@/hooks/useResponsive';
import { TabToolbar, androidHeaderOptions } from '@/components/navigation/TabHeaderButtons';
import { StreamMap } from '@/components/map/StreamMap';
import { NowPlayingCard } from '@/components/sessions';
import { ServerResourceCard } from '@/components/server/ServerResourceCard';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { spacing, ACCENT_COLOR } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';
import { ObserveInteractiveMarker } from 'expo-observe';

const TILE_GAP = spacing.sm;

/**
 * Web's StatCard: tinted icon, value over label, and the whole tile opens the matching screen
 */
function StatTile({
  icon: Icon,
  label,
  value,
  subValue,
  width,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
  width: `${number}%`;
  onPress: () => void;
}) {
  return (
    <View style={{ width, padding: TILE_GAP / 2 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${value}`}
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
  const { t } = useTranslation(['pages', 'common', 'nav']);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { servers, selectedServers, isMultiServer, scope } = useMediaServer();
  const { isTablet, columns, select } = useResponsive();

  const serverColorMap = useMemo(
    () => new Map(servers.map((s) => [s.id, s.color ?? null])),
    [servers]
  );

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

  const resourceServers = useMemo(
    () =>
      [...selectedServers].sort(
        (a, b) => (serverOrderMap.get(a.id) ?? 0) - (serverOrderMap.get(b.id) ?? 0)
      ),
    [selectedServers, serverOrderMap]
  );
  const liveStats = useServerLiveStats(resourceServers.map((s) => s.id));
  // Plex always has a stats source, so its card always shows. A Jellyfin/Emby
  // card shows only while its SSE plugin is reporting: keying on the retained
  // window instead would park an empty card on screen until the window drains.
  const resourceCards = resourceServers.flatMap((server, index) => {
    const stats = liveStats[index];
    if (!stats) return [];
    return server.type === 'plex' || stats.latest !== null ? [{ server, stats }] : [];
  });

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

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const mapHeight = select({ base: 200, md: 280, lg: 320 });
  const nowPlayingColumns = columns.cards;
  const tileWidth = isTablet ? '25%' : '50%';

  const loadError = (!stats && statsError) || (!activeSessions && sessionsError) || null;
  const hasActiveStreams = !!sortedSessions && sortedSessions.length > 0;

  return (
    <>
      <ObserveInteractiveMarker />
      <ScrollView
        style={{ flex: 1 }}
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
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', margin: -TILE_GAP / 2 }}>
                <StatTile
                  icon={TriangleAlert}
                  label={t('pages:dashboard.alerts')}
                  value={stats?.alertsLast24h ?? '-'}
                  width={tileWidth}
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
                  width={tileWidth}
                  onPress={() => router.push(ROUTES.HISTORY)}
                />
                <StatTile
                  icon={Clock}
                  label={t('pages:dashboard.watchTime')}
                  value={stats ? `${stats.watchTimeHours}h` : '-'}
                  width={tileWidth}
                  onPress={() => router.push(ROUTES.ACTIVITY)}
                />
                <StatTile
                  icon={Users}
                  label={t('pages:dashboard.activeUsers')}
                  value={stats?.activeUsersToday ?? '-'}
                  width={tileWidth}
                  onPress={() => router.push(ROUTES.USERS)}
                />
              </View>
            </View>

            {/* Now Playing - Active Streams */}
            <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
              <SectionHeader
                icon={Tv}
                title={t('pages:dashboard.nowPlaying')}
                right={
                  hasActiveStreams ? (
                    <View className="bg-muted rounded-full px-2 py-0.5">
                      <Text className="text-xs font-medium">
                        {t('common:count.stream', { count: sortedSessions.length })}
                      </Text>
                    </View>
                  ) : undefined
                }
              />
              {hasActiveStreams ? (
                <View
                  style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginHorizontal: isTablet ? -spacing.sm / 2 : 0,
                  }}
                >
                  {sortedSessions.map((session) => (
                    <View
                      key={session.id}
                      style={{
                        width: isTablet ? `${100 / nowPlayingColumns}%` : '100%',
                        paddingHorizontal: isTablet ? spacing.sm / 2 : 0,
                      }}
                    >
                      <NowPlayingCard
                        session={session}
                        onPress={() => router.push(ROUTES.SESSION(session.id))}
                        isMultiServer={isMultiServer}
                        serverColor={serverColorMap.get(session.server.id)}
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

            {/* Stream Map - only show when there are active streams */}
            {hasActiveStreams && (
              <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
                <SectionHeader icon={MapPin} title={t('pages:dashboard.streamLocations')} />
                <StreamMap
                  sessions={sortedSessions}
                  height={mapHeight}
                  serverColorMap={isMultiServer ? serverColorMap : undefined}
                />
              </View>
            )}

            {/* Server Resources - one card per server with a stats source */}
            {resourceCards.length > 0 && (
              <View style={{ paddingHorizontal: horizontalPadding }}>
                <SectionHeader icon={Activity} title={t('pages:dashboard.serverResources')} />
                <View style={{ gap: spacing.sm }}>
                  {resourceCards.map(({ server, stats }) => (
                    <ServerResourceCard
                      key={server.id}
                      serverType={server.type}
                      latest={stats.latest}
                      isLoading={stats.isLoading}
                      error={stats.error}
                      serverName={isMultiServer ? server.name : undefined}
                      serverColor={isMultiServer ? serverColorMap.get(server.id) : undefined}
                      showSystem={!isMultiServer}
                    />
                  ))}
                </View>
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
