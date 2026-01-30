/**
 * Alerts screen - violations with infinite scroll and filters
 * Accessed via bell icon in header - not a tab anymore
 * Query keys include selectedServerId for proper cache isolation per media server
 *
 * Responsive layout:
 * - Phone: Single column, compact cards
 * - Tablet (md+): 2-column grid, filters row, larger avatars
 */
import { useState, useMemo } from 'react';
import { View, FlatList, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import {
  MapPin,
  Users,
  Zap,
  Monitor,
  Globe,
  Clock,
  AlertTriangle,
  Check,
  Filter,
  ChevronRight,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useResponsive } from '@/hooks/useResponsive';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { colors, spacing, ACCENT_COLOR } from '@/lib/theme';
import type {
  ViolationWithDetails,
  RuleType,
  UnitSystem,
  ViolationSeverity,
} from '@tracearr/shared';
import { formatSpeed } from '@tracearr/shared';

const PAGE_SIZE = 50;

type StatusFilter = 'all' | 'pending' | 'acknowledged';

// Rule type icons mapping
const ruleIcons: Record<RuleType, LucideIcon> = {
  impossible_travel: MapPin,
  simultaneous_locations: Users,
  device_velocity: Zap,
  concurrent_streams: Monitor,
  geo_restriction: Globe,
  account_inactivity: Clock,
};

// Rule type display names
const ruleLabels: Record<RuleType, string> = {
  impossible_travel: 'Impossible Travel',
  simultaneous_locations: 'Simultaneous Locations',
  device_velocity: 'Device Velocity',
  concurrent_streams: 'Concurrent Streams',
  geo_restriction: 'Geo Restriction',
  account_inactivity: 'Account Inactivity',
};

// Format violation data into readable description based on rule type
function getViolationDescription(
  violation: ViolationWithDetails,
  unitSystem: UnitSystem = 'metric'
): string {
  const data = violation.data;
  const ruleType = violation.rule?.type;

  if (!data || !ruleType) {
    return 'Rule violation detected';
  }

  switch (ruleType) {
    case 'impossible_travel': {
      const from = data.fromCity || data.fromLocation || 'unknown location';
      const to = data.toCity || data.toLocation || 'unknown location';
      const speed =
        typeof data.calculatedSpeedKmh === 'number'
          ? formatSpeed(data.calculatedSpeedKmh, unitSystem)
          : 'impossible speed';
      return `Traveled from ${from} to ${to} at ${speed}`;
    }
    case 'simultaneous_locations': {
      const locations = data.locations as string[] | undefined;
      const count = data.locationCount as number | undefined;
      if (locations && locations.length > 0) {
        return `Active from ${locations.length} locations: ${locations.slice(0, 2).join(', ')}${locations.length > 2 ? '...' : ''}`;
      }
      if (count) {
        return `Streaming from ${count} different locations simultaneously`;
      }
      return 'Streaming from multiple locations simultaneously';
    }
    case 'device_velocity': {
      const ipCount = data.ipCount as number | undefined;
      const windowHours = data.windowHours as number | undefined;
      if (ipCount && windowHours) {
        return `${ipCount} different IPs used in ${windowHours}h window`;
      }
      return 'Too many unique devices in short period';
    }
    case 'concurrent_streams': {
      const streamCount = data.streamCount as number | undefined;
      const maxStreams = data.maxStreams as number | undefined;
      if (streamCount && maxStreams) {
        return `${streamCount} concurrent streams (limit: ${maxStreams})`;
      }
      return 'Exceeded concurrent stream limit';
    }
    case 'geo_restriction': {
      const country = data.country as string | undefined;
      const blockedCountry = data.blockedCountry as string | undefined;
      if (country || blockedCountry) {
        return `Streaming from blocked region: ${country || blockedCountry}`;
      }
      return 'Streaming from restricted location';
    }
    default:
      return 'Rule violation detected';
  }
}

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

function RuleIcon({ ruleType }: { ruleType: RuleType | undefined }) {
  const IconComponent = ruleType ? ruleIcons[ruleType] : AlertTriangle;
  return (
    <View className="bg-surface h-8 w-8 items-center justify-center rounded-lg">
      <IconComponent size={16} color={ACCENT_COLOR} />
    </View>
  );
}

// Segmented control matching History page pattern
function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row rounded-lg p-1" style={{ backgroundColor: colors.surface.dark }}>
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            className="flex-1 items-center rounded-md px-3 py-1.5"
            style={isSelected ? { backgroundColor: colors.card.dark } : undefined}
          >
            <Text
              className="text-[13px] font-medium"
              style={{ color: isSelected ? colors.text.primary.dark : colors.text.muted.dark }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const SEVERITY_OPTIONS: { value: ViolationSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'high', label: 'High' },
  { value: 'warning', label: 'Warning' },
  { value: 'low', label: 'Low' },
];

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'acknowledged', label: 'Done' },
];

function ViolationCard({
  violation,
  onAcknowledge,
  onPress,
  unitSystem,
  isTablet,
}: {
  violation: ViolationWithDetails;
  onAcknowledge: () => void;
  onPress: () => void;
  unitSystem: UnitSystem;
  isTablet?: boolean;
}) {
  const displayName = violation.user?.identityName ?? violation.user?.username ?? 'Unknown User';
  const username = violation.user?.username ?? 'Unknown';
  const ruleType = violation.rule?.type as RuleType | undefined;
  const ruleName = ruleType ? ruleLabels[ruleType] : violation.rule?.name || 'Unknown Rule';
  const description = getViolationDescription(violation, unitSystem);
  const timeAgo = formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true });
  const avatarSize = isTablet ? 48 : 40;

  return (
    <Pressable onPress={onPress} className="active:opacity-80">
      <Card className="mb-3">
        {/* Header: User + Severity */}
        <View className="mb-3 flex-row items-start justify-between">
          <View className="flex-1 flex-row items-center gap-2.5">
            <UserAvatar thumbUrl={violation.user?.thumbUrl} username={username} size={avatarSize} />
            <View className="flex-1">
              <Text className="text-base font-semibold" numberOfLines={1}>
                {displayName}
              </Text>
              {violation.user?.identityName && violation.user.identityName !== username && (
                <Text className="text-muted-foreground text-xs">@{username}</Text>
              )}
              <Text className="text-muted-foreground text-xs">{timeAgo}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-2">
            <SeverityBadge severity={violation.severity} />
            <ChevronRight size={16} color={colors.text.muted.dark} />
          </View>
        </View>

        {/* Content: Rule Type with Icon + Description */}
        <View className="mb-3 flex-row items-start gap-3">
          <RuleIcon ruleType={ruleType} />
          <View className="flex-1">
            <Text className="text-primary mb-1 text-sm font-medium">{ruleName}</Text>
            <Text className="text-secondary text-sm leading-5" numberOfLines={2}>
              {description}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        {!violation.acknowledgedAt ? (
          <Pressable
            className="bg-primary/15 flex-row items-center justify-center gap-2 rounded-lg py-2.5 active:opacity-70"
            onPress={(e) => {
              e.stopPropagation();
              onAcknowledge();
            }}
          >
            <Check size={16} color={ACCENT_COLOR} />
            <Text className="text-primary text-sm font-semibold">Acknowledge</Text>
          </Pressable>
        ) : (
          <View className="bg-success/10 flex-row items-center justify-center gap-2 rounded-lg py-2.5">
            <Check size={16} color={colors.success} />
            <Text className="text-success text-sm">Acknowledged</Text>
          </View>
        )}
      </Card>
    </Pressable>
  );
}

export default function AlertsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedServerId } = useMediaServer();
  const { isTablet, select } = useResponsive();
  const insets = useSafeAreaInsets();

  // Filter state
  const [severityFilter, setSeverityFilter] = useState<ViolationSeverity | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Responsive values
  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });
  const numColumns = isTablet ? 2 : 1;

  // Fetch settings for unit system preference
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
    staleTime: 1000 * 60 * 5,
  });
  const unitSystem = settings?.unitSystem ?? 'metric';

  // Build query params based on filters
  const queryParams = useMemo(
    () => ({
      pageSize: PAGE_SIZE,
      serverId: selectedServerId ?? undefined,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      acknowledged: statusFilter === 'all' ? undefined : statusFilter === 'acknowledged',
    }),
    [selectedServerId, severityFilter, statusFilter]
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, refetch, isRefetching } =
    useInfiniteQuery({
      queryKey: ['violations', selectedServerId, severityFilter, statusFilter],
      queryFn: ({ pageParam }) =>
        api.violations.list({
          ...queryParams,
          page: pageParam,
        }),
      initialPageParam: 1,
      getNextPageParam: (lastPage: { page: number; totalPages: number }) => {
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
  const total = data?.pages[0]?.total || 0;

  // Count unacknowledged from current filtered view
  const unacknowledgedCount = violations.filter((v) => !v.acknowledgedAt).length;

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const handleViolationPress = (violation: ViolationWithDetails) => {
    // Navigate to violation detail page
    router.push(`/violation/${violation.id}` as never);
  };

  const hasActiveFilters = severityFilter !== 'all' || statusFilter !== 'all';

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      // Fallback to home - navigate to the drawer's index (dashboard)
      router.replace('/(drawer)/(tabs)' as never);
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#09090B' }}
      edges={['left', 'right', 'bottom']}
    >
      {/* Header with back button */}
      <View
        className="border-border border-b"
        style={{ paddingTop: insets.top, backgroundColor: colors.background.dark }}
      >
        <View className="h-14 flex-row items-center justify-between px-4">
          <Pressable
            onPress={handleBack}
            className="h-11 w-11 items-center justify-center rounded-lg"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ChevronLeft size={24} color={colors.text.primary.dark} />
          </Pressable>
          <Text className="text-[17px] font-semibold">Alerts</Text>
          <View className="w-11" />
        </View>
      </View>

      <FlatList
        data={violations}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        key={numColumns}
        renderItem={({ item, index }) => (
          <View
            style={{
              flex: 1,
              paddingLeft: isTablet && index % 2 === 1 ? spacing.sm / 2 : 0,
              paddingRight: isTablet && index % 2 === 0 ? spacing.sm / 2 : 0,
            }}
          >
            <ViolationCard
              violation={item}
              onAcknowledge={() => acknowledgeMutation.mutate(item.id)}
              onPress={() => handleViolationPress(item)}
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
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={ACCENT_COLOR} />
        }
        ListHeaderComponent={
          <View className="mb-4 gap-3">
            {/* Summary row */}
            <View className="flex-row items-center justify-between">
              <Text className="text-muted-foreground text-sm">
                {hasActiveFilters ? `${violations.length} of ` : ''}
                {total} {total === 1 ? 'alert' : 'alerts'}
              </Text>
              {unacknowledgedCount > 0 && statusFilter !== 'acknowledged' && (
                <View className="bg-destructive/20 rounded-full px-3 py-1">
                  <Text className="text-destructive text-xs font-semibold">
                    {unacknowledgedCount} pending
                  </Text>
                </View>
              )}
            </View>

            {/* Severity filter */}
            <View className="gap-1.5">
              <Text className="text-muted-foreground text-xs font-medium">Severity</Text>
              <SegmentedControl
                options={SEVERITY_OPTIONS}
                value={severityFilter}
                onChange={setSeverityFilter}
              />
            </View>

            {/* Status filter */}
            <View className="gap-1.5">
              <Text className="text-muted-foreground text-xs font-medium">Status</Text>
              <SegmentedControl
                options={STATUS_OPTIONS}
                value={statusFilter}
                onChange={setStatusFilter}
              />
            </View>
          </View>
        }
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-4">
              <ActivityIndicator size="small" color={ACCENT_COLOR} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View className="items-center px-6 py-16">
            {hasActiveFilters ? (
              <>
                {/* No matches for current filters */}
                <View
                  className="mb-5 h-20 w-20 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: colors.surface.dark }}
                >
                  <Filter size={36} color={colors.text.muted.dark} />
                </View>
                <Text className="mb-2 text-xl font-semibold">No Matches</Text>
                <Text className="text-muted-foreground mb-6 max-w-[260px] text-center text-sm leading-5">
                  No alerts match your current filters. Try adjusting the severity or status.
                </Text>
                <Pressable
                  onPress={() => {
                    setSeverityFilter('all');
                    setStatusFilter('all');
                  }}
                  className="rounded-lg px-5 py-2.5"
                  style={{ backgroundColor: colors.surface.dark }}
                >
                  <Text className="text-primary text-sm font-semibold">Clear Filters</Text>
                </Pressable>
              </>
            ) : (
              <>
                {/* All clear - no violations */}
                <View
                  className="mb-5 h-24 w-24 items-center justify-center rounded-3xl"
                  style={{ backgroundColor: `${colors.success}15` }}
                >
                  <View
                    className="h-14 w-14 items-center justify-center rounded-full"
                    style={{ backgroundColor: `${colors.success}25` }}
                  >
                    <Check size={28} color={colors.success} strokeWidth={3} />
                  </View>
                </View>
                <Text className="mb-2 text-xl font-bold">All Clear</Text>
                <Text className="text-muted-foreground mb-1 max-w-[280px] text-center text-base leading-6">
                  No rule violations detected
                </Text>
                <Text className="text-muted-foreground max-w-[280px] text-center text-sm">
                  Your media server is running smoothly. Alerts will appear here when suspicious
                  activity is detected.
                </Text>
              </>
            )}
          </View>
        }
      />
    </SafeAreaView>
  );
}
