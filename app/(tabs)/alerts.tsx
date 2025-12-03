/**
 * Alerts tab - violations and alerts
 * Migrated to NativeWind
 */
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ViolationWithDetails } from '@tracearr/shared';

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

  return (
    <Card className="mb-3">
      {/* Header: User + Severity */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-1">
          <Text className="text-base font-semibold">
            {violation.user?.username || 'Unknown User'}
          </Text>
          <Text className="text-xs text-muted mt-0.5">
            {new Date(violation.createdAt).toLocaleString()}
          </Text>
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
    data: violationsData,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['violations'],
    queryFn: () => api.violations.list({ pageSize: 50 }),
  });

  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
    },
  });

  const violations = violationsData?.data || [];
  const unacknowledgedCount = violations.filter((v) => !v.acknowledgedAt).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
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
