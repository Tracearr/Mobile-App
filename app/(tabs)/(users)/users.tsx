/**
 * Users tab - one row per person, with server-side search and sort and infinite scroll
 * Query keys are scoped by the global ServerScope selection for cache isolation
 *
 * Responsive layout:
 * - Phone: Single column, compact cards
 * - Tablet (md+): 2-column grid, larger avatars, joined date
 */
import { useState } from 'react';
import { View, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useRouter, Stack } from 'expo-router';
import { Users as UsersIcon, SearchX } from 'lucide-react-native';
import { api } from '@/lib/api';
import { nextPageOf, pageMetaOf } from '@/lib/listPage';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useDebounce } from '@/hooks/useDebounce';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import { TabToolbar, androidHeaderOptions } from '@/components/navigation/TabHeaderButtons';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { UserListItem } from '@/components/users/UserListItem';
import { UserListControls } from '@/components/users/UserListControls';
import { DEFAULT_SORT_DIR } from '@/components/users/identity';
import { spacing, ACCENT_COLOR } from '@/lib/theme';
import type { ServerUserWithIdentity, UserSortField } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 300;

export default function UsersScreen() {
  const { t } = useTranslation(['mobile', 'common', 'nav']);
  const router = useRouter();
  const { scope, servers } = useMediaServer();
  const { isTablet, select } = useResponsive();
  const [searchText, setSearchText] = useState('');
  const [orderBy, setOrderBy] = useState<UserSortField>('username');
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>(DEFAULT_SORT_DIR.username);

  const search = useDebounce(searchText, SEARCH_DEBOUNCE_MS).trim();

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const numColumns = isTablet ? 2 : 1;
  const showServers = servers.length > 1;

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isLoading,
    isError,
    error,
  } = useInfiniteQuery({
    queryKey: queryKeys.users.list(scope, { search, orderBy, orderDir }),
    queryFn: ({ pageParam, signal }) =>
      api.users.list(
        { page: pageParam, pageSize: PAGE_SIZE, scope, search, orderBy, orderDir },
        signal
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => nextPageOf(lastPage),
    staleTime: 1000 * 60,
    placeholderData: keepPreviousData,
  });

  const users = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0] ? pageMetaOf(data.pages[0]).total : null;

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const handleOrderByChange = (next: UserSortField) => {
    setOrderBy(next);
    setOrderDir(DEFAULT_SORT_DIR[next]);
  };

  const { controlKey, refreshControlProps } = usePullToRefresh(() => refetch());

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View className="items-center py-12">
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
        </View>
      );
    }
    if (isError && !data) {
      return <ErrorState message={error.message} onRetry={() => void refetch()} />;
    }
    if (search) {
      return (
        <EmptyState
          icon={SearchX}
          title={t('common:empty.noResults')}
          description={t('mobile:users.noUsersMatch', { query: search })}
        />
      );
    }
    return (
      <EmptyState
        icon={UsersIcon}
        title={t('mobile:users.noUsers')}
        description={t('mobile:users.usersWillAppear')}
      />
    );
  };

  return (
    <>
      <FlashList<ServerUserWithIdentity>
        data={users}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        extraData={showServers}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        renderItem={({ item, index }) => (
          <View
            style={{
              paddingLeft: isTablet && index % 2 === 1 ? spacing.sm / 2 : 0,
              paddingRight: isTablet && index % 2 === 0 ? spacing.sm / 2 : 0,
            }}
          >
            <UserListItem
              user={item}
              onPress={() => router.push(ROUTES.USER(item.id))}
              isTablet={isTablet}
              showServers={showServers}
            />
          </View>
        )}
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        }}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
        ListHeaderComponent={
          <View>
            <UserListControls
              search={searchText}
              onSearchChange={setSearchText}
              orderBy={orderBy}
              orderDir={orderDir}
              onOrderByChange={handleOrderByChange}
              onToggleOrderDir={() => setOrderDir((dir) => (dir === 'asc' ? 'desc' : 'asc'))}
            />
            {total !== null && (
              <Text className="text-muted-foreground mb-3 text-sm">
                {t('common:count.user', { count: total })}
              </Text>
            )}
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={ACCENT_COLOR} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={renderEmpty()}
      />

      <Stack.Screen options={{ title: t('nav:users'), ...androidHeaderOptions }} />
      <TabToolbar />
    </>
  );
}
