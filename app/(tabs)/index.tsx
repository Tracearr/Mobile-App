/**
 * Dashboard tab - overview of streaming activity
 * Query keys include selectedServerId for proper cache isolation per media server
 *
 * Responsive layout:
 * - Phone: Single column, stacked cards
 * - Tablet (md+): 2-column grid for Now Playing, larger map
 * - Large tablet (lg+): 3-column grid for Now Playing
 */
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useServerStatistics } from '@/hooks/useServerStatistics';
import { useResponsive } from '@/hooks/useResponsive';
import { StreamMap } from '@/components/map/StreamMap';
import { NowPlayingCard } from '@/components/sessions';
import { ServerResourceCard } from '@/components/server/ServerResourceCard';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { colors, spacing } from '@/lib/theme';

/**
 * Compact stat pill for dashboard summary bar
 */
function StatPill({
  icon,
  value,
  unit,
  color = colors.text.secondary.dark,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  unit?: string;
  color?: string;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.card.dark,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
      }}
    >
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text.primary.dark }}>
        {value}
      </Text>
      {unit && <Text style={{ fontSize: 11, color: colors.text.muted.dark }}>{unit}</Text>}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { selectedServerId, selectedServer } = useMediaServer();
  const { isTablet, columns, select } = useResponsive();

  const {
    data: stats,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard', 'stats', selectedServerId],
    queryFn: () => api.stats.dashboard(selectedServerId ?? undefined),
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['sessions', 'active', selectedServerId],
    queryFn: () => api.sessions.active(selectedServerId ?? undefined),
    staleTime: 1000 * 15, // 15 seconds - match web
    refetchInterval: 1000 * 30, // 30 seconds - fallback if WebSocket events missed
  });

  // Only show server resources for Plex servers
  const isPlexServer = selectedServer?.type === 'plex';

  // Poll server statistics only when dashboard is visible and we have a Plex server
  const {
    latest: serverResources,
    isLoadingData: resourcesLoading,
    error: resourcesError,
  } = useServerStatistics(selectedServerId ?? undefined, isPlexServer);

  // Responsive values
  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const mapHeight = select({ base: 200, md: 280, lg: 320 });
  const nowPlayingColumns = columns.cards; // 1 on phone, 2 on tablet, 3 on large tablet

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.cyan.core}
          />
        }
      >
        {/* Today's Stats Bar */}
        {stats && (
          <View style={{ paddingHorizontal: horizontalPadding, paddingTop: 12, paddingBottom: 8 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: isTablet ? 12 : 8,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  color: colors.text.muted.dark,
                  fontWeight: '600',
                  marginRight: 2,
                }}
              >
                TODAY
              </Text>
              <StatPill icon="play-circle-outline" value={stats.todayPlays} unit="plays" />
              <StatPill icon="time-outline" value={stats.watchTimeHours} unit="hrs" />
              {isTablet && (
                <StatPill icon="people-outline" value={stats.activeUsersToday} unit="users" />
              )}
              <StatPill
                icon="warning-outline"
                value={stats.alertsLast24h}
                unit="alerts"
                color={stats.alertsLast24h > 0 ? colors.warning : colors.text.muted.dark}
              />
            </View>
          </View>
        )}

        {/* Now Playing - Active Streams */}
        <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <Ionicons name="tv-outline" size={18} color={colors.cyan.core} />
              <Text className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Now Playing
              </Text>
            </View>
            {activeSessions && activeSessions.length > 0 && (
              <View
                style={{
                  backgroundColor: 'rgba(24, 209, 231, 0.15)',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: colors.cyan.core, fontSize: 12, fontWeight: '600' }}>
                  {activeSessions.length} {activeSessions.length === 1 ? 'stream' : 'streams'}
                </Text>
              </View>
            )}
          </View>
          {activeSessions && activeSessions.length > 0 ? (
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                marginHorizontal: isTablet ? -spacing.sm / 2 : 0,
              }}
            >
              {activeSessions.map((session) => (
                <View
                  key={session.id}
                  style={{
                    width: isTablet ? `${100 / nowPlayingColumns}%` : '100%',
                    paddingHorizontal: isTablet ? spacing.sm / 2 : 0,
                  }}
                >
                  <NowPlayingCard
                    session={session}
                    onPress={() => router.push(`/session/${session.id}` as never)}
                  />
                </View>
              ))}
            </View>
          ) : (
            <Card className="py-8">
              <View className="items-center">
                <View
                  style={{
                    backgroundColor: colors.surface.dark,
                    padding: 16,
                    borderRadius: 999,
                    marginBottom: 12,
                  }}
                >
                  <Ionicons name="tv-outline" size={32} color={colors.text.muted.dark} />
                </View>
                <Text className="text-base font-semibold">No active streams</Text>
                <Text className="text-muted-foreground mt-1 text-sm">
                  Streams will appear here when users start watching
                </Text>
              </View>
            </Card>
          )}
        </View>

        {/* Stream Map - only show when there are active streams */}
        {activeSessions && activeSessions.length > 0 && (
          <View style={{ marginBottom: spacing.md, paddingHorizontal: horizontalPadding }}>
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="location-outline" size={18} color={colors.cyan.core} />
              <Text className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Stream Locations
              </Text>
            </View>
            <StreamMap sessions={activeSessions} height={mapHeight} />
          </View>
        )}

        {/* Server Resources - only show if Plex server is active */}
        {isPlexServer && (
          <View style={{ paddingHorizontal: horizontalPadding }}>
            <View className="mb-3 flex-row items-center gap-2">
              <Ionicons name="server-outline" size={18} color={colors.cyan.core} />
              <Text className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                Server Resources
              </Text>
            </View>
            <ServerResourceCard
              latest={serverResources}
              isLoading={resourcesLoading}
              error={resourcesError}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
