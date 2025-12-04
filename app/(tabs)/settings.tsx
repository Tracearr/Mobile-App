/**
 * Settings tab - server info, logout, notification preferences
 * Migrated to NativeWind with real API integration
 */
import { View, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronRight } from 'lucide-react-native';
import { useAuthStore } from '@/lib/authStore';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';
import Constants from 'expo-constants';

function SettingsRow({
  label,
  value,
  onPress,
  showChevron,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const content = (
    <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
      <Text className="text-base flex-1">{label}</Text>
      <View className="flex-row items-center">
        {value && <Text className="text-base text-muted text-right ml-4">{value}</Text>}
        {showChevron && (
          <ChevronRight size={20} color={colors.text.muted.dark} className="ml-2" />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} className="active:opacity-70 active:bg-background">
        {content}
      </Pressable>
    );
  }

  return content;
}

function SettingsToggle({
  label,
  description,
  value,
  onValueChange,
  disabled,
  isLoading,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  isLoading?: boolean;
}) {
  return (
    <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
      <View className="flex-1 mr-4">
        <Text className={cn('text-base', disabled && 'opacity-50')}>{label}</Text>
        {description && (
          <Text className={cn('text-xs text-muted mt-0.5', disabled && 'opacity-50')}>
            {description}
          </Text>
        )}
      </View>
      {isLoading ? (
        <ActivityIndicator size="small" color={colors.cyan.core} />
      ) : (
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          trackColor={{ false: colors.switch.trackOff, true: colors.switch.trackOn }}
          thumbColor={value ? colors.switch.thumbOn : colors.switch.thumbOff}
        />
      )}
    </View>
  );
}

function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-6 px-4">
      <Text className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
        {title}
      </Text>
      <Card className="p-0 overflow-hidden">{children}</Card>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-border ml-4" />;
}

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { serverUrl, serverName, logout, isLoading: isLoggingOut } = useAuthStore();

  const appVersion = Constants.expoConfig?.version || '1.0.0';

  // Fetch notification preferences
  const {
    data: preferences,
    isLoading: isLoadingPrefs,
    error: prefsError,
  } = useQuery({
    queryKey: ['notifications', 'preferences'],
    queryFn: api.notifications.getPreferences,
    staleTime: 1000 * 60, // 1 minute
  });

  // Update mutation for quick toggle
  const updateMutation = useMutation({
    mutationFn: api.notifications.updatePreferences,
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: ['notifications', 'preferences'] });
      const previousData = queryClient.getQueryData(['notifications', 'preferences']);
      queryClient.setQueryData(['notifications', 'preferences'], (old: typeof preferences) =>
        old ? { ...old, ...newData } : old
      );
      return { previousData };
    },
    onError: (_err, _newData, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(['notifications', 'preferences'], context.previousData);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications', 'preferences'] });
    },
  });

  const handleLogout = () => {
    Alert.alert(
      'Disconnect from Server',
      `Are you sure you want to disconnect from ${serverName || 'this server'}? You will need to scan a new QR code to reconnect.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => void logout(),
        },
      ]
    );
  };

  const handleTogglePush = (value: boolean) => {
    updateMutation.mutate({ pushEnabled: value });
  };

  const navigateToNotificationSettings = () => {
    router.push('/settings/notifications');
  };

  // Count enabled notification events for summary
  const enabledEventCount = preferences
    ? [
        preferences.onViolationDetected,
        preferences.onStreamStarted,
        preferences.onStreamStopped,
        preferences.onConcurrentStreams,
        preferences.onNewDevice,
        preferences.onTrustScoreChanged,
        preferences.onServerDown,
        preferences.onServerUp,
      ].filter(Boolean).length
    : 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerClassName="py-4">
        {/* Server Info */}
        <SettingsSection title="Connected Server">
          <SettingsRow label="Server Name" value={serverName || 'Unknown'} />
          <Divider />
          <SettingsRow label="Server URL" value={serverUrl || 'Unknown'} />
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection title="Notifications">
          {prefsError ? (
            <View className="px-4 py-3">
              <Text className="text-destructive text-sm">
                Failed to load notification settings
              </Text>
            </View>
          ) : (
            <>
              <SettingsToggle
                label="Push Notifications"
                description="Receive alerts on this device"
                value={preferences?.pushEnabled ?? false}
                onValueChange={handleTogglePush}
                isLoading={isLoadingPrefs}
                disabled={updateMutation.isPending}
              />
              <Divider />
              <SettingsRow
                label="Notification Settings"
                value={
                  preferences?.pushEnabled
                    ? `${enabledEventCount} events enabled`
                    : 'Disabled'
                }
                onPress={navigateToNotificationSettings}
                showChevron
              />
              <Text className="text-xs text-muted px-4 py-2 leading-4">
                Configure which events trigger notifications, quiet hours, and filters.
              </Text>
            </>
          )}
        </SettingsSection>

        {/* App Info */}
        <SettingsSection title="About">
          <SettingsRow label="App Version" value={appVersion} />
          <Divider />
          <SettingsRow
            label="Build"
            value={(Constants.expoConfig?.extra?.buildNumber as string | undefined) ?? 'dev'}
          />
        </SettingsSection>

        {/* Logout Button */}
        <View className="px-4 mt-4">
          <Pressable
            className={cn(
              'bg-card rounded-lg border border-destructive py-3 items-center justify-center min-h-[48px]',
              'active:opacity-70'
            )}
            onPress={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text className="text-base font-semibold text-destructive">
                Disconnect from Server
              </Text>
            )}
          </Pressable>
          <Text className="text-xs text-muted text-center mt-2">
            You will need to scan a QR code from the web dashboard to reconnect.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
