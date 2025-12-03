/**
 * Users tab - user list and management
 * Migrated to NativeWind
 */
import { View, FlatList, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ServerUserWithIdentity } from '@tracearr/shared';

function TrustScoreBadge({ score }: { score: number }) {
  const variant = score < 50 ? 'destructive' : score < 75 ? 'warning' : 'success';

  return (
    <View
      className={cn(
        'px-2 py-1 rounded-sm min-w-[40px] items-center',
        variant === 'destructive' && 'bg-destructive/20',
        variant === 'warning' && 'bg-warning/20',
        variant === 'success' && 'bg-success/20'
      )}
    >
      <Text
        className={cn(
          'text-sm font-semibold',
          variant === 'destructive' && 'text-destructive',
          variant === 'warning' && 'text-warning',
          variant === 'success' && 'text-success'
        )}
      >
        {score}
      </Text>
    </View>
  );
}

function UserCard({ user, onPress }: { user: ServerUserWithIdentity; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card className="flex-row items-center justify-between mb-2 p-3">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-12 h-12 rounded-full bg-cyan-dark items-center justify-center">
            <Text className="text-xl font-bold">
              {user.username.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold">{user.username}</Text>
            <Text className="text-sm text-muted mt-0.5">
              {user.role === 'owner' ? 'Owner' : 'User'}
            </Text>
          </View>
        </View>
        <TrustScoreBadge score={user.trustScore} />
      </Card>
    </Pressable>
  );
}

export default function UsersScreen() {
  const router = useRouter();

  const {
    data: usersData,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.users.list(),
  });

  const users = usersData?.data || [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onPress={() => router.push(`/user/${item.id}` as never)}
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
            <Text className="text-lg font-semibold">Users</Text>
            <Text className="text-sm text-muted">
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-12">
            <View className="w-16 h-16 rounded-full bg-card border border-border items-center justify-center mb-4">
              <Text className="text-2xl text-muted">0</Text>
            </View>
            <Text className="text-lg font-semibold mb-1">No Users</Text>
            <Text className="text-sm text-muted text-center px-4">
              Users will appear here after syncing with your media server
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
