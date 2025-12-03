/**
 * Activity tab - active sessions and history
 * Migrated to NativeWind
 */
import { View, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useSocket } from '@/providers/SocketProvider';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ActiveSession } from '@tracearr/shared';

function SessionCard({ session }: { session: ActiveSession }) {
  const progressPercent = session.progressMs && session.totalDurationMs
    ? Math.round((session.progressMs / session.totalDurationMs) * 100)
    : 0;

  return (
    <Card className="mb-3">
      {/* Header: User + Badge */}
      <View className="flex-row justify-between items-center mb-2">
        <View className="flex-row items-center gap-2">
          <View className="w-10 h-10 rounded-full bg-cyan-dark items-center justify-center">
            <Text className="text-lg font-bold">
              {session.user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View>
            <Text className="text-base font-semibold">{session.user.username}</Text>
            <Text className="text-xs text-muted">
              {session.playerName || session.platform || 'Unknown Device'}
            </Text>
          </View>
        </View>
        <Badge variant={session.isTranscode ? 'warning' : 'success'}>
          {session.isTranscode ? 'Transcode' : 'Direct'}
        </Badge>
      </View>

      {/* Media Info */}
      <View className="mb-2">
        <Text className="text-base" numberOfLines={1}>
          {session.mediaTitle || 'Unknown Media'}
        </Text>
        {session.grandparentTitle && (
          <Text className="text-sm text-muted mt-0.5" numberOfLines={1}>
            {session.grandparentTitle}
            {session.seasonNumber !== null && ` • S${session.seasonNumber}E${session.episodeNumber}`}
          </Text>
        )}
      </View>

      {/* Footer: Location + Progress */}
      <View className="flex-row justify-between items-center pt-2 border-t border-border">
        <Text className="text-xs text-muted">
          {session.geoCity || session.ipAddress || 'Unknown Location'}
        </Text>
        <Text className="text-sm font-semibold text-cyan-core">
          {progressPercent}%
        </Text>
      </View>
    </Card>
  );
}

export default function ActivityScreen() {
  const { isConnected } = useSocket();

  const {
    data: activeSessions,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['sessions', 'active'],
    queryFn: api.sessions.active,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <FlatList
        data={activeSessions || []}
        keyExtractor={(item) => item.sessionKey || item.id}
        renderItem={({ item }) => <SessionCard session={item} />}
        contentContainerClassName="p-4 pt-3"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#18D1E7"
          />
        }
        ListHeaderComponent={
          <View className="flex-row justify-between items-start mb-3">
            <View className="gap-1">
              <Text className="text-lg font-semibold">Active Streams</Text>
              <View className="flex-row items-center gap-1">
                <View
                  className={cn(
                    'w-2 h-2 rounded-full',
                    isConnected ? 'bg-success' : 'bg-muted'
                  )}
                />
                <Text className="text-xs text-muted">
                  {isConnected ? 'Live' : 'Offline'}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-muted">
              {activeSessions?.length || 0} {(activeSessions?.length || 0) === 1 ? 'stream' : 'streams'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-card border border-border items-center justify-center mb-4">
              <Text className="text-2xl text-muted">0</Text>
            </View>
            <Text className="text-lg font-semibold mb-1">No Active Streams</Text>
            <Text className="text-sm text-muted text-center">
              When users start streaming, they&apos;ll appear here
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
