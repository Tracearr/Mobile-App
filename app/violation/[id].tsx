/**
 * Violation Detail Screen
 * Shows comprehensive violation information with stream comparison
 * Mirrors the web ViolationDetailDialog functionality
 *
 * Responsive layout:
 * - Phone: Single column, compact layout
 * - Tablet (md+): Responsive padding, 2-column stream comparison grid
 */
import { useState, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { formatDistanceToNow, format } from 'date-fns';
import {
  MapPin,
  Users,
  Zap,
  Monitor,
  Globe,
  AlertTriangle,
  Check,
  X,
  Clock,
  Film,
  Tv,
  Music,
  AlertCircle,
  CheckCircle2,
  type LucideIcon,
} from 'lucide-react-native';
import { api } from '@/lib/api';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useResponsive } from '@/hooks/useResponsive';
import { Text } from '@/components/ui/text';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserAvatar } from '@/components/ui/user-avatar';
import { colors, spacing } from '@/lib/theme';
import { formatSpeed } from '@tracearr/shared';
import type {
  ViolationWithDetails,
  RuleType,
  UnitSystem,
  ViolationSessionInfo,
} from '@tracearr/shared';

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

// Format violation description
function getViolationDescription(
  violation: ViolationWithDetails,
  unitSystem: UnitSystem = 'metric'
): string {
  const data = violation.data;
  const ruleType = violation.rule?.type;

  if (!data || !ruleType) return 'Rule violation detected';

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

interface StreamCardProps {
  session: ViolationSessionInfo;
  index: number;
  isTriggering: boolean;
  userHistory?: ViolationWithDetails['userHistory'];
}

function StreamCard({ session, index, isTriggering, userHistory }: StreamCardProps) {
  const MediaIcon = getMediaIcon(session.mediaType);

  // Check if values are new (not seen before)
  const isNewIP = userHistory?.previousIPs
    ? !userHistory.previousIPs.includes(session.ipAddress)
    : false;
  const isNewDevice = userHistory?.previousDevices
    ? !userHistory.previousDevices.includes(session.deviceId || session.device || '')
    : false;
  const isNewLocation = userHistory?.previousLocations
    ? !userHistory.previousLocations.some(
        (loc) => loc.city === session.geoCity && loc.country === session.geoCountry
      )
    : false;

  const locationText = [session.geoCity, session.geoRegion, session.geoCountry]
    .filter(Boolean)
    .join(', ');

  return (
    <Card className={isTriggering ? 'border-cyan-core/50 bg-surface/50' : ''}>
      {/* Header */}
      <View className="mb-3">
        <View className="mb-1 flex-row items-center gap-2">
          <Text className="text-muted-foreground text-xs font-medium">
            {isTriggering ? 'Triggering Stream' : `Stream #${index + 1}`}
          </Text>
          {isTriggering && (
            <View className="bg-cyan-core/20 rounded px-1.5 py-0.5">
              <Text className="text-cyan-core text-xs">Primary</Text>
            </View>
          )}
        </View>
        <View className="flex-row items-center gap-2">
          <View className="bg-surface h-8 w-8 items-center justify-center rounded">
            <MediaIcon size={14} color={colors.text.muted.dark} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" numberOfLines={1}>
              {session.mediaTitle}
              {session.grandparentTitle && (
                <Text className="text-muted-foreground"> - {session.grandparentTitle}</Text>
              )}
            </Text>
            <Text className="text-muted-foreground text-xs capitalize">
              {session.mediaType}
              {session.quality && ` - ${session.quality}`}
            </Text>
          </View>
        </View>
      </View>

      {/* Details Grid */}
      <View className="gap-3">
        {/* IP Address */}
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <View className="mb-1 flex-row items-center gap-1.5">
              <Text className="text-muted-foreground text-xs">IP Address</Text>
              {isNewIP ? (
                <AlertCircle size={12} color={colors.warning} />
              ) : (
                <CheckCircle2 size={12} color={colors.success} />
              )}
            </View>
            <Text className="font-mono text-sm">{session.ipAddress}</Text>
            {isNewIP && <Text className="text-warning mt-0.5 text-xs">First time seen</Text>}
          </View>
        </View>

        {/* Location */}
        {locationText && (
          <View>
            <View className="mb-1 flex-row items-center gap-1.5">
              <Text className="text-muted-foreground text-xs">Location</Text>
              {isNewLocation ? (
                <AlertCircle size={12} color={colors.error} />
              ) : (
                <CheckCircle2 size={12} color={colors.success} />
              )}
            </View>
            <Text className="text-sm">{locationText}</Text>
            {isNewLocation && (
              <Text className="text-destructive mt-0.5 text-xs">First time seen</Text>
            )}
          </View>
        )}

        {/* Device */}
        {(session.device || session.deviceId) && (
          <View>
            <View className="mb-1 flex-row items-center gap-1.5">
              <Text className="text-muted-foreground text-xs">Device</Text>
              {isNewDevice ? (
                <AlertCircle size={12} color={colors.orange.core} />
              ) : (
                <CheckCircle2 size={12} color={colors.success} />
              )}
            </View>
            <Text className="text-sm">
              {session.device || session.deviceId}
              {session.playerName && ` (${session.playerName})`}
            </Text>
            {isNewDevice && (
              <Text style={{ color: colors.orange.core }} className="mt-0.5 text-xs">
                First time seen
              </Text>
            )}
          </View>
        )}

        {/* Platform */}
        {session.platform && (
          <View>
            <Text className="text-muted-foreground mb-1 text-xs">Platform</Text>
            <Text className="text-sm">
              {session.platform}
              {session.product && ` - ${session.product}`}
            </Text>
          </View>
        )}

        {/* Started At */}
        <Text className="text-muted-foreground text-xs">
          Started {formatDistanceToNow(new Date(session.startedAt), { addSuffix: true })}
        </Text>
      </View>
    </Card>
  );
}

export default function ViolationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const navigation = useNavigation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { selectedServerId } = useMediaServer();
  const { isTablet, select } = useResponsive();

  // Responsive values
  const horizontalPadding = select({ base: spacing.md, md: spacing.lg, lg: spacing.xl });

  // Get settings for unit system
  const { data: settings } = useQuery({
    queryKey: ['settings'],
    queryFn: api.settings.get,
    staleTime: 1000 * 60 * 5,
  });
  const unitSystem = settings?.unitSystem ?? 'metric';

  // Find the violation from the cached list data
  const violation = useMemo(() => {
    // Get cached violations data
    const cachedData = queryClient.getQueryData<{
      pages: { data: ViolationWithDetails[] }[];
    }>(['violations', selectedServerId]);

    if (!cachedData?.pages) return null;

    // Search through all pages for the violation
    for (const page of cachedData.pages) {
      const found = page.data.find((v) => v.id === id);
      if (found) return found;
    }
    return null;
  }, [queryClient, id, selectedServerId]);

  // Update header title
  const ruleType = violation?.rule?.type as RuleType | undefined;
  const ruleName = ruleType ? ruleLabels[ruleType] : 'Violation';

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['violations', selectedServerId] });
      router.back();
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: api.violations.dismiss,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['violations', selectedServerId] });
      router.back();
    },
  });

  const handleAcknowledge = () => {
    if (!violation) return;
    acknowledgeMutation.mutate(violation.id);
  };

  const handleDismiss = () => {
    if (!violation) return;
    Alert.alert('Dismiss Violation', 'Are you sure you want to dismiss this violation? This will remove it permanently and restore the user\'s trust score.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss',
        style: 'destructive',
        onPress: () => dismissMutation.mutate(violation.id),
      },
    ]);
  };

  const handleUserPress = () => {
    if (violation?.user?.id) {
      router.push(`/user/${violation.user.id}` as never);
    }
  };

  // Collect all sessions for comparison
  const allSessions = useMemo(() => {
    if (!violation) return [];
    const sessions: ViolationSessionInfo[] = [];
    const seenIds = new Set<string>();

    // Add triggering session first
    if (violation.session) {
      sessions.push(violation.session as ViolationSessionInfo);
      seenIds.add(violation.session.id);
    }

    // Add related sessions
    if (violation.relatedSessions) {
      for (const session of violation.relatedSessions) {
        if (!seenIds.has(session.id)) {
          sessions.push(session);
          seenIds.add(session.id);
        }
      }
    }

    return sessions;
  }, [violation]);

  // Analysis stats
  const analysis = useMemo(() => {
    if (allSessions.length <= 1) return null;
    return {
      uniqueIPs: new Set(allSessions.map((s) => s.ipAddress)).size,
      uniqueDevices: new Set(
        allSessions.map((s) => s.deviceId || s.device).filter((d): d is string => !!d)
      ).size,
      uniqueLocations: new Set(
        allSessions
          .map((s) => `${s.geoCity || ''}-${s.geoCountry || ''}`)
          .filter((l) => l !== '-')
      ).size,
    };
  }, [allSessions]);

  if (!violation) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        <View className="flex-1 items-center justify-center px-8">
          <AlertTriangle size={48} color={colors.text.muted.dark} />
          <Text className="mt-4 text-center text-xl font-semibold">Violation Not Found</Text>
          <Text className="text-muted-foreground mt-2 text-center">
            This violation may have been dismissed or is no longer available.
          </Text>
          <Pressable
            className="bg-cyan-core mt-6 rounded-lg px-6 py-3"
            onPress={() => router.back()}
          >
            <Text className="font-semibold text-white">Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const description = getViolationDescription(violation, unitSystem);
  const IconComponent = ruleType ? ruleIcons[ruleType] : AlertTriangle;
  const isPending = !violation.acknowledgedAt;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: horizontalPadding,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xl,
        }}
      >
        {/* User Info */}
        <Card className="mb-4">
          <Pressable className="flex-row items-center gap-4" onPress={handleUserPress}>
            <UserAvatar
              thumbUrl={violation.user?.thumbUrl}
              username={violation.user?.username || 'Unknown'}
              size={isTablet ? 64 : 56}
            />
            <View className="flex-1">
              <Text className="text-lg font-semibold">
                {violation.user?.identityName ?? violation.user?.username}
              </Text>
              {violation.user?.identityName &&
                violation.user.identityName !== violation.user.username && (
                  <Text className="text-muted-foreground text-sm">
                    @{violation.user.username}
                  </Text>
                )}
              {violation.server?.name && (
                <Text className="text-muted-foreground text-sm">{violation.server.name}</Text>
              )}
            </View>
            <SeverityBadge severity={violation.severity} />
          </Pressable>
        </Card>

        {/* Rule Info */}
        <Card className="mb-4">
          <View className="mb-3 flex-row items-center gap-3">
            <View className="bg-cyan-core/15 h-10 w-10 items-center justify-center rounded-lg">
              <IconComponent size={20} color={colors.cyan.core} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold">{violation.rule?.name || ruleName}</Text>
              <Text className="text-muted-foreground text-sm capitalize">
                {ruleType?.replace(/_/g, ' ') || 'Unknown type'}
              </Text>
            </View>
          </View>
          <Text className="text-secondary leading-6">{description}</Text>
        </Card>

        {/* Stream Comparison */}
        {allSessions.length > 0 && (
          <View className="mb-4">
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Film size={16} color={colors.text.muted.dark} />
                <Text className="text-muted-foreground text-sm font-semibold">
                  Stream Comparison
                </Text>
                {allSessions.length > 1 && (
                  <View className="bg-surface rounded px-2 py-0.5">
                    <Text className="text-muted-foreground text-xs">
                      {allSessions.length} streams
                    </Text>
                  </View>
                )}
              </View>
              {/* Analysis badges */}
              {analysis && (
                <View className="flex-row gap-1.5">
                  {analysis.uniqueIPs > 1 && (
                    <View className="bg-warning/20 rounded px-2 py-0.5">
                      <Text className="text-warning text-xs">{analysis.uniqueIPs} IPs</Text>
                    </View>
                  )}
                  {analysis.uniqueDevices > 1 && (
                    <View style={{ backgroundColor: `${colors.orange.core}20` }} className="rounded px-2 py-0.5">
                      <Text style={{ color: colors.orange.core }} className="text-xs">
                        {analysis.uniqueDevices} Devices
                      </Text>
                    </View>
                  )}
                  {analysis.uniqueLocations > 1 && (
                    <View className="bg-destructive/20 rounded px-2 py-0.5">
                      <Text className="text-destructive text-xs">
                        {analysis.uniqueLocations} Locations
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Stream cards */}
            <View style={{ gap: spacing.sm }}>
              {allSessions.map((session, idx) => (
                <StreamCard
                  key={session.id}
                  session={session}
                  index={idx}
                  isTriggering={idx === 0 && violation.session?.id === session.id}
                  userHistory={violation.userHistory}
                />
              ))}
            </View>
          </View>
        )}

        {/* Timestamps */}
        <Card className="mb-4">
          <View className="gap-3">
            <View className="flex-row items-center gap-2">
              <Clock size={16} color={colors.text.muted.dark} />
              <View className="flex-1">
                <Text className="text-muted-foreground text-xs">Created</Text>
                <Text className="text-sm">
                  {formatDistanceToNow(new Date(violation.createdAt), { addSuffix: true })}
                </Text>
                <Text className="text-muted-foreground text-xs">
                  {format(new Date(violation.createdAt), 'PPpp')}
                </Text>
              </View>
            </View>
            {violation.acknowledgedAt && (
              <View className="flex-row items-center gap-2">
                <Check size={16} color={colors.success} />
                <View className="flex-1">
                  <Text className="text-success text-sm">
                    Acknowledged{' '}
                    {formatDistanceToNow(new Date(violation.acknowledgedAt), { addSuffix: true })}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </Card>

        {/* Actions */}
        <View style={{ flexDirection: isTablet ? 'row' : 'column', gap: spacing.sm }}>
          {isPending && (
            <Pressable
              className="bg-cyan-core flex-1 flex-row items-center justify-center gap-2 rounded-lg py-3.5"
              onPress={handleAcknowledge}
              disabled={acknowledgeMutation.isPending}
            >
              {acknowledgeMutation.isPending ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Check size={18} color="white" />
                  <Text className="font-semibold text-white">Acknowledge</Text>
                </>
              )}
            </Pressable>
          )}
          <Pressable
            className="bg-destructive flex-1 flex-row items-center justify-center gap-2 rounded-lg py-3.5"
            onPress={handleDismiss}
            disabled={dismissMutation.isPending}
          >
            {dismissMutation.isPending ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <X size={18} color="white" />
                <Text className="font-semibold text-white">Dismiss</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
