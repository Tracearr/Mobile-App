/**
 * User Detail Screen
 * One /users/:id/full request per view. With no server picked the view covers the
 * whole person (scope=identity); picking a server narrows it to that one account,
 * the way web's ?scope= picker does. The global server selection does not apply here.
 *
 * Responsive layout:
 * - Phone: Single column, 64px avatar, 2x2 stats grid
 * - Tablet (md+): Responsive padding, 80px avatar, 1x4 stats row, 2-column Locations/Devices
 */
import { useState } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ObserveInteractiveMarker } from 'expo-observe';
import { Play, Clock, AlertTriangle, Activity, User } from 'lucide-react-native';
import type { Session } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import type { UserFullDetail } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useUserFull, useRequestsStatus } from '@/hooks';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { UserHeaderCard } from '@/components/users/UserHeaderCard';
import { UserStatsGrid } from '@/components/users/UserStatsGrid';
import { LinkedAccountsCard } from '@/components/users/LinkedAccountsCard';
import { UserRequestsCard } from '@/components/users/UserRequestsCard';
import { UserLocationsCard, UserDevicesCard } from '@/components/users/UserPlacesCards';
import { UserSessionsCard } from '@/components/users/UserSessionsCard';
import { UserViolationsCard } from '@/components/users/UserViolationsCard';
import { UserTerminationsCard } from '@/components/users/UserTerminationsCard';
import type { TrustEditTarget } from '@/components/users/TrustScoreEditor';
import { violationsPageFilter } from '@/components/users/identity';
import { formatWatchTime, safeFormatDate } from '@/lib/formatters';
import { haptics } from '@/lib/haptics';
import { colors, spacing, ACCENT_COLOR } from '@/lib/theme';

const ALL_ACCOUNTS = 'all';
const SEGMENTS_THAT_FIT = 3;

function ScopePicker({
  accounts,
  value,
  onChange,
}: {
  accounts: UserFullDetail['identity']['serverUsers'];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation(['pages']);
  const options = [
    { value: ALL_ACCOUNTS, label: t('pages:userDetail.allServers') },
    ...accounts.map((account) => ({ value: account.id, label: account.serverName })),
  ];
  const fits = options.length <= SEGMENTS_THAT_FIT;

  const control = (
    <SegmentedControl
      accessibilityLabel={t('pages:userDetail.serverScope')}
      options={options}
      value={value}
      fullWidth={fits}
      onChange={(next) => {
        if (next === value) return;
        haptics.selection();
        onChange(next);
      }}
    />
  );

  return (
    <View className="mb-4">
      {fits ? (
        control
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {control}
        </ScrollView>
      )}
    </View>
  );
}

export default function UserDetailScreen() {
  const { t } = useTranslation(['mobile', 'common', 'pages']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isTablet, select } = useResponsive();
  const isOwner = useAuthStateStore((state) => state.user?.role === 'owner');
  const { configured: requestsConfigured } = useRequestsStatus();

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TrustEditTarget | null>(null);
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const avatarSize = isTablet ? 80 : 64;

  // The person query stays mounted while an account is picked: it feeds the picker
  // and the linked accounts, so switching scope never blanks the whole screen.
  const person = useUserFull(id, 'identity');
  const account = useUserFull(selectedAccountId ?? '', 'account');

  const isAllScope = selectedAccountId === null;
  const view = isAllScope ? person : account;
  const effectiveId = selectedAccountId ?? id;
  const scope = isAllScope ? 'identity' : 'account';

  const identity = person.data?.identity;
  const identityUserId = identity?.userId;

  const handleRefresh = async () => {
    await Promise.all([
      person.refetch(),
      isAllScope ? undefined : account.refetch(),
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.user(effectiveId, scope) }),
    ]);
    queryClient.removeQueries({ queryKey: queryKeys.users.sessions(effectiveId, scope) });
    queryClient.removeQueries({ queryKey: queryKeys.users.terminations(effectiveId, scope) });
    if (identityUserId) {
      queryClient.removeQueries({
        queryKey: queryKeys.violations.byUser(
          violationsPageFilter(scope, effectiveId, identityUserId)
        ),
      });
    }
    setRefreshGeneration((generation) => generation + 1);
  };

  const { controlKey, refreshControlProps } = usePullToRefresh(handleRefresh);

  const handleScopeChange = (value: string) => {
    setEditTarget(null);
    setSelectedAccountId(value === ALL_ACCOUNTS ? null : value);
  };

  const handleSessionPress = (session: Session) => {
    router.push(ROUTES.SESSION(session.id));
  };

  if (!person.data || !identity) {
    const isNotFound =
      !person.error || (isAxiosError(person.error) && person.error.response?.status === 404);
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        {person.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={ACCENT_COLOR} />
          </View>
        ) : isNotFound ? (
          <EmptyState
            className="flex-1 justify-center"
            icon={User}
            title={t('pages:userDetail.userNotFound')}
            description={t('mobile:userDetail.userMayBeRemoved')}
            action={{ label: t('common:actions.back'), onPress: () => router.back() }}
          />
        ) : (
          <ErrorState
            className="flex-1 justify-center"
            message={person.error.message}
            onRetry={() => void person.refetch()}
          />
        )}
      </SafeAreaView>
    );
  }

  const isMergedIdentity = identity.serverUsers.length > 1;
  const showServer = isAllScope && isMergedIdentity;
  const detail = view.data;
  const sectionKey = `${effectiveId}-${scope}-${refreshGeneration}`;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <Stack.Screen
        options={{ title: person.data.user.identityName ?? person.data.user.username }}
      />
      <ObserveInteractiveMarker />
      <ScrollView
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        }}
        refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
      >
        {isMergedIdentity && (
          <ScopePicker
            accounts={identity.serverUsers}
            value={selectedAccountId ?? ALL_ACCOUNTS}
            onChange={handleScopeChange}
          />
        )}

        {!detail ? (
          view.isError ? (
            <ErrorState message={view.error.message} onRetry={() => void view.refetch()} />
          ) : (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={ACCENT_COLOR} />
            </View>
          )
        ) : (
          <>
            <UserHeaderCard
              user={detail.user}
              identity={identity}
              isAllScope={isAllScope}
              avatarSize={avatarSize}
              canEditTrust={isOwner}
              editTarget={editTarget}
              onEditTrust={setEditTarget}
            />

            <UserStatsGrid
              isTablet={isTablet}
              stats={[
                {
                  icon: Play,
                  label: t('pages:userDetail.sessions'),
                  value: detail.user.stats.totalSessions,
                },
                {
                  icon: AlertTriangle,
                  label: t('pages:userDetail.violations'),
                  value: detail.violations.total,
                },
                {
                  icon: Clock,
                  label: t('common:labels.joined'),
                  value: safeFormatDate(
                    detail.user.joinedAt ?? detail.user.createdAt,
                    'MMM d, yyyy',
                    t('common:labels.unknown')
                  ),
                },
                {
                  icon: Activity,
                  label: t('common:labels.lastActivity'),
                  value: safeFormatDate(
                    detail.user.lastActivityAt,
                    'MMM d, yyyy',
                    t('common:labels.never')
                  ),
                },
              ]}
            />
            {!isAllScope && isMergedIdentity && (
              <Text className="text-muted-foreground -mt-2 mb-4 text-xs">
                {t('pages:userDetail.acrossAllServers')}{' '}
                {t('common:count.session', { count: identity.stats.totalSessions })} ·{' '}
                {formatWatchTime(identity.stats.totalWatchTime)}
              </Text>
            )}

            {isMergedIdentity && (
              <LinkedAccountsCard
                accounts={identity.serverUsers}
                canEditTrust={isOwner}
                editTarget={editTarget}
                onEditTrust={setEditTarget}
              />
            )}

            {requestsConfigured && <UserRequestsCard userId={effectiveId} scope={scope} />}

            <View
              style={{
                flexDirection: isTablet ? 'row' : 'column',
                gap: spacing.md,
                marginBottom: spacing.md,
              }}
            >
              <UserLocationsCard
                locations={detail.locations}
                style={{ flex: isTablet ? 1 : undefined }}
              />
              <UserDevicesCard
                devices={detail.devices}
                style={{ flex: isTablet ? 1 : undefined }}
              />
            </View>

            <UserSessionsCard
              key={`sessions-${sectionKey}`}
              userId={effectiveId}
              first={detail.sessions}
              scope={scope}
              showServer={showServer}
              onSessionPress={handleSessionPress}
            />

            <UserViolationsCard
              key={`violations-${sectionKey}`}
              filter={violationsPageFilter(scope, effectiveId, identity.userId)}
              first={detail.violations}
              showServer={showServer}
            />

            <UserTerminationsCard
              key={`terminations-${sectionKey}`}
              userId={effectiveId}
              first={detail.terminations}
              scope={scope}
              showServer={showServer}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
