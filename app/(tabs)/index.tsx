/**
 * Dashboard tab - overview of streaming activity
 * Migrated to NativeWind
 */
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { StreamMap } from '@/components/map/StreamMap';
import { NowPlayingCard } from '@/components/sessions';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { colors } from '@/lib/theme';

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
      {unit && (
        <Text style={{ fontSize: 11, color: colors.text.muted.dark }}>{unit}</Text>
      )}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { serverName } = useAuthStore();

  const {
    data: stats,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: api.stats.dashboard,
  });

  const { data: activeSessions } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: api.sessions.active,
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.cyan.core} />
        }
      >
        {/* Server Name Header with Stats */}
        <View className="p-4 pt-3">
          <Text className="text-2xl font-bold">{serverName || 'Tracearr'}</Text>
          {stats && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 8,
              }}
            >
              <Text style={{ fontSize: 11, color: colors.text.muted.dark, fontWeight: '600', marginRight: 2 }}>
                TODAY
              </Text>
              <StatPill icon="play-circle-outline" value={stats.todayPlays} unit="plays" />
              <StatPill icon="time-outline" value={stats.watchTimeHours} unit="hrs" />
              <StatPill
                icon="warning-outline"
                value={stats.alertsLast24h}
                unit="alerts"
                color={stats.alertsLast24h > 0 ? colors.warning : colors.text.muted.dark}
              />
            </View>
          )}
        </View>

        {/* Now Playing - Active Streams */}
        <View className="px-4 mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide">
              Now Playing
            </Text>
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
            <View>
              {activeSessions.map((session) => (
                <NowPlayingCard
                  key={session.id}
                  session={session}
                  onPress={() => router.push(`/session/${session.id}` as never)}
                />
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
                <Text className="text-sm text-muted mt-1">Streams will appear here when users start watching</Text>
              </View>
            </Card>
          )}
        </View>

        {/* Stream Map - last component */}
        {activeSessions && activeSessions.length > 0 && (
          <View className="px-4">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Stream Locations
            </Text>
            <StreamMap sessions={activeSessions} height={200} />
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
