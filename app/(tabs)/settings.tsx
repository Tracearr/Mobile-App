/**
 * Settings tab - server info, logout, notification preferences
 * Migrated to NativeWind
 */
import { useState } from 'react';
import { View, ScrollView, Pressable, Switch, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/authStore';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import Constants from 'expo-constants';

function SettingsRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
}) {
  const content = (
    <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
      <Text className="text-base flex-1">{label}</Text>
      {value && <Text className="text-base text-muted text-right flex-1 ml-4">{value}</Text>}
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
  value,
  onValueChange,
}: {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row justify-between items-center px-4 py-3 min-h-[48px]">
      <Text className="text-base flex-1">{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#27272A', true: '#0EAFC8' }}
        thumbColor={value ? '#18D1E7' : '#71717A'}
      />
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
  const { serverUrl, serverName, logout, isLoading } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [alertNotifications, setAlertNotifications] = useState(true);
  const [sessionNotifications, setSessionNotifications] = useState(false);

  const appVersion = Constants.expoConfig?.version || '1.0.0';

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['left', 'right']}>
      <ScrollView className="flex-1" contentContainerClassName="py-4">
        {/* Server Info */}
        <SettingsSection title="Connected Server">
          <SettingsRow label="Server Name" value={serverName || 'Unknown'} />
          <Divider />
          <SettingsRow label="Server URL" value={serverUrl || 'Unknown'} />
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection title="Notifications">
          <SettingsToggle
            label="Enable Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <Divider />
          <SettingsToggle
            label="Alert Notifications"
            value={alertNotifications && notificationsEnabled}
            onValueChange={setAlertNotifications}
          />
          <Divider />
          <SettingsToggle
            label="Session Notifications"
            value={sessionNotifications && notificationsEnabled}
            onValueChange={setSessionNotifications}
          />
          <Text className="text-xs text-muted px-4 py-2 leading-4">
            Alert notifications notify you when sharing rules are violated. Session notifications
            notify you when streams start or stop.
          </Text>
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
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#EF4444" />
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
