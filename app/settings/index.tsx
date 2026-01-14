/**
 * Settings Index Screen
 * Main settings page with links to sub-settings, external links, and disconnect option
 */
import { View, Pressable, Alert, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Bell,
  ChevronRight,
  LogOut,
  Info,
  Server,
  MessageCircle,
  Code2,
} from 'lucide-react-native';
import Constants from 'expo-constants';
import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/lib/authStore';
import { colors, spacing, borderRadius } from '@/lib/theme';

const DISCORD_URL = 'https://discord.gg/tracearr';
const GITHUB_URL = 'https://github.com/cgallopo/tracearr';

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

function SettingsRow({
  icon,
  label,
  description,
  onPress,
  showChevron = true,
  destructive = false,
  external = false,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onPress: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  external?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={styles.rowLeft}>
        {icon}
        <View style={styles.rowText}>
          <Text style={[styles.rowLabel, destructive && styles.destructiveText]}>{label}</Text>
          {description && <Text style={styles.rowDescription}>{description}</Text>}
        </View>
      </View>
      {showChevron && !external && <ChevronRight size={20} color={colors.text.muted.dark} />}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const { removeActiveServer, activeServer } = useAuthStore();
  const appVersion = Constants.expoConfig?.version || '1.0.0';
  const buildNumber = (Constants.expoConfig?.extra?.buildNumber as string | undefined) ?? 'dev';

  const handleDisconnect = () => {
    Alert.alert(
      'Disconnect Server',
      activeServer
        ? `Are you sure you want to disconnect from "${activeServer.name}"? You will need to pair again to use the app.`
        : 'Are you sure you want to disconnect? You will need to pair again to use the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await removeActiveServer();
              router.replace('/(auth)/pair');
            })();
          },
        },
      ]
    );
  };

  const handleDiscordPress = () => {
    void Linking.openURL(DISCORD_URL);
  };

  const handleGithubPress = () => {
    void Linking.openURL(GITHUB_URL);
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Notifications */}
        <SettingsSection title="Preferences">
          <SettingsRow
            icon={<Bell size={20} color={colors.text.secondary.dark} />}
            label="Notifications"
            description="Configure push notification preferences"
            onPress={() => router.push('/settings/notifications')}
          />
        </SettingsSection>

        {/* Links */}
        <SettingsSection title="Community">
          <SettingsRow
            icon={<MessageCircle size={20} color="#5865F2" />}
            label="Discord"
            description="Join the community"
            onPress={handleDiscordPress}
            showChevron={false}
            external
          />
          <View style={styles.divider} />
          <SettingsRow
            icon={<Code2 size={20} color={colors.text.secondary.dark} />}
            label="GitHub"
            description="View source code"
            onPress={handleGithubPress}
            showChevron={false}
            external
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title="Account">
          <SettingsRow
            icon={<LogOut size={20} color={colors.error} />}
            label="Disconnect"
            description={activeServer ? `Currently connected to ${activeServer.name}` : undefined}
            onPress={handleDisconnect}
            showChevron={false}
            destructive
          />
        </SettingsSection>

        {/* Spacer to push About to bottom */}
        <View style={styles.spacer} />

        {/* About - at very bottom */}
        <View style={styles.aboutSection}>
          <View style={styles.aboutRow}>
            <Info size={16} color={colors.text.muted.dark} />
            <Text style={styles.aboutText}>Version {appVersion}</Text>
          </View>
          <View style={styles.aboutRow}>
            <Server size={16} color={colors.text.muted.dark} />
            <Text style={styles.aboutText}>Build {buildNumber}</Text>
          </View>
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
    flexGrow: 1,
    padding: spacing.md,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
  },
  sectionContent: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary.dark,
  },
  rowDescription: {
    fontSize: 12,
    color: colors.text.muted.dark,
    marginTop: 2,
  },
  destructiveText: {
    color: colors.error,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.dark,
    marginLeft: (spacing.md as number) + 20 + (spacing.md as number), // icon width + gaps
  },
  spacer: {
    flex: 1,
    minHeight: spacing.xl,
  },
  aboutSection: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.xs,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  aboutText: {
    fontSize: 12,
    color: colors.text.muted.dark,
  },
});
