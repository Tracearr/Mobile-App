/**
 * Users tab - user list and management
 */
import { View, Text, StyleSheet, FlatList, RefreshControl, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
import type { ServerUserWithIdentity } from '@tracearr/shared';

function TrustScoreBadge({ score }: { score: number }) {
  let color = colors.success;
  if (score < 50) color = colors.error;
  else if (score < 75) color = colors.warning;

  return (
    <View style={[styles.trustBadge, { backgroundColor: color + '20' }]}>
      <Text style={[styles.trustScore, { color }]}>{score}</Text>
    </View>
  );
}

function UserCard({ user, onPress }: { user: ServerUserWithIdentity; onPress: () => void }) {
  return (
    <Pressable style={styles.userCard} onPress={onPress}>
      <View style={styles.userInfo}>
        <View style={styles.avatar}>
          {user.thumbUrl ? (
            <View style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {user.username.charAt(0).toUpperCase()}
            </Text>
          )}
        </View>
        <View style={styles.userDetails}>
          <Text style={styles.username}>{user.username}</Text>
          <Text style={styles.userMeta}>
            {user.role === 'owner' ? 'Owner' : 'User'}
          </Text>
        </View>
      </View>
      <TrustScoreBadge score={user.trustScore} />
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <UserCard
            user={item}
            onPress={() => router.push(`/user/${item.id}` as never)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.cyan.core}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Users</Text>
            <Text style={styles.headerCount}>
              {users.length} {users.length === 1 ? 'user' : 'users'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyTitle}>No Users</Text>
            <Text style={styles.emptySubtitle}>
              Users will appear here after syncing with your media server
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  listContent: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  headerCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
  },
  userCard: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border.dark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blue.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: typography.fontSize.xl,
    fontWeight: 'bold',
    color: colors.text.primary.dark,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  userMeta: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
    marginTop: 2,
  },
  trustBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
    minWidth: 40,
    alignItems: 'center',
  },
  trustScore: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: '600',
    color: colors.text.primary.dark,
    marginBottom: spacing.xs,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.muted.dark,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
});
