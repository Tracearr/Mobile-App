/**
 * User Detail Screen
 * One /users/:id/full request per view. With no server picked the view covers the
 * whole person (scope=identity); picking a server narrows it to that one account,
 * the way web's ?scope= picker does. The global server selection does not apply here.
 *
 * Sections, as on web: Overview, Sessions, Requests (when configured) and Violations,
 * with termination history under Violations. The person's header and the picker scroll
 * with the content; the section control sticks to the top once it gets there. The section
 * lives in the route's `tab` param when pushed and in detailMemory when embedded, under
 * the opened detail's `mem` token; a fold or unfold hands the token to the other copy, and
 * closing forgets it.
 *
 * Responsive layout:
 * - Phone: Single column, 64px avatar, 2x2 stats grid
 * - Tablet (md+): Responsive padding, 80px avatar, 1x4 stats row, 2-column Locations/Devices
 */
import { useEffect, useState } from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Play, Clock, AlertTriangle, Activity, User } from 'lucide-react-native';
import type { ServerUserFullDetail, Session } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import type { UserDetailScope } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { profilesInView } from '@/lib/profiles';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useUserFull, useRequestsStatus } from '@/hooks';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import { useScrollMemory } from '@/hooks/useScrollMemory';
import { useStackRoutes } from '@/hooks/useOpenInTabs';
import { rememberTab, scrollKey } from '@/lib/detailMemory';
import { parseUserTab, userTabs, type UserTab } from '@/lib/userTabs';
import type { UserDetailProps } from './detail-props';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ScrollingSegments } from '@/components/users/ScrollingSegments';
import { SectionTabs } from '@/components/ui/section-tabs';
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
import { DATE_OPTIONS, formatWatchTime, safeFormatDate } from '@/lib/dateFormat';
import { useDateConventions } from '@/lib/dateSettings';
import { colors, spacing, ACCENT_COLOR } from '@/lib/theme';

const ALL_ACCOUNTS = 'all';

function ScopePicker({
  accounts,
  value,
  onChange,
}: {
  accounts: ServerUserFullDetail['identity']['serverUsers'];
  value: string;
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation(['pages']);
  return (
    <ScrollingSegments
      accessibilityLabel={t('pages:userDetail.serverScope')}
      options={[
        { value: ALL_ACCOUNTS, label: t('pages:userDetail.allServers') },
        ...accounts.map((account) => ({ value: account.id, label: account.serverName })),
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

export function UserDetail({
  id,
  mem,
  embedded = false,
  onBack,
  tab: tabParam,
  onTabChange,
}: UserDetailProps) {
  useDateConventions();
  const { t } = useTranslation(['mobile', 'common', 'pages', 'nav']);
  const router = useRouter();
  const routes = useStackRoutes();
  const queryClient = useQueryClient();
  const { isTablet, horizontalPadding: screenPadding } = useResponsive();
  const horizontalPadding = embedded ? spacing.md : screenPadding;
  const isOwner = useAuthStateStore((state) => state.user?.role === 'owner');
  const { configured: requestsConfigured } = useRequestsStatus();
  const tab = parseUserTab(tabParam, userTabs(requestsConfigured));
  const [tabsY, setTabsY] = useState<number>();
  const scrollProps = useScrollMemory(scrollKey(mem, tab), tabsY);

  useEffect(() => {
    if (tabParam === undefined || tab === tabParam) rememberTab(mem, tab);
  }, [mem, tab, tabParam]);

  const handleTabChange = (next: UserTab) => {
    if (embedded) onTabChange?.(next);
    else router.setParams({ tab: next === 'overview' ? undefined : next });
  };

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<TrustEditTarget | null>(null);
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  const avatarSize = isTablet ? 80 : 64;

  // The person query stays mounted while an account is picked: it feeds the picker
  // and the linked accounts, so switching scope never blanks the whole screen.
  const person = useUserFull(id, 'identity');
  const account = useUserFull(selectedAccountId ?? '', 'account');

  const isAllScope = selectedAccountId === null;
  const view = isAllScope ? person : account;
  const effectiveId = selectedAccountId ?? id;
  const scope: UserDetailScope = isAllScope ? 'identity' : 'account';

  // A scope switch keeps the last loaded account on screen, dimmed, while the
  // new one loads, so the header, the section row and the offset stay put. A
  // failed fetch drops it, so nothing of the old account can be acted on.
  const [last, setLast] = useState<{
    detail: ServerUserFullDetail;
    id: string;
    scope: UserDetailScope;
  }>();
  if (view.data && view.data !== last?.detail) {
    setLast({ detail: view.data, id: effectiveId, scope });
  }
  const shown = view.data
    ? { detail: view.data, id: effectiveId, scope }
    : view.isPending
      ? last
      : undefined;
  const loadingScope = view.isPending && shown !== undefined;
  const [editingFor, setEditingFor] = useState(shown?.id);
  if (shown?.id !== editingFor) {
    setEditingFor(shown?.id);
    setEditTarget(null);
  }

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
    router.push(routes.session(session.id));
  };

  if (!person.data || !identity) {
    const isNotFound =
      !person.error || (isAxiosError(person.error) && person.error.response?.status === 404);
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['bottom']}>
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
            action={{ label: t('common:actions.back'), onPress: onBack }}
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
  const detail = shown?.detail;
  const shownAll = shown?.scope === 'identity';
  const showServer = shownAll && isMergedIdentity;
  const sectionKey = `${shown?.id}-${shown?.scope}-${refreshGeneration}`;
  const sectionLabels: Record<UserTab, string> = {
    overview: t('nav:overview'),
    sessions: t('common:labels.sessions'),
    requests: t('nav:requests'),
    violations: t('nav:violations'),
  };
  const sections = userTabs(requestsConfigured).map((value) => ({
    value,
    label: sectionLabels[value],
  }));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['bottom']}>
      {embedded ? null : (
        <Stack.Screen
          options={{ title: person.data.user.identityName ?? person.data.user.username }}
        />
      )}
      <ScrollView
        {...scrollProps}
        className="flex-1"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        }}
        stickyHeaderIndices={detail ? [isMergedIdentity ? 2 : 1] : undefined}
        refreshControl={<RefreshControl key={controlKey} {...refreshControlProps} />}
      >
        {detail && (
          <UserHeaderCard
            user={detail.user}
            identity={identity}
            isAllScope={shownAll}
            avatarSize={avatarSize}
            canEditTrust={isOwner && !loadingScope}
            editTarget={editTarget}
            onEditTrust={setEditTarget}
          />
        )}
        {isMergedIdentity && (
          <ScopePicker
            accounts={identity.serverUsers}
            value={selectedAccountId ?? ALL_ACCOUNTS}
            onChange={handleScopeChange}
          />
        )}
        {detail && (
          <View
            style={{ backgroundColor: colors.background.dark }}
            onLayout={(event) => setTabsY(event.nativeEvent.layout.y)}
          >
            <SectionTabs sections={sections} value={tab} onChange={handleTabChange} />
          </View>
        )}
        <View style={{ paddingTop: spacing.md, opacity: loadingScope ? 0.6 : 1 }}>
          {view.isError && !view.data ? (
            <ErrorState message={view.error.message} onRetry={() => void view.refetch()} />
          ) : !shown ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={ACCENT_COLOR} />
            </View>
          ) : (
            <>
              {tab === 'overview' && (
                <>
                  <UserStatsGrid
                    isTablet={isTablet}
                    stats={[
                      {
                        icon: Play,
                        label: t('pages:userDetail.sessions'),
                        value: shown.detail.user.stats.totalSessions,
                      },
                      {
                        icon: AlertTriangle,
                        label: t('pages:userDetail.violations'),
                        value: shown.detail.violations.total,
                      },
                      {
                        icon: Clock,
                        label: t('common:labels.joined'),
                        value: safeFormatDate(
                          shown.detail.user.joinedAt ?? shown.detail.user.createdAt,
                          DATE_OPTIONS,
                          t('common:labels.unknown')
                        ),
                      },
                      {
                        icon: Activity,
                        label: t('common:labels.lastActivity'),
                        value: safeFormatDate(
                          shown.detail.user.lastActivityAt,
                          DATE_OPTIONS,
                          t('common:labels.never')
                        ),
                      },
                    ]}
                  />
                  {!shownAll && isMergedIdentity && (
                    <Text className="text-muted-foreground -mt-2 mb-4 text-xs">
                      {t('pages:userDetail.acrossAllServers')}{' '}
                      {t('common:count.session', { count: identity.stats.totalSessions })} ·{' '}
                      {formatWatchTime(identity.stats.totalWatchTime)}
                    </Text>
                  )}

                  {isMergedIdentity && (
                    <LinkedAccountsCard
                      accounts={identity.serverUsers}
                      canEditTrust={isOwner && !loadingScope}
                      editTarget={editTarget}
                      onEditTrust={setEditTarget}
                    />
                  )}

                  <View
                    style={{
                      flexDirection: isTablet ? 'row' : 'column',
                      gap: spacing.md,
                      marginBottom: spacing.md,
                    }}
                  >
                    <UserLocationsCard
                      locations={shown.detail.locations}
                      style={{ flex: isTablet ? 1 : undefined }}
                    />
                    <UserDevicesCard
                      devices={shown.detail.devices}
                      style={{ flex: isTablet ? 1 : undefined }}
                    />
                  </View>
                </>
              )}

              {tab === 'sessions' && (
                <UserSessionsCard
                  key={`sessions-${sectionKey}`}
                  userId={shown.id}
                  first={shown.detail.sessions}
                  scope={shown.scope}
                  showServer={showServer}
                  profiles={profilesInView(shown.detail.profiles, shown.scope, shown.id)}
                  onSessionPress={handleSessionPress}
                />
              )}

              {tab === 'requests' && <UserRequestsCard userId={shown.id} scope={shown.scope} />}

              {tab === 'violations' && (
                <>
                  <UserViolationsCard
                    key={`violations-${sectionKey}`}
                    filter={violationsPageFilter(shown.scope, shown.id, identity.userId)}
                    first={shown.detail.violations}
                    showServer={showServer}
                  />

                  <UserTerminationsCard
                    key={`terminations-${sectionKey}`}
                    userId={shown.id}
                    first={shown.detail.terminations}
                    scope={shown.scope}
                    showServer={showServer}
                  />
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
