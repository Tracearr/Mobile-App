/**
 * Violation Detail Screen
 * Shows comprehensive violation information with stream comparison
 *
 * Responsive layout:
 * - Phone: Single column, compact layout
 * - Tablet (md+): Responsive padding, side-by-side actions
 */
import { useMemo } from 'react';
import { View, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Film,
  Tv,
  Music,
  AlertCircle,
  Shield,
  User,
  ListChecks,
  Zap,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { haptics } from '@/lib/haptics';
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/formatters';
import { useResponsive } from '@/hooks/useResponsive';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ServerTag } from '@/components/server/ServerTag';
import { ActionResultsList } from '@/components/violations/ActionResultsList';
import { EvidenceList } from '@/components/violations/EvidenceList';
import { SeverityBadge } from '@/components/violations/SeverityBadge';
import { colors, spacing, ACCENT_COLOR } from '@/lib/theme';
import {
  getViolationDetails,
  collectViolationSessions,
  formatEpisodeLabel,
} from '@tracearr/shared';
import type { ViolationWithDetails, ViolationSessionInfo } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { ObserveInteractiveMarker } from 'expo-observe';
import { ruleIcon, violationDescription } from '@/lib/violations';

const FULL_DATE_TIME = 'PPpp';

function getMediaIcon(mediaType: string): typeof Film {
  switch (mediaType) {
    case 'episode':
      return Tv;
    case 'track':
      return Music;
    default:
      return Film;
  }
}

function detailText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value) ?? '';
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <View className={className}>
      <Text className="text-muted-foreground mb-1 text-xs">{label}</Text>
      <Text className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</Text>
    </View>
  );
}

function StreamCard({
  session,
  isTriggering,
}: {
  session: ViolationSessionInfo;
  isTriggering: boolean;
}) {
  const { t } = useTranslation(['common', 'pages']);
  const MediaIcon = getMediaIcon(session.mediaType);

  const isEpisode = session.mediaType === 'episode' && !!session.grandparentTitle;
  const episodeLabel = formatEpisodeLabel(session.seasonNumber, session.episodeNumber, {
    spaced: true,
  });
  const title = isEpisode ? session.grandparentTitle : session.mediaTitle;
  const subtitle = isEpisode
    ? [episodeLabel, session.mediaTitle].filter(Boolean).join(' · ')
    : session.year
      ? String(session.year)
      : null;

  const locationText = [session.geoCity, session.geoRegion, session.geoCountry]
    .filter(Boolean)
    .join(', ');
  const deviceText = session.device || session.platform || t('common:labels.unknown');

  return (
    <Card style={isTriggering ? { borderColor: ACCENT_COLOR } : undefined}>
      <View className="mb-3 flex-row items-center gap-2">
        <View className="bg-surface h-8 w-8 items-center justify-center rounded">
          <MediaIcon size={14} color={colors.icon.default} />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-medium" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-muted-foreground text-xs capitalize" numberOfLines={1}>
            {subtitle || session.mediaType}
          </Text>
        </View>
        {isTriggering && <Badge variant="outline">{t('pages:violations.detail.trigger')}</Badge>}
      </View>

      <View className="flex-row flex-wrap gap-y-3">
        <Field
          className="w-1/2 pr-2"
          label={t('common:labels.ipAddress')}
          value={session.ipAddress}
          mono
        />
        <Field
          className="w-1/2 pr-2"
          label={t('common:labels.location')}
          value={locationText || '-'}
        />
        <Field
          className="w-1/2 pr-2"
          label={t('common:labels.device')}
          value={session.playerName ? `${deviceText} (${session.playerName})` : deviceText}
        />
        <Field
          className="w-1/2 pr-2"
          label={t('common:labels.quality')}
          value={session.quality ?? '-'}
        />
        <Field
          className="w-full"
          label={t('common:labels.started')}
          value={safeFormatDistanceToNow(session.startedAt, t('common:labels.unknown'))}
        />
      </View>
    </Card>
  );
}

function isViolationRow(value: unknown): value is ViolationWithDetails {
  return typeof value === 'object' && value !== null && 'id' in value && 'rule' in value;
}

/**
 * Search the violation list caches for a specific violation by ID.
 * Every key under ['violations'] is visited: infinite lists ({ pages }), flat
 * lists ({ data: [] }), detail entries (whose `data` is the violation's own
 * payload object) and the unacknowledged counts (numbers).
 */
function findViolationInCache(
  queryClient: ReturnType<typeof useQueryClient>,
  violationId: string
): ViolationWithDetails | undefined {
  const allCaches = queryClient.getQueriesData<unknown>({ queryKey: queryKeys.violations.all() });

  for (const [, cached] of allCaches) {
    if (typeof cached !== 'object' || cached === null) continue;
    const pages: unknown[] =
      'pages' in cached && Array.isArray(cached.pages) ? cached.pages : [cached];
    for (const page of pages) {
      if (typeof page !== 'object' || page === null || !('data' in page)) continue;
      if (!Array.isArray(page.data)) continue;
      const found = page.data.find(
        (row): row is ViolationWithDetails => isViolationRow(row) && row.id === violationId
      );
      if (found) return found;
    }
  }
  return undefined;
}

export default function ViolationDetailScreen() {
  const { t } = useTranslation(['mobile', 'common', 'pages', 'nav']);
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { servers } = useMediaServer();
  const { isTablet, select } = useResponsive();

  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });

  const { data: settings } = useQuery({
    queryKey: queryKeys.settings(),
    queryFn: ({ signal }) => api.settings.get(signal),
    staleTime: 1000 * 60 * 5,
  });
  const unitSystem = settings?.unitSystem ?? 'metric';

  const cachedViolation = useMemo(
    () => (id ? findViolationInCache(queryClient, id) : undefined),
    [queryClient, id]
  );

  const {
    data: violation,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.violations.detail(id),
    queryFn: ({ signal }) => api.violations.get(id, signal),
    initialData: cachedViolation,
    // A list row has no `userNames`, so the cached copy always refetches behind the content.
    staleTime: 0,
    enabled: !!id,
  });

  const showMutationError = (mutationError: Error) => {
    haptics.error();
    Alert.alert(t('common:errors.somethingWentWrong'), mutationError.message);
  };

  // Stays on the screen like the web does: the refetch flips the record to acknowledged.
  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
    },
    onError: showMutationError,
  });

  const dismissMutation = useMutation({
    mutationFn: api.violations.dismiss,
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
      router.back();
    },
    onError: showMutationError,
  });

  const allSessions = useMemo(
    () =>
      violation && violation.rule.type !== 'account_inactivity'
        ? collectViolationSessions(violation)
        : [],
    [violation]
  );

  const analysis = useMemo(() => {
    if (allSessions.length <= 1) return null;
    return {
      uniqueIPs: new Set(allSessions.map((s) => s.ipAddress)).size,
      uniqueDevices: new Set(
        allSessions.map((s) => s.deviceId || s.device).filter((d): d is string => !!d)
      ).size,
      uniqueLocations: new Set(
        allSessions.map((s) => `${s.geoCity || ''}-${s.geoCountry || ''}`).filter((l) => l !== '-')
      ).size,
    };
  }, [allSessions]);

  if (!violation) {
    const isNotFound = !error || (isAxiosError(error) && error.response?.status === 404);
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        {isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={ACCENT_COLOR} />
          </View>
        ) : isNotFound ? (
          <EmptyState
            className="flex-1 justify-center"
            icon={AlertTriangle}
            title={t('pages:violations.detail.notFound')}
            description={t('mobile:violation.violationNotFoundDesc')}
            action={{ label: t('common:actions.back'), onPress: () => router.back() }}
          />
        ) : (
          <ErrorState
            className="flex-1 justify-center"
            message={error.message}
            onRetry={() => void refetch()}
          />
        )}
      </SafeAreaView>
    );
  }

  const unknown = t('common:labels.unknown');
  const username = violation.user.username;
  const displayName = violation.user.identityName ?? username;
  const description = violationDescription(violation, unitSystem);
  const details = Object.entries(getViolationDetails(violation, unitSystem)).map(
    ([key, value]): [string, unknown] => [key, value === violation.user.id ? displayName : value]
  );
  const userNames = { ...violation.userNames, [violation.user.id]: displayName };
  const IconComponent = ruleIcon(violation.rule.type);
  const isPending = !violation.acknowledgedAt;
  const isInactivity = violation.rule.type === 'account_inactivity';
  const serverColor = servers.find((s) => s.id === violation.server?.id)?.color;

  const { inactiveDays, thresholdDays, lastActivityAt, neverActive } = violation.data ?? {};

  const handleDismiss = () => {
    haptics.warning();
    Alert.alert(
      t('pages:violations.dismissViolation'),
      t('pages:violations.dismissViolationConfirm'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('common:actions.dismiss'),
          style: 'destructive',
          onPress: () => dismissMutation.mutate(violation.id),
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ObserveInteractiveMarker />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        }}
      >
        <Card className="mb-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="bg-primary/15 h-10 w-10 items-center justify-center rounded-lg">
              <IconComponent size={20} color={ACCENT_COLOR} />
            </View>
            <Text className="flex-1 text-base font-semibold">{violation.rule.name || unknown}</Text>
            <SeverityBadge severity={violation.severity} />
          </View>
          <Text className="text-foreground leading-6">{description}</Text>
          <View className="mt-3 gap-1">
            <View className="flex-row items-center gap-1.5">
              <Clock size={14} color={colors.icon.default} />
              <Text className="text-muted-foreground text-sm">
                {t('pages:violations.detail.detected')}{' '}
                {safeFormatDistanceToNow(violation.createdAt, unknown)}
              </Text>
            </View>
            {violation.acknowledgedAt && (
              <View className="flex-row items-center gap-1.5">
                <Check size={14} color={colors.success} />
                <Text className="text-success text-sm">
                  {t('common:states.acknowledged')}{' '}
                  {safeFormatDistanceToNow(violation.acknowledgedAt, unknown)}
                </Text>
              </View>
            )}
          </View>
        </Card>

        <View
          className="mb-6"
          style={{ flexDirection: isTablet ? 'row' : 'column', gap: spacing.sm }}
        >
          {isPending && (
            <Button
              size="lg"
              className="flex-1"
              onPress={() => acknowledgeMutation.mutate(violation.id)}
              disabled={acknowledgeMutation.isPending}
            >
              {acknowledgeMutation.isPending
                ? t('common:states.acknowledging')
                : t('common:actions.acknowledge')}
            </Button>
          )}
          <Button
            size="lg"
            variant="destructive"
            className="flex-1"
            onPress={handleDismiss}
            disabled={dismissMutation.isPending}
          >
            {dismissMutation.isPending
              ? t('common:states.dismissing')
              : t('common:actions.dismiss')}
          </Button>
        </View>

        {details.length > 0 && (
          <View className="mb-4">
            <SectionHeader
              icon={ListChecks}
              title={t('pages:violations.detail.violationDetails')}
            />
            <Card>
              <View className="flex-row flex-wrap gap-y-3">
                {details.map(([key, value]) =>
                  Array.isArray(value) ? (
                    <View key={key} className="w-full">
                      <Text className="text-muted-foreground mb-1 text-xs">{key}</Text>
                      <View className="flex-row flex-wrap gap-1">
                        {value.map((item: unknown, idx) => (
                          <Badge key={idx} variant="secondary">
                            {detailText(item)}
                          </Badge>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <Field key={key} className="w-1/2 pr-2" label={key} value={detailText(value)} />
                  )
                )}
              </View>
            </Card>
          </View>
        )}

        <View className="mb-4">
          <SectionHeader icon={User} title={t('pages:violations.detail.userInfo')} />
          <Card>
            <Pressable
              className="flex-row items-center gap-4 active:opacity-80"
              onPress={() => router.push(ROUTES.USER(violation.user.id))}
              accessibilityRole="button"
              accessibilityLabel={displayName}
              accessibilityHint={t('common:actions.viewProfile')}
            >
              <UserAvatar
                thumbUrl={violation.user.thumbUrl}
                serverId={violation.user.serverId}
                username={username}
                size={isTablet ? 64 : 56}
              />
              <View className="flex-1">
                <Text className="text-lg font-semibold">{displayName}</Text>
                {violation.user.identityName && violation.user.identityName !== username && (
                  <Text className="text-muted-foreground text-sm">@{username}</Text>
                )}
                <ServerTag
                  size="md"
                  name={violation.server?.name}
                  color={serverColor}
                  className="mt-1"
                />
              </View>
              <ChevronRight size={16} color={colors.icon.default} />
            </Pressable>
          </Card>
        </View>

        {violation.evidence && violation.evidence.length > 0 && (
          <View className="mb-4">
            <SectionHeader icon={Shield} title={t('pages:violations.detail.conditionEvidence')} />
            <EvidenceList
              groups={violation.evidence}
              unitSystem={unitSystem}
              userNames={userNames}
            />
          </View>
        )}

        {allSessions.length > 0 && (
          <View className="mb-4">
            <SectionHeader
              icon={Film}
              title={t('pages:violations.detail.sessions')}
              right={<Badge variant="secondary">{String(allSessions.length)}</Badge>}
            />
            {analysis && (
              <View className="mb-3 flex-row flex-wrap gap-1.5">
                {analysis.uniqueIPs > 1 && (
                  <Badge variant="warning">
                    {`${analysis.uniqueIPs} ${t('mobile:violation.ips')}`}
                  </Badge>
                )}
                {analysis.uniqueDevices > 1 && (
                  <Badge variant="warning">
                    {t('common:count.device', { count: analysis.uniqueDevices })}
                  </Badge>
                )}
                {analysis.uniqueLocations > 1 && (
                  <Badge variant="danger">
                    {t('common:count.location', { count: analysis.uniqueLocations })}
                  </Badge>
                )}
              </View>
            )}
            <View style={{ gap: spacing.sm }}>
              {allSessions.map((session) => (
                <StreamCard
                  key={session.id}
                  session={session}
                  isTriggering={violation.session?.id === session.id}
                />
              ))}
            </View>
          </View>
        )}

        {isInactivity && (
          <View className="mb-4">
            <SectionHeader icon={Clock} title={t('pages:violations.detail.inactivity')} />
            <Card>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-muted-foreground mb-1 text-xs">
                    {t('pages:violations.detail.daysInactive')}
                  </Text>
                  <Text className="text-2xl font-bold">
                    {typeof inactiveDays === 'number' ? inactiveDays : '-'}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className="text-muted-foreground mb-1 text-xs">
                    {t('pages:violations.detail.threshold')}
                  </Text>
                  <Text className="text-2xl font-bold">
                    {typeof thresholdDays === 'number' ? thresholdDays : '-'}
                    <Text className="text-muted-foreground text-sm font-normal">
                      {' '}
                      {t('common:labels.days')}
                    </Text>
                  </Text>
                </View>
              </View>
              <View className="mt-4">
                <Text className="text-muted-foreground mb-1 text-xs">
                  {t('pages:violations.detail.lastActivity')}
                </Text>
                {neverActive ? (
                  <View className="flex-row items-center gap-1">
                    <AlertCircle size={14} color={colors.warning} />
                    <Text className="text-warning text-sm font-medium">
                      {t('pages:violations.detail.neverActive')}
                    </Text>
                  </View>
                ) : typeof lastActivityAt === 'string' ? (
                  <View>
                    <Text className="text-sm font-medium">
                      {safeFormatDate(lastActivityAt, FULL_DATE_TIME, unknown)}
                    </Text>
                    <Text className="text-muted-foreground text-xs">
                      {safeFormatDistanceToNow(lastActivityAt, unknown)}
                    </Text>
                  </View>
                ) : (
                  <Text className="text-muted-foreground text-sm">{unknown}</Text>
                )}
              </View>
            </Card>
          </View>
        )}

        {violation.actionResults && violation.actionResults.length > 0 && (
          <View className="mb-4">
            <SectionHeader icon={Zap} title={t('pages:violations.detail.actions')} />
            <Card>
              <ActionResultsList results={violation.actionResults} />
            </Card>
          </View>
        )}

        <SectionHeader icon={Clock} title={t('pages:violations.detail.timestamps')} />
        <Card>
          <View className="flex-row flex-wrap gap-y-3">
            <View className="w-1/2 pr-2">
              <Text className="text-muted-foreground mb-1 text-xs">
                {t('pages:violations.detail.created')}
              </Text>
              <Text className="text-sm font-medium">
                {safeFormatDate(violation.createdAt, FULL_DATE_TIME, unknown)}
              </Text>
              <Text className="text-muted-foreground text-xs">
                {safeFormatDistanceToNow(violation.createdAt, unknown)}
              </Text>
            </View>
            {violation.acknowledgedAt && (
              <View className="w-1/2 pr-2">
                <Text className="text-muted-foreground mb-1 text-xs">
                  {t('pages:violations.detail.acknowledged')}
                </Text>
                <Text className="text-sm font-medium">
                  {safeFormatDate(violation.acknowledgedAt, FULL_DATE_TIME, unknown)}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {safeFormatDistanceToNow(violation.acknowledgedAt, unknown)}
                </Text>
              </View>
            )}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
