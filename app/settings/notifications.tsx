/**
 * Notification Settings Screen
 * Per-device push notification configuration
 */
import { useState } from 'react';
import { View, ScrollView, Switch, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  ShieldAlert,
  Play,
  RefreshCw,
  Square,
  Monitor,
  Smartphone,
  AlertTriangle,
  ServerCrash,
  ServerCog,
  Moon,
  Flame,
  MapPin,
  Users,
  Zap,
  Globe,
  Clock,
  type LucideIcon,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { SectionHeader } from '@/components/ui/section-header';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { cn } from '@/lib/utils';
import { haptics } from '@/lib/haptics';
import { queryKeys } from '@/lib/queryKeys';
import { api } from '@/lib/api';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useServerVersion } from '@/hooks/useServerVersion';
import { backgroundRefreshStatus } from '@/lib/widgetBridge';
import { SERVER_2_2 } from '@/lib/serverVersion';
import { colors, ACCENT_COLOR } from '@/lib/theme';
import type { NotificationPreferences } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';

// Legacy rule types, only offered to servers before 2.2
const RULE_TYPES: { value: string; icon: LucideIcon }[] = [
  { value: 'impossible_travel', icon: MapPin },
  { value: 'simultaneous_locations', icon: Users },
  { value: 'device_velocity', icon: Zap },
  { value: 'concurrent_streams', icon: Monitor },
  { value: 'geo_restriction', icon: Globe },
  { value: 'account_inactivity', icon: Clock },
];

function Divider() {
  return <View className="bg-border ml-4 h-px" />;
}

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <SectionHeader title={title} className="mb-2" />
      <Card padding="none" className="overflow-hidden">
        {children}
      </Card>
    </View>
  );
}

function SettingRow({
  icon: Icon,
  label,
  description,
  value,
  onValueChange,
  disabled,
}: {
  icon?: LucideIcon;
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="min-h-[52px] flex-row items-center justify-between px-4 py-3">
      <View className="mr-4 flex-1">
        <View className="flex-row items-center">
          {Icon && (
            <Icon
              size={18}
              color={disabled ? colors.text.muted.dark : colors.text.secondary.dark}
              style={{ marginRight: 10 }}
            />
          )}
          <Text className={cn('text-base', disabled && 'opacity-50')}>{label}</Text>
        </View>
        {description ? (
          <Text
            className={cn(
              'text-muted-foreground mt-0.5 text-xs',
              Icon && 'ml-7',
              disabled && 'opacity-50'
            )}
          >
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={label}
        disabled={disabled}
        trackColor={{ false: colors.switch.trackOff, true: colors.switch.trackOn }}
        thumbColor={value ? colors.switch.thumbOn : colors.switch.thumbOff}
      />
    </View>
  );
}

function RateLimitStatus({
  remainingMinute,
  remainingHour,
  maxPerMinute,
  maxPerHour,
}: {
  remainingMinute?: number;
  remainingHour?: number;
  maxPerMinute: number;
  maxPerHour: number;
}) {
  const { t } = useTranslation(['notifications']);
  return (
    <View className="px-4 py-3">
      <Text className="text-muted-foreground mb-2 text-sm">
        {t('notifications:settings.rateLimit')}
      </Text>
      <View className="flex-row gap-4">
        <View className="bg-surface flex-1 rounded-lg p-3">
          <Text className="text-muted-foreground mb-1 text-xs">
            {t('notifications:settings.perMinute')}
          </Text>
          <Text className="text-lg font-semibold">
            {remainingMinute ?? maxPerMinute} / {maxPerMinute}
          </Text>
        </View>
        <View className="bg-surface flex-1 rounded-lg p-3">
          <Text className="text-muted-foreground mb-1 text-xs">
            {t('notifications:settings.perHour')}
          </Text>
          <Text className="text-lg font-semibold">
            {remainingHour ?? maxPerHour} / {maxPerHour}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function NotificationSettingsScreen() {
  const { t } = useTranslation(['mobile', 'common', 'notifications']);
  const [backgroundRefresh] = useState(backgroundRefreshStatus);
  const queryClient = useQueryClient();
  const server = useAuthStateStore((s) => s.server);
  // 2.2 servers ignore the per-rule-type filter (rule.type is null on automation runs).
  const { supports } = useServerVersion();
  const showRuleTypes = !supports(SERVER_2_2);

  // Fetch current preferences (per-device, not per-server)
  const {
    data: preferences,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.notifications.preferences(),
    queryFn: ({ signal }) => api.notifications.getPreferences(signal),
    enabled: !!server, // Still need auth
  });

  // Update mutation with optimistic updates
  const updateMutation = useMutation({
    mutationFn: api.notifications.updatePreferences,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.notifications.preferences() });
      const previousData = queryClient.getQueryData<NotificationPreferences>(
        queryKeys.notifications.preferences()
      );
      queryClient.setQueryData(
        queryKeys.notifications.preferences(),
        (old: NotificationPreferences | undefined) => (old ? { ...old, ...newData } : old)
      );
      return { previousData };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKeys.notifications.preferences(), context.previousData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications.preferences() });
    },
  });

  // Test notification mutation
  const testMutation = useMutation({
    mutationFn: api.notifications.sendTest,
    onSuccess: (result) => {
      Alert.alert(
        result.success ? t('mobile:notifications.testSent') : t('mobile:notifications.testFailed'),
        result.message
      );
    },
    onError: (error: Error) => {
      Alert.alert(
        t('common:states.error'),
        error.message || t('mobile:notifications.failedToSendTest')
      );
    },
  });

  const handleUpdate = (
    key: keyof Omit<NotificationPreferences, 'id' | 'mobileSessionId' | 'createdAt' | 'updatedAt'>,
    value: boolean | number | string[]
  ) => {
    updateMutation.mutate({ [key]: value });
  };

  if (isLoading) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={ACCENT_COLOR} />
          <Text className="text-muted-foreground mt-4">
            {t('mobile:notifications.loadingPreferences')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!preferences) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['left', 'right', 'bottom']}
      >
        <ErrorState
          className="flex-1 justify-center"
          title={t('mobile:notifications.unableToLoadPreferences')}
          message={error?.message ?? t('common:errors.generic')}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const pushEnabled = preferences.pushEnabled;

  const ruleTypeLabels: Record<string, string> = {
    impossible_travel: t('mobile:notifications.ruleTypes.impossibleTravel', {
      defaultValue: 'Impossible Travel',
    }),
    simultaneous_locations: t('mobile:notifications.ruleTypes.simultaneousLocations', {
      defaultValue: 'Simultaneous Locations',
    }),
    device_velocity: t('mobile:notifications.ruleTypes.deviceVelocity', {
      defaultValue: 'Device Velocity',
    }),
    concurrent_streams: t('notifications:settings.concurrentStreams'),
    geo_restriction: t('mobile:notifications.ruleTypes.geoRestriction', {
      defaultValue: 'Geo Restriction',
    }),
    account_inactivity: t('mobile:notifications.ruleTypes.accountInactivity', {
      defaultValue: 'Account Inactivity',
    }),
  };

  const severityOptions: SegmentedOption<string>[] = [
    {
      value: '1',
      label: t('mobile:notifications.severityAll', { defaultValue: 'All' }),
      accessibilityLabel: t('notifications:settings.allSeverity'),
    },
    {
      value: '2',
      label: t('mobile:notifications.severityWarningUp', { defaultValue: 'Warning+' }),
      accessibilityLabel: t('notifications:settings.warningAndHigh'),
    },
    {
      value: '3',
      label: t('mobile:notifications.severityHighOnly', { defaultValue: 'High only' }),
      accessibilityLabel: t('notifications:settings.highOnly'),
    },
  ];

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ScrollView style={{ flex: 1 }} contentContainerClassName="p-4">
        {/* Master Toggle */}
        <SettingsSection
          title={t('mobile:notifications.pushNotifications', {
            defaultValue: 'Push Notifications',
          })}
        >
          <SettingRow
            icon={Bell}
            label={t('notifications:settings.enablePushNotifications')}
            description={t('mobile:notifications.receiveAlerts')}
            value={pushEnabled}
            onValueChange={(v) => handleUpdate('pushEnabled', v)}
          />
          {backgroundRefresh === 'denied' || backgroundRefresh === 'restricted' ? (
            <>
              <Divider />
              <View className="flex-row items-center px-4 py-3">
                <RefreshCw
                  size={18}
                  color={colors.text.secondary.dark}
                  style={{ marginRight: 10 }}
                />
                <Text className="text-muted-foreground flex-1 text-xs">
                  {t('mobile:notifications.backgroundRefreshOff', {
                    defaultValue:
                      'Background App Refresh is off for Tracearr. Silent pushes cannot update the widget until it is on.',
                  })}
                </Text>
              </View>
            </>
          ) : null}
        </SettingsSection>

        {/* Event Toggles */}
        <SettingsSection title={t('notifications:settings.notificationEvents')}>
          <SettingRow
            icon={ShieldAlert}
            label={t('notifications:settings.violationDetected')}
            description={t('mobile:notifications.ruleViolationTriggered')}
            value={preferences.onViolationDetected}
            onValueChange={(v) => handleUpdate('onViolationDetected', v)}
            disabled={!pushEnabled}
          />
          <Divider />
          <SettingRow
            icon={Play}
            label={t('notifications:settings.streamStarted')}
            description={t('mobile:notifications.newPlaybackBegan')}
            value={preferences.onStreamStarted}
            onValueChange={(v) => handleUpdate('onStreamStarted', v)}
            disabled={!pushEnabled}
          />
          <Divider />
          <SettingRow
            icon={Square}
            label={t('notifications:settings.streamStopped')}
            description={t('mobile:notifications.playbackEnded')}
            value={preferences.onStreamStopped}
            onValueChange={(v) => handleUpdate('onStreamStopped', v)}
            disabled={!pushEnabled}
          />
          <Divider />
          <SettingRow
            icon={Smartphone}
            label={t('notifications:settings.newDevice')}
            description={t('mobile:notifications.newDeviceDetected')}
            value={preferences.onNewDevice}
            onValueChange={(v) => handleUpdate('onNewDevice', v)}
            disabled={!pushEnabled}
          />
          <Divider />
          <SettingRow
            icon={AlertTriangle}
            label={t('notifications:settings.trustScoreChanged')}
            description={t('mobile:notifications.trustScoreDegraded')}
            value={preferences.onTrustScoreChanged}
            onValueChange={(v) => handleUpdate('onTrustScoreChanged', v)}
            disabled={!pushEnabled}
          />
          <Divider />
          <SettingRow
            icon={ServerCrash}
            label={t('notifications:settings.serverDown')}
            description={t('mobile:notifications.serverUnreachable')}
            value={preferences.onServerDown}
            onValueChange={(v) => handleUpdate('onServerDown', v)}
            disabled={!pushEnabled}
          />
          <Divider />
          <SettingRow
            icon={ServerCog}
            label={t('notifications:settings.serverUp')}
            description={t('mobile:notifications.serverBackOnline')}
            value={preferences.onServerUp}
            onValueChange={(v) => handleUpdate('onServerUp', v)}
            disabled={!pushEnabled}
          />
        </SettingsSection>

        {/* Violation Filters - Only show if violation notifications are enabled */}
        {pushEnabled && preferences.onViolationDetected && (
          <>
            {showRuleTypes && (
              <SettingsSection
                title={t('mobile:notifications.violationTypes', {
                  defaultValue: 'Violation Types',
                })}
              >
                <SettingRow
                  icon={ShieldAlert}
                  label={t('mobile:notifications.allViolationTypes')}
                  description={t('mobile:notifications.notifyForEveryRule')}
                  value={preferences.violationRuleTypes.length === 0}
                  onValueChange={(allEnabled) => {
                    if (allEnabled) {
                      handleUpdate('violationRuleTypes', []);
                    } else {
                      // When turning off "All", enable all individual types
                      handleUpdate(
                        'violationRuleTypes',
                        RULE_TYPES.map((r) => r.value)
                      );
                    }
                  }}
                />
                {preferences.violationRuleTypes.length > 0 && (
                  <>
                    {RULE_TYPES.map((ruleType) => {
                      const isEnabled = preferences.violationRuleTypes.includes(ruleType.value);
                      return (
                        <View key={ruleType.value}>
                          <Divider />
                          <SettingRow
                            icon={ruleType.icon}
                            label={ruleTypeLabels[ruleType.value] ?? ruleType.value}
                            value={isEnabled}
                            onValueChange={(enabled) => {
                              const current = preferences.violationRuleTypes;
                              if (enabled) {
                                handleUpdate('violationRuleTypes', [...current, ruleType.value]);
                              } else {
                                const updated = current.filter((v) => v !== ruleType.value);
                                // If none left, keep at least one or revert to all
                                handleUpdate(
                                  'violationRuleTypes',
                                  updated.length === 0 ? [] : updated
                                );
                              }
                            }}
                          />
                        </View>
                      );
                    })}
                  </>
                )}
              </SettingsSection>
            )}

            <SettingsSection title={t('notifications:settings.minimumSeverity')}>
              <View className="px-4 py-3">
                <SegmentedControl
                  options={severityOptions}
                  value={String(preferences.violationMinSeverity)}
                  onChange={(value) => {
                    haptics.selection();
                    handleUpdate('violationMinSeverity', Number(value));
                  }}
                  accessibilityLabel={t('notifications:settings.minimumSeverity')}
                />
                <Text className="text-muted-foreground mt-2 text-xs">
                  {t('mobile:notifications.severityDescription')}
                </Text>
              </View>
            </SettingsSection>
          </>
        )}

        {/* Quiet Hours */}
        <SettingsSection title={t('notifications:settings.quietHours')}>
          <SettingRow
            icon={Moon}
            label={t('notifications:settings.enableQuietHours')}
            description={t('mobile:notifications.quietHoursDescription')}
            value={preferences.quietHoursEnabled}
            onValueChange={(v) => handleUpdate('quietHoursEnabled', v)}
            disabled={!pushEnabled}
          />
          {pushEnabled && preferences.quietHoursEnabled && (
            <>
              <Divider />
              <View className="px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-muted-foreground text-sm">
                      {t('mobile:notifications.startTime')}
                    </Text>
                    <Text className="text-base">{preferences.quietHoursStart ?? '23:00'}</Text>
                  </View>
                  <Text className="text-muted-foreground mx-4">{t('mobile:notifications.to')}</Text>
                  <View>
                    <Text className="text-muted-foreground text-sm">
                      {t('mobile:notifications.endTime')}
                    </Text>
                    <Text className="text-base">{preferences.quietHoursEnd ?? '08:00'}</Text>
                  </View>
                </View>
                <Text className="text-muted-foreground mt-2 text-xs">
                  {t('mobile:notifications.timezoneLabel', {
                    timezone: preferences.quietHoursTimezone || 'UTC',
                  })}
                </Text>
              </View>
              <Divider />
              <SettingRow
                icon={Flame}
                label={t('notifications:settings.overrideForCritical')}
                description={t('mobile:notifications.criticalOverrideDescription')}
                value={preferences.quietHoursOverrideCritical}
                onValueChange={(v) => handleUpdate('quietHoursOverrideCritical', v)}
              />
            </>
          )}
        </SettingsSection>

        {/* Rate Limiting */}
        <SettingsSection title={t('notifications:settings.rateLimiting')}>
          <RateLimitStatus
            remainingMinute={preferences.rateLimitStatus?.remainingMinute}
            remainingHour={preferences.rateLimitStatus?.remainingHour}
            maxPerMinute={preferences.maxPerMinute}
            maxPerHour={preferences.maxPerHour}
          />
          <Divider />
          <View className="px-4 py-2">
            <Text className="text-muted-foreground text-xs leading-4">
              {t('mobile:notifications.rateLimitDescription', {
                perMinute: preferences.maxPerMinute,
                perHour: preferences.maxPerHour,
              })}
            </Text>
          </View>
        </SettingsSection>

        {/* Test Notification */}
        <View className="mt-2 mb-4">
          <Button
            onPress={() => testMutation.mutate()}
            disabled={!pushEnabled || testMutation.isPending}
            className={cn(!pushEnabled && 'opacity-50')}
          >
            {testMutation.isPending ? (
              <ActivityIndicator size="small" color={colors.background.dark} />
            ) : (
              t('mobile:notifications.sendTestNotification')
            )}
          </Button>
          <Text className="text-muted-foreground mt-2 text-center text-xs">
            {t('mobile:notifications.testDescription')}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
