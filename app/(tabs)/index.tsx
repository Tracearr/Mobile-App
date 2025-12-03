/**
 * Dashboard tab - overview of streaming activity
 * Migrated to NativeWind
 */
import { View, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/authStore';
import { StreamMap } from '@/components/map/StreamMap';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <View className="w-1/2 p-1">
      <Card className="p-3">
        <Text className="text-xs text-muted uppercase tracking-wide">{title}</Text>
        <Text className="text-xl font-bold mt-1">{value}</Text>
        {subtitle && <Text className="text-xs text-muted mt-0.5">{subtitle}</Text>}
      </Card>
    </View>
  );
}

export default function DashboardScreen() {
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
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#18D1E7" />
        }
      >
        {/* Server Name Header */}
        <View className="p-4 pt-3">
          <Text className="text-2xl font-bold">{serverName || 'Tracearr'}</Text>
          <Text className="text-sm text-muted mt-1">Stream Monitor</Text>
        </View>

        {/* Active Streams */}
        <View className="px-4 mb-4">
          <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Now Playing
          </Text>
          <Card>
            {activeSessions && activeSessions.length > 0 ? (
              <View className="items-center py-4">
                <Text className="text-4xl font-bold text-cyan-core">{activeSessions.length}</Text>
                <Text className="text-base text-muted mt-1">
                  Active {activeSessions.length === 1 ? 'Stream' : 'Streams'}
                </Text>
              </View>
            ) : (
              <View className="items-center py-6">
                <Text className="text-base text-muted">No active streams</Text>
              </View>
            )}
          </Card>
        </View>

        {/* Stream Map */}
        {activeSessions && activeSessions.length > 0 && (
          <View className="px-4 mb-4">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Stream Locations
            </Text>
            <StreamMap sessions={activeSessions} height={200} />
          </View>
        )}

        {/* Stats Grid */}
        {stats && (
          <View className="px-4 mb-4">
            <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Today
            </Text>
            <View className="flex-row flex-wrap -m-1">
              <StatCard title="Active Streams" value={stats.activeStreams} />
              <StatCard title="Plays Today" value={stats.todayPlays} />
              <StatCard title="Watch Time" value={stats.watchTimeHours} subtitle="hours" />
              <StatCard title="Alerts (24h)" value={stats.alertsLast24h} />
            </View>
          </View>
        )}

        {/* Quick Stats */}
        <View className="px-4 mb-4">
          <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
            Activity
          </Text>
          <Card className="p-3">
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-base text-muted">Alerts Today</Text>
              <Text
                className={cn(
                  'text-lg font-semibold',
                  stats?.alertsLast24h ? 'text-destructive' : 'text-success'
                )}
              >
                {stats?.alertsLast24h || 0}
              </Text>
            </View>
            <View className="h-px bg-border my-1" />
            <View className="flex-row justify-between items-center py-2">
              <Text className="text-base text-muted">Plays Today</Text>
              <Text className="text-lg font-semibold">{stats?.todayPlays || 0}</Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
