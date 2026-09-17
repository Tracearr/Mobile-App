/**
 * Alerts screen - violations with infinite scroll, filters and acknowledge all
 * Opened from the bell in the tab headers
 * Query keys are scoped by the global ServerScope selection for cache isolation
 *
 * Responsive layout:
 * - Phone: Single column, compact cards
 * - Tablet (md+): 2-column grid, larger avatars
 */
import { useState, useMemo, useCallback } from 'react';
import { View, RefreshControl, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Stack, useRouter, useFocusEffect, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Check, CheckCheck, Filter, ChevronRight, Workflow } from 'lucide-react-native';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { haptics } from '@/lib/haptics';
import { safeFormatDistanceToNow } from '@/lib/formatters';
import { ruleIcon, violationDescription } from '@/lib/violations';
import { ROUTES } from '@/lib/routes';
import { nextPageOf, pageMetaOf } from '@/lib/listPage';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { useResponsive } from '@/hooks/useResponsive';
import {
  useBulkAcknowledgeViolations,
  useServerVersion,
  useUnacknowledgedAlertsCount,
  SERVER_2_2,
} from '@/hooks';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { UserAvatar } from '@/components/ui/user-avatar';
import { SeverityBadge } from '@/components/violations/SeverityBadge';
import { colors, spacing, ACCENT_COLOR } from '@/lib/theme';
import type { ViolationWithDetails, ViolationSeverity, UnitSystem } from '@tracearr/shared';
import { ALL_SERVERS } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { ObserveInteractiveMarker } from 'expo-observe';

const PAGE_SIZE = 50;

// Typed routes only learn this path once the automations screen exists in the route table.
const AUTOMATIONS_ROUTE = '/automations' as Href;

type SeverityFilter = ViolationSeverity | 'all';
type StatusFilter = 'all' | 'pending' | 'acknowledged';

function RuleIcon({ ruleType }: { ruleType: string | null | undefined }) {
  const IconComponent = ruleIcon(ruleType);
  return (
    <View className="bg-surface h-8 w-8 items-center justify-center rounded-lg">
      <IconComponent size={16} color={ACCENT_COLOR} />
    </View>
  );
}

function ViolationCard({
  violation,
  onAcknowledge,
  isAcknowledging,
  onPress,
  unitSystem,
  isTablet,
}: {
  violation: ViolationWithDetails;
  onAcknowledge: () => void;
  isAcknowledging: boolean;
  onPress: () => void;
  unitSystem: UnitSystem;
  isTablet?: boolean;
}) {
  const { t } = useTranslation(['common']);
  const username = violation.user.username;
  const displayName = violation.user.identityName ?? username;
  const ruleName = violation.rule.name || t('common:labels.unknown');
  const timeAgo = safeFormatDistanceToNow(violation.createdAt, t('common:labels.unknown'));
  const avatarSize = isTablet ? 48 : 40;

  return (
    <Card className="mb-3">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${displayName}, ${ruleName}, ${t(`common:severity.${violation.severity}`)}, ${timeAgo}`}
        className="active:opacity-80"
      >
        <View className="mb-3 flex-row items-start justify-between">
          <View className="flex-1 flex-row items-center gap-2.5">
            <UserAvatar
              thumbUrl={violation.user.thumbUrl}
              serverId={violation.user.serverId}
              username={username}
              size={avatarSize}
            />
            <View className="flex-1">
              <Text className="text-base font-semibold" numberOfLines={1}>
                {displayName}
              </Text>
              {violation.user.identityName && violation.user.identityName !== username && (
                <Text className="text-muted-foreground text-xs">@{username}</Text>
              )}
              <Text className="text-muted-foreground text-xs">{timeAgo}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <SeverityBadge severity={violation.severity} />
            <ChevronRight size={16} color={colors.icon.default} />
          </View>
        </View>

        <View className="mb-3 flex-row items-start gap-3">
          <RuleIcon ruleType={violation.rule.type} />
          <View className="flex-1">
            <Text className="text-primary mb-1 text-sm font-medium">{ruleName}</Text>
            <Text className="text-muted-foreground text-sm leading-5" numberOfLines={2}>
              {violationDescription(violation, unitSystem)}
            </Text>
          </View>
        </View>
      </Pressable>

      {!violation.acknowledgedAt ? (
        <Pressable
          className="bg-primary/15 min-h-11 flex-row items-center justify-center gap-2 rounded-lg active:opacity-70"
          onPress={onAcknowledge}
          disabled={isAcknowledging}
          accessibilityRole="button"
          accessibilityState={{ disabled: isAcknowledging, busy: isAcknowledging }}
        >
          {isAcknowledging ? (
            <ActivityIndicator size="small" color={ACCENT_COLOR} />
          ) : (
            <Check size={16} color={ACCENT_COLOR} />
          )}
          <Text className="text-primary text-sm font-semibold">
            {t('common:actions.acknowledge')}
          </Text>
        </Pressable>
      ) : (
        <View className="bg-success/10 min-h-11 flex-row items-center justify-center gap-2 rounded-lg">
          <Check size={16} color={colors.success} />
          <Text className="text-success text-sm">{t('common:states.acknowledged')}</Text>
        </View>
      )}
    </Card>
  );
}

export default function AlertsScreen() {
  const { t } = useTranslation(['mobile', 'common', 'pages', 'nav']);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { scope, servers, selectedServers, isAllServersSelected } = useMediaServer();
  const { isTablet, select } = useResponsive();
  const { supports } = useServerVersion();
  const showAutomations = supports(SERVER_2_2);

  // "All Severities" truncates in a quarter-width phone segment, so it is the spoken label only.
  const allLabel = t('mobile:alerts.all', { defaultValue: 'All' });
  const severityOptions: SegmentedOption<SeverityFilter>[] = [
    { value: 'all', label: allLabel, accessibilityLabel: t('pages:violations.allSeverities') },
    { value: 'high', label: t('common:severity.high') },
    { value: 'warning', label: t('common:severity.warning') },
    { value: 'low', label: t('common:severity.low') },
  ];

  const statusOptions: SegmentedOption<StatusFilter>[] = [
    { value: 'all', label: allLabel, accessibilityLabel: t('pages:violations.allStatuses') },
    { value: 'pending', label: t('common:states.pending') },
    { value: 'acknowledged', label: t('common:states.acknowledged') },
  ];

  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [isCountingPending, setIsCountingPending] = useState(false);
  const severity = severityFilter === 'all' ? undefined : severityFilter;

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const numColumns = isTablet ? 2 : 1;

  const { data: settings } = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: ({ signal }) => api.settings.get(signal),
    staleTime: 1000 * 60 * 5,
  });
  const unitSystem = settings?.unitSystem ?? 'metric';

  // Clear iOS app icon badge when viewing alerts screen
  // This matches standard iOS UX where viewing notifications clears the badge
  // The badge syncs with actual count on foreground and after acknowledging
  useFocusEffect(
    useCallback(() => {
      void Notifications.setBadgeCountAsync(0);
    }, [])
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isLoading, error } =
    useInfiniteQuery({
      queryKey: queryKeys.violations.list(scope, severityFilter, statusFilter),
      queryFn: ({ pageParam, signal }) =>
        api.violations.list(
          {
            pageSize: PAGE_SIZE,
            severity,
            acknowledged: statusFilter === 'all' ? undefined : statusFilter === 'acknowledged',
            scope,
            page: pageParam,
          },
          signal
        ),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => nextPageOf(lastPage),
    });

  const { count: pendingCount, isLoaded: pendingLoaded } = useUnacknowledgedAlertsCount(severity);

  const { controlKey, refreshControlProps } = usePullToRefresh(() =>
    Promise.all([
      refetch(),
      queryClient.invalidateQueries({
        queryKey: queryKeys.violations.unacknowledgedCount(scope, severity),
      }),
    ])
  );

  const showMutationError = (mutationError: Error) => {
    haptics.error();
    Alert.alert(t('common:errors.somethingWentWrong'), mutationError.message);
  };

  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
      void api.violations
        .unacknowledgedCount({ scope: ALL_SERVERS })
        .then((count) => Notifications.setBadgeCountAsync(count))
        .catch(() => {});
    },
    onError: showMutationError,
  });
  const acknowledgingId = acknowledgeMutation.isPending ? acknowledgeMutation.variables : null;

  const bulkAcknowledge = useBulkAcknowledgeViolations();

  const violations = data?.pages.flatMap((page) => page.data) ?? [];
  const total = data?.pages[0] ? pageMetaOf(data.pages[0]).total : null;

  const hasActiveFilters = severityFilter !== 'all' || statusFilter !== 'all';

  // A 2.1 server drops `acknowledged: true` from the bulk filter and would acknowledge
  // everything, so the action does not exist on that tab.
  const canAcknowledgeAll = statusFilter !== 'acknowledged' && pendingLoaded && pendingCount > 0;

  const scopeLabel =
    (isAllServersSelected && servers.length > 1) || selectedServers.length === 0
      ? t('mobile:alerts.allServers', { defaultValue: 'all servers' })
      : selectedServers.map((server) => server.name).join(', ');

  const confirmAcknowledgeAll = (count: number) => {
    if (count === 0) return;
    haptics.warning();
    Alert.alert(
      t('mobile:alerts.acknowledgeAllTitle', {
        count,
        defaultValue: 'Acknowledge {{count}} alerts?',
        defaultValue_one: 'Acknowledge {{count}} alert?',
        defaultValue_other: 'Acknowledge {{count}} alerts?',
      }),
      severity
        ? t('mobile:alerts.acknowledgeAllBodySeverity', {
            severity: t(`common:severity.${severity}`),
            servers: scopeLabel,
            defaultValue:
              'Every pending alert with {{severity}} severity on {{servers}} will be marked as acknowledged. This cannot be undone.',
          })
        : t('mobile:alerts.acknowledgeAllBody', {
            servers: scopeLabel,
            defaultValue:
              'Every pending alert on {{servers}} will be marked as acknowledged. This cannot be undone.',
          }),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('common:actions.acknowledge'),
          onPress: () =>
            // `acknowledged: false` on every tab: left undefined, the server re-stamps
            // alerts that were already acknowledged and counts them in its result.
            bulkAcknowledge.mutate(
              { selectAll: true, filters: { scope, severity, acknowledged: false } },
              { onSuccess: () => haptics.success(), onError: showMutationError }
            ),
        },
      ]
    );
  };

  // The confirm states a count read at the moment of the tap, not the cached one.
  const handleAcknowledgeAll = () => {
    if (!canAcknowledgeAll) return;
    setIsCountingPending(true);
    queryClient
      .fetchQuery({
        queryKey: queryKeys.violations.unacknowledgedCount(scope, severity),
        queryFn: ({ signal }) => api.violations.unacknowledgedCount({ scope, severity }, signal),
        staleTime: 0,
      })
      .then(confirmAcknowledgeAll, showMutationError)
      .finally(() => setIsCountingPending(false));
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const extraData = useMemo(
    () => ({ unitSystem, isTablet, acknowledgingId }),
    [unitSystem, isTablet, acknowledgingId]
  );

  const openAutomations = () => router.push(AUTOMATIONS_ROUTE);
  const isBulkBusy = isCountingPending || bulkAcknowledge.isPending;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ObserveInteractiveMarker />
      <ScreenHeader
        title={t('nav:alerts')}
        onBack={router.canGoBack() ? undefined : () => router.replace(ROUTES.TABS)}
        right={
          showAutomations && Platform.OS !== 'ios'
            ? () => (
                <Pressable
                  onPress={openAutomations}
                  accessibilityRole="button"
                  accessibilityLabel={t('nav:automations')}
                  className="h-11 w-11 items-center justify-center"
                >
                  <Workflow size={22} color={colors.text.primary.dark} />
                </Pressable>
              )
            : undefined
        }
      />
      {showAutomations && Platform.OS === 'ios' ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.Button
            icon="point.3.connected.trianglepath.dotted"
            accessibilityLabel={t('nav:automations')}
            onPress={openAutomations}
          />
        </Stack.Toolbar>
      ) : null}

      <FlashList
        data={violations}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        extraData={extraData}
        renderItem={({ item, index }) => (
          <View
            style={{
              paddingLeft: isTablet && index % 2 === 1 ? spacing.sm / 2 : 0,
              paddingRight: isTablet && index % 2 === 0 ? spacing.sm / 2 : 0,
            }}
          >
            <ViolationCard
              violation={item}
              onAcknowledge={() => acknowledgeMutation.mutate(item.id)}
              isAcknowledging={acknowledgingId === item.id}
              onPress={() => router.push(ROUTES.VIOLATION(item.id))}
              unitSystem={unitSystem}
              isTablet={isTablet}
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
          <View className="mb-4 gap-3">
            <View className="min-h-9 flex-row items-center justify-between gap-2">
              <View className="flex-shrink flex-row items-center gap-2">
                {total !== null && (
                  <Text className="text-muted-foreground text-sm">
                    {t('common:count.alert', { count: total })}
                  </Text>
                )}
                {pendingLoaded && pendingCount > 0 && statusFilter !== 'acknowledged' && (
                  <Badge variant="warning">
                    {t('mobile:alerts.pendingCount', {
                      count: pendingCount,
                      defaultValue: '{{count}} pending',
                    })}
                  </Badge>
                )}
              </View>
              {canAcknowledgeAll && (
                <Button
                  variant="outline"
                  size="sm"
                  hitSlop={4}
                  className="gap-1.5"
                  disabled={isBulkBusy}
                  onPress={handleAcknowledgeAll}
                >
                  {isBulkBusy ? (
                    <ActivityIndicator size="small" color={ACCENT_COLOR} />
                  ) : (
                    <CheckCheck size={14} color={ACCENT_COLOR} />
                  )}
                  <Text className="text-xs font-medium">
                    {t('mobile:alerts.acknowledgeAll', { defaultValue: 'Acknowledge all' })}
                  </Text>
                </Button>
              )}
            </View>

            <View className="gap-1.5">
              <Text className="text-muted-foreground text-xs font-medium">
                {t('common:labels.severity')}
              </Text>
              <SegmentedControl
                options={severityOptions}
                value={severityFilter}
                onChange={(value) => {
                  haptics.selection();
                  setSeverityFilter(value);
                }}
                accessibilityLabel={t('common:labels.severity')}
              />
            </View>

            <View className="gap-1.5">
              <Text className="text-muted-foreground text-xs font-medium">
                {t('common:labels.status')}
              </Text>
              <SegmentedControl
                options={statusOptions}
                value={statusFilter}
                onChange={(value) => {
                  haptics.selection();
                  setStatusFilter(value);
                }}
                accessibilityLabel={t('common:labels.status')}
              />
            </View>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={ACCENT_COLOR} />
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          isLoading ? (
            <View className="items-center py-12">
              <ActivityIndicator size="large" color={ACCENT_COLOR} />
            </View>
          ) : error && !data ? (
            <ErrorState message={error.message} onRetry={() => void refetch()} />
          ) : hasActiveFilters ? (
            <EmptyState
              icon={Filter}
              title={t('mobile:alerts.noMatches', { defaultValue: 'No matching alerts' })}
              description={t('pages:violations.tryAdjustingFilters')}
              action={{
                label: t('mobile:alerts.clearFilters'),
                onPress: () => {
                  setSeverityFilter('all');
                  setStatusFilter('all');
                },
              }}
            />
          ) : (
            <EmptyState
              icon={Check}
              tone="success"
              title={t('mobile:alerts.allClear', { defaultValue: 'All clear' })}
              description={t('mobile:alerts.noAlertsRecorded', {
                defaultValue: 'No alerts have been recorded yet.',
              })}
            />
          )
        }
      />
    </SafeAreaView>
  );
}
