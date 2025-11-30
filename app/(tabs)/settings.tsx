/**
 * Settings tab - server info, logout, notification preferences
 */
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/lib/authStore';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
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
    <View style={styles.settingsRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      {value && <Text style={styles.rowValue}>{value}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
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
    <View style={styles.settingsRow}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border.dark, true: colors.cyan.deep }}
        thumbColor={value ? colors.cyan.core : colors.text.muted.dark}
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
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Server Info */}
        <SettingsSection title="Connected Server">
          <SettingsRow label="Server Name" value={serverName || 'Unknown'} />
          <View style={styles.divider} />
          <SettingsRow label="Server URL" value={serverUrl || 'Unknown'} />
        </SettingsSection>

        {/* Notification Settings */}
        <SettingsSection title="Notifications">
          <SettingsToggle
            label="Enable Notifications"
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
          />
          <View style={styles.divider} />
          <SettingsToggle
            label="Alert Notifications"
            value={alertNotifications && notificationsEnabled}
            onValueChange={setAlertNotifications}
          />
          <View style={styles.divider} />
          <SettingsToggle
            label="Session Notifications"
            value={sessionNotifications && notificationsEnabled}
            onValueChange={setSessionNotifications}
          />
          <Text style={styles.hint}>
            Alert notifications notify you when sharing rules are violated. Session notifications
            notify you when streams start or stop.
          </Text>
        </SettingsSection>

        {/* App Info */}
        <SettingsSection title="About">
          <SettingsRow label="App Version" value={appVersion} />
          <View style={styles.divider} />
          <SettingsRow label="Build" value={(Constants.expoConfig?.extra?.buildNumber as string | undefined) ?? 'dev'} />
        </SettingsSection>

        {/* Logout Button */}
        <View style={styles.logoutSection}>
          <Pressable
            style={({ pressed }) => [styles.logoutButton, pressed && styles.logoutButtonPressed]}
            onPress={handleLogout}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.error} />
            ) : (
              <Text style={styles.logoutText}>Disconnect from Server</Text>
            )}
          </Pressable>
          <Text style={styles.logoutHint}>
            You will need to scan a QR code from the web dashboard to reconnect.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.secondary.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.dark,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  rowLabel: {
    fontSize: typography.fontSize.base,
    color: colors.text.primary.dark,
    flex: 1,
  },
  rowValue: {
    fontSize: typography.fontSize.base,
    color: colors.text.muted.dark,
    textAlign: 'right',
    flex: 1,
    marginLeft: spacing.md,
  },
  pressed: {
    opacity: 0.7,
    backgroundColor: colors.background.dark,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.dark,
    marginLeft: spacing.md,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    lineHeight: 16,
  },
  logoutSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
  },
  logoutButton: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.error,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  logoutButtonPressed: {
    opacity: 0.7,
  },
  logoutText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.error,
  },
  logoutHint: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
