/**
 * Alerts tab - violations with infinite scroll
 */
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { colors } from '@/lib/theme';
import type { ViolationWithDetails } from '@tracearr/shared';

const PAGE_SIZE = 50;

function SeverityBadge({ severity }: { severity: string }) {
  const variant =
    severity === 'critical' || severity === 'high'
      ? 'destructive'
      : severity === 'warning'
        ? 'warning'
        : 'default';

  return (
    <Badge variant={variant} className="capitalize">
      {severity}
    </Badge>
  );
}

function ViolationCard({
  violation,
  onAcknowledge,
}: {
  violation: ViolationWithDetails;
  onAcknowledge: () => void;
}) {
  const ruleTypeLabels: Record<string, string> = {
    impossible_travel: 'Impossible Travel',
    simultaneous_locations: 'Simultaneous Locations',
    device_velocity: 'Device Velocity',
    concurrent_streams: 'Concurrent Streams',
    geo_restriction: 'Geo Restriction',
  };

  const username = violation.user?.username || 'Unknown User';

  return (
    <Card className="mb-3">
      {/* Header: User + Severity */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <UserAvatar
            thumbUrl={violation.user?.thumbUrl}
            username={username}
            size={36}
          />
          <View className="flex-1">
            <Text className="text-base font-semibold">{username}</Text>
            <Text className="text-xs text-muted mt-0.5">
              {new Date(violation.createdAt).toLocaleString()}
            </Text>
          </View>
        </View>
        <SeverityBadge severity={violation.severity} />
      </View>

      {/* Content: Rule Type + Details */}
      <View className="mb-2">
        <Text className="text-sm font-medium text-cyan-core mb-1">
          {ruleTypeLabels[violation.rule?.type || ''] || violation.rule?.type || 'Unknown Rule'}
        </Text>
        <Text className="text-sm text-muted leading-5" numberOfLines={2}>
          {violation.data ? JSON.stringify(violation.data) : 'No details available'}
        </Text>
      </View>

      {/* Action Button */}
      {!violation.acknowledgedAt ? (
        <Pressable
          className="bg-cyan-core/20 py-2 rounded-md items-center active:opacity-70"
          onPress={onAcknowledge}
        >
          <Text className="text-sm font-semibold text-cyan-core">Acknowledge</Text>
        </Pressable>
      ) : (
        <View className="bg-success/10 py-2 rounded-md items-center">
          <Text className="text-sm text-success">Acknowledged</Text>
        </View>
      )}
    </Card>
  );
}

export default function AlertsScreen() {
  const queryClient = useQueryClient();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: ['violations'],
    queryFn: ({ pageParam = 1 }) => api.violations.list({ page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
  });

  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });

  // Flatten all pages into single array
  const violations = data?.pages.flatMap((page) => page.data) || [];
  const unacknowledgedCount = violations.filter((v) => !v.acknowledgedAt).length;

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#09090B' }} edges={['left', 'right']}>
      <FlatList
        data={violations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ViolationCard
            violation={item}
            onAcknowledge={() => acknowledgeMutation.mutate(item.id)}
          />
        )}
        contentContainerClassName="p-4 pt-3"
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#18D1E7"
          />
        }
        ListHeaderComponent={
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-lg font-semibold">Alerts</Text>
            {unacknowledgedCount > 0 && (
              <View className="bg-destructive/20 px-2 py-1 rounded-sm">
                <Text className="text-sm font-medium text-destructive">
                  {unacknowledgedCount} new
                </Text>
              </View>
            )}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="py-4 items-center">
              <ActivityIndicator size="small" color={colors.cyan.core} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-success/10 border border-success/20 items-center justify-center mb-4">
              <Text className="text-2xl text-success">0</Text>
            </View>
            <Text className="text-lg font-semibold mb-1">No Alerts</Text>
            <Text className="text-sm text-muted text-center px-4">
              Rule violations will appear here when detected
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
