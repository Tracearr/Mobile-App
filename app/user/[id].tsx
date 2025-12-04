/**
 * User Detail Screen
 * Shows comprehensive user information with web feature parity
 */
import { View, ScrollView, RefreshControl, Pressable, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import {
  Crown,
  Play,
  Clock,
  AlertTriangle,
  Globe,
  MapPin,
  Smartphone,
  Monitor,
  Tv,
  ChevronRight,
  Users,
  Zap,
  Check,
  Film,
  Music,
  type LucideIcon,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { api, getServerUrl } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme';
import type { Session, ViolationWithDetails, UserLocation, UserDevice, RuleType } from '@tracearr/shared';

const PAGE_SIZE = 10;

// Safe date parsing helper - handles string dates from API
function safeParseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Safe format distance helper
function safeFormatDistanceToNow(date: Date | string | null | undefined): string {
  const parsed = safeParseDate(date);
  if (!parsed) return 'Unknown';
  return formatDistanceToNow(parsed, { addSuffix: true });
}

// Safe format date helper
function safeFormatDate(date: Date | string | null | undefined, formatStr: string): string {
  const parsed = safeParseDate(date);
  if (!parsed) return 'Unknown';
  return format(parsed, formatStr);
}

// Rule type icons mapping
const ruleIcons: Record<RuleType, LucideIcon> = {
  impossible_travel: MapPin,
  simultaneous_locations: Users,
  device_velocity: Zap,
  concurrent_streams: Monitor,
  geo_restriction: Globe,
};

// Rule type display names
const ruleLabels: Record<RuleType, string> = {
  impossible_travel: 'Impossible Travel',
  simultaneous_locations: 'Simultaneous Locations',
  device_velocity: 'Device Velocity',
  concurrent_streams: 'Concurrent Streams',
  geo_restriction: 'Geo Restriction',
};

function TrustScoreBadge({ score, showLabel = false }: { score: number; showLabel?: boolean }) {
  const variant = score < 50 ? 'destructive' : score < 75 ? 'warning' : 'success';
  const label = score < 50 ? 'Low' : score < 75 ? 'Medium' : 'High';

  return (
    <View className="flex-row items-center gap-2">
      <View
        className={cn(
          'px-2.5 py-1 rounded-md min-w-[45px] items-center',
          variant === 'destructive' && 'bg-destructive/20',
          variant === 'warning' && 'bg-warning/20',
          variant === 'success' && 'bg-success/20'
        )}
      >
        <Text
          className={cn(
            'text-base font-bold',
            variant === 'destructive' && 'text-destructive',
            variant === 'warning' && 'text-warning',
            variant === 'success' && 'text-success'
          )}
        >
          {score}
        </Text>
      </View>
      {showLabel && (
        <Text className="text-sm text-muted">{label} Trust</Text>
      )}
    </View>
  );
}

function StatCard({ icon: Icon, label, value, subValue }: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  subValue?: string;
}) {
  return (
    <View className="flex-1 bg-surface rounded-lg p-3 border border-border">
      <View className="flex-row items-center gap-2 mb-1">
        <Icon size={14} color={colors.text.muted.dark} />
        <Text className="text-xs text-muted">{label}</Text>
      </View>
      <Text className="text-xl font-bold">{value}</Text>
      {subValue && <Text className="text-xs text-muted mt-0.5">{subValue}</Text>}
    </View>
  );
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

function formatDuration(ms: number | null): string {
  if (!ms) return '-';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function LocationCard({ location }: { location: UserLocation }) {
  const locationText = [location.city, location.region, location.country]
    .filter(Boolean)
    .join(', ') || 'Unknown Location';

  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-border">
      <View className="w-8 h-8 rounded-full bg-cyan-core/10 items-center justify-center">
        <MapPin size={16} color={colors.cyan.core} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium">{locationText}</Text>
        <Text className="text-xs text-muted">
          {location.sessionCount} {location.sessionCount === 1 ? 'session' : 'sessions'}
          {' • '}
          {safeFormatDistanceToNow(location.lastSeenAt)}
        </Text>
      </View>
    </View>
  );
}

function DeviceCard({ device }: { device: UserDevice }) {
  const deviceName = device.playerName || device.device || device.product || 'Unknown Device';
  const platform = device.platform || 'Unknown Platform';

  return (
    <View className="flex-row items-center gap-3 py-3 border-b border-border">
      <View className="w-8 h-8 rounded-full bg-cyan-core/10 items-center justify-center">
        <Smartphone size={16} color={colors.cyan.core} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium">{deviceName}</Text>
        <Text className="text-xs text-muted">
          {platform} • {device.sessionCount} {device.sessionCount === 1 ? 'session' : 'sessions'}
        </Text>
        <Text className="text-xs text-muted">
          Last seen {safeFormatDistanceToNow(device.lastSeenAt)}
        </Text>
      </View>
    </View>
  );
}

function getMediaIcon(mediaType: string): typeof Film {
  switch (mediaType) {
    case 'movie':
      return Film;
    case 'episode':
      return Tv;
    case 'track':
      return Music;
    default:
      return Film;
  }
}

function SessionCard({ session, onPress, serverUrl }: { session: Session; onPress?: () => void; serverUrl: string | null }) {
  const locationText = [session.geoCity, session.geoCountry].filter(Boolean).join(', ');
  const MediaIcon = getMediaIcon(session.mediaType);

  // Build poster URL - need serverId and thumbPath
  const hasPoster = serverUrl && session.thumbPath && session.serverId;
  const posterUrl = hasPoster
    ? `${serverUrl}/api/v1/images/proxy?server=${session.serverId}&url=${encodeURIComponent(session.thumbPath!)}&width=80&height=120`
    : null;

  // Determine display state - show "Watched" for completed sessions that reached 80%+
  const getDisplayState = () => {
    if (session.watched) return { label: 'Watched', variant: 'success' as const };
    if (session.state === 'playing') return { label: 'Playing', variant: 'success' as const };
    if (session.state === 'paused') return { label: 'Paused', variant: 'warning' as const };
    if (session.state === 'stopped') return { label: 'Stopped', variant: 'secondary' as const };
    return { label: session.state || 'Unknown', variant: 'secondary' as const };
  };
  const displayState = getDisplayState();

  return (
    <Pressable onPress={onPress} className="py-3 border-b border-border active:opacity-70">
      <View className="flex-row">
        {/* Poster */}
        <View className="w-10 h-14 rounded-md bg-surface overflow-hidden mr-3">
          {posterUrl ? (
            <Image
              source={{ uri: posterUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full items-center justify-center">
              <MediaIcon size={18} color={colors.text.muted.dark} />
            </View>
          )}
        </View>

        {/* Content */}
        <View className="flex-1">
          <View className="flex-row justify-between items-start mb-1">
            <View className="flex-1 mr-2">
              <Text className="text-sm font-medium" numberOfLines={1}>
                {session.mediaTitle}
              </Text>
              <Text className="text-xs text-muted capitalize">{session.mediaType}</Text>
            </View>
            <Badge variant={displayState.variant}>
              {displayState.label}
            </Badge>
          </View>
          <View className="flex-row items-center gap-4 mt-1">
            <View className="flex-row items-center gap-1">
              <Clock size={12} color={colors.text.muted.dark} />
              <Text className="text-xs text-muted">{formatDuration(session.durationMs)}</Text>
            </View>
            <View className="flex-row items-center gap-1">
              <Tv size={12} color={colors.text.muted.dark} />
              <Text className="text-xs text-muted">{session.platform || 'Unknown'}</Text>
            </View>
            {locationText && (
              <View className="flex-row items-center gap-1">
                <Globe size={12} color={colors.text.muted.dark} />
                <Text className="text-xs text-muted">{locationText}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function ViolationCard({
  violation,
  onAcknowledge,
}: {
  violation: ViolationWithDetails;
  onAcknowledge: () => void;
}) {
  const ruleType = violation.rule?.type as RuleType | undefined;
  const ruleName = ruleType ? ruleLabels[ruleType] : violation.rule?.name || 'Unknown Rule';
  const IconComponent = ruleType ? ruleIcons[ruleType] : AlertTriangle;
  const timeAgo = safeFormatDistanceToNow(violation.createdAt);

  return (
    <View className="py-3 border-b border-border">
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center gap-2 flex-1">
          <View className="w-7 h-7 rounded-md bg-surface items-center justify-center">
            <IconComponent size={14} color={colors.cyan.core} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium">{ruleName}</Text>
            <Text className="text-xs text-muted">{timeAgo}</Text>
          </View>
        </View>
        <SeverityBadge severity={violation.severity} />
      </View>
      {!violation.acknowledgedAt ? (
        <Pressable
          className="flex-row items-center justify-center gap-1.5 bg-cyan-core/15 py-2 rounded-md mt-2 active:opacity-70"
          onPress={onAcknowledge}
        >
          <Check size={14} color={colors.cyan.core} />
          <Text className="text-xs font-semibold text-cyan-core">Acknowledge</Text>
        </Pressable>
      ) : (
        <View className="flex-row items-center gap-1.5 mt-2">
          <Check size={14} color={colors.success} />
          <Text className="text-xs text-success">Acknowledged</Text>
        </View>
      )}
    </View>
  );
}

export default function UserDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [serverUrl, setServerUrl] = useState<string | null>(null);

  // Load server URL for image proxy
  useEffect(() => {
    getServerUrl().then(setServerUrl);
  }, []);

  // Fetch user detail
  const {
    data: user,
    isLoading: userLoading,
    refetch: refetchUser,
    isRefetching: userRefetching,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.users.get(id!),
    enabled: !!id,
  });

  // Update header title with username
  useEffect(() => {
    if (user?.username) {
      navigation.setOptions({ title: user.username });
    }
  }, [user?.username, navigation]);

  // Fetch user sessions
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    fetchNextPage: fetchMoreSessions,
    hasNextPage: hasMoreSessions,
    isFetchingNextPage: fetchingMoreSessions,
  } = useInfiniteQuery({
    queryKey: ['user', id, 'sessions'],
    queryFn: ({ pageParam = 1 }) => api.users.sessions(id!, { page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!id,
  });

  // Fetch user violations
  const {
    data: violationsData,
    isLoading: violationsLoading,
    fetchNextPage: fetchMoreViolations,
    hasNextPage: hasMoreViolations,
    isFetchingNextPage: fetchingMoreViolations,
  } = useInfiniteQuery({
    queryKey: ['violations', { userId: id }],
    queryFn: ({ pageParam = 1 }) => api.violations.list({ userId: id, page: pageParam, pageSize: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.page < lastPage.totalPages) {
        return lastPage.page + 1;
      }
      return undefined;
    },
    enabled: !!id,
  });

  // Fetch user locations
  const { data: locations, isLoading: locationsLoading } = useQuery({
    queryKey: ['user', id, 'locations'],
    queryFn: () => api.users.locations(id!),
    enabled: !!id,
  });

  // Fetch user devices
  const { data: devices, isLoading: devicesLoading } = useQuery({
    queryKey: ['user', id, 'devices'],
    queryFn: () => api.users.devices(id!),
    enabled: !!id,
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['violations', { userId: id }] });
    },
  });

  const sessions = sessionsData?.pages.flatMap((page) => page.data) || [];
  const violations = violationsData?.pages.flatMap((page) => page.data) || [];
  const totalSessions = sessionsData?.pages[0]?.total || 0;
  const totalViolations = violationsData?.pages[0]?.total || 0;

  const handleRefresh = () => {
    void refetchUser();
    void queryClient.invalidateQueries({ queryKey: ['user', id, 'sessions'] });
    void queryClient.invalidateQueries({ queryKey: ['violations', { userId: id }] });
    void queryClient.invalidateQueries({ queryKey: ['user', id, 'locations'] });
    void queryClient.invalidateQueries({ queryKey: ['user', id, 'devices'] });
  };

  const handleSessionPress = (session: Session) => {
    router.push(`/session/${session.id}` as never);
  };

  if (userLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['left', 'right']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.cyan.core} />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['left', 'right']}>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-xl font-semibold text-center mb-2">User Not Found</Text>
          <Text className="text-muted text-center">This user may have been removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="p-4"
        refreshControl={
          <RefreshControl
            refreshing={userRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.cyan.core}
          />
        }
      >
        {/* User Info Card */}
        <Card className="mb-4">
          <View className="flex-row items-start gap-4">
            <UserAvatar
              thumbUrl={user.thumbUrl}
              username={user.username}
              size={64}
            />
            <View className="flex-1">
              <View className="flex-row items-center gap-2 mb-1">
                <Text className="text-xl font-bold">{user.username}</Text>
                {user.role === 'owner' && (
                  <Crown size={18} color={colors.warning} />
                )}
              </View>
              {user.email && (
                <Text className="text-sm text-muted mb-2">{user.email}</Text>
              )}
              <TrustScoreBadge score={user.trustScore} showLabel />
            </View>
          </View>
        </Card>

        {/* Stats Grid */}
        <View className="flex-row gap-3 mb-4">
          <StatCard
            icon={Play}
            label="Sessions"
            value={totalSessions}
          />
          <StatCard
            icon={AlertTriangle}
            label="Violations"
            value={totalViolations}
          />
        </View>
        <View className="flex-row gap-3 mb-4">
          <StatCard
            icon={Clock}
            label="Joined"
            value={safeFormatDate(user.createdAt, 'MMM d, yyyy')}
          />
          <StatCard
            icon={Globe}
            label="Locations"
            value={locations?.length || 0}
          />
        </View>

        {/* Locations */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row justify-between items-center">
              <CardTitle>Locations</CardTitle>
              <Text className="text-xs text-muted">
                {locations?.length || 0} {locations?.length === 1 ? 'location' : 'locations'}
              </Text>
            </View>
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <ActivityIndicator size="small" color={colors.cyan.core} />
            ) : locations && locations.length > 0 ? (
              locations.slice(0, 5).map((location, index) => (
                <LocationCard key={`${location.city}-${location.country}-${index}`} location={location} />
              ))
            ) : (
              <Text className="text-sm text-muted py-4 text-center">No locations recorded</Text>
            )}
            {locations && locations.length > 5 && (
              <View className="pt-3 items-center">
                <Text className="text-xs text-muted">
                  +{locations.length - 5} more locations
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Devices */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row justify-between items-center">
              <CardTitle>Devices</CardTitle>
              <Text className="text-xs text-muted">
                {devices?.length || 0} {devices?.length === 1 ? 'device' : 'devices'}
              </Text>
            </View>
          </CardHeader>
          <CardContent>
            {devicesLoading ? (
              <ActivityIndicator size="small" color={colors.cyan.core} />
            ) : devices && devices.length > 0 ? (
              devices.slice(0, 5).map((device, index) => (
                <DeviceCard key={device.deviceId || index} device={device} />
              ))
            ) : (
              <Text className="text-sm text-muted py-4 text-center">No devices recorded</Text>
            )}
            {devices && devices.length > 5 && (
              <View className="pt-3 items-center">
                <Text className="text-xs text-muted">
                  +{devices.length - 5} more devices
                </Text>
              </View>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card className="mb-4">
          <CardHeader>
            <View className="flex-row justify-between items-center">
              <CardTitle>Recent Sessions</CardTitle>
              <Text className="text-xs text-muted">{totalSessions} total</Text>
            </View>
          </CardHeader>
          <CardContent>
            {sessionsLoading ? (
              <ActivityIndicator size="small" color={colors.cyan.core} />
            ) : sessions.length > 0 ? (
              <>
                {sessions.map((session) => (
                  <SessionCard
                    key={session.id}
                    session={session}
                    serverUrl={serverUrl}
                    onPress={() => handleSessionPress(session)}
                  />
                ))}
                {hasMoreSessions && (
                  <Pressable
                    className="py-3 items-center active:opacity-70"
                    onPress={() => void fetchMoreSessions()}
                    disabled={fetchingMoreSessions}
                  >
                    {fetchingMoreSessions ? (
                      <ActivityIndicator size="small" color={colors.cyan.core} />
                    ) : (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm text-cyan-core font-medium">Load More</Text>
                        <ChevronRight size={16} color={colors.cyan.core} />
                      </View>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <Text className="text-sm text-muted py-4 text-center">No sessions found</Text>
            )}
          </CardContent>
        </Card>

        {/* Violations */}
        <Card className="mb-8">
          <CardHeader>
            <View className="flex-row justify-between items-center">
              <CardTitle>Violations</CardTitle>
              <Text className="text-xs text-muted">{totalViolations} total</Text>
            </View>
          </CardHeader>
          <CardContent>
            {violationsLoading ? (
              <ActivityIndicator size="small" color={colors.cyan.core} />
            ) : violations.length > 0 ? (
              <>
                {violations.map((violation) => (
                  <ViolationCard
                    key={violation.id}
                    violation={violation}
                    onAcknowledge={() => acknowledgeMutation.mutate(violation.id)}
                  />
                ))}
                {hasMoreViolations && (
                  <Pressable
                    className="py-3 items-center active:opacity-70"
                    onPress={() => void fetchMoreViolations()}
                    disabled={fetchingMoreViolations}
                  >
                    {fetchingMoreViolations ? (
                      <ActivityIndicator size="small" color={colors.cyan.core} />
                    ) : (
                      <View className="flex-row items-center gap-1">
                        <Text className="text-sm text-cyan-core font-medium">Load More</Text>
                        <ChevronRight size={16} color={colors.cyan.core} />
                      </View>
                    )}
                  </Pressable>
                )}
              </>
            ) : (
              <View className="py-4 items-center">
                <View className="w-12 h-12 rounded-full bg-success/10 items-center justify-center mb-2">
                  <Check size={24} color={colors.success} />
                </View>
                <Text className="text-sm text-muted">No violations</Text>
              </View>
            )}
          </CardContent>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
