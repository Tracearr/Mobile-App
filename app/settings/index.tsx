/**
 * Settings Index Screen
 * Main settings page with links to sub-settings, external links, and disconnect option
 */
import { View, Pressable, Alert, ScrollView, Linking, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowUpCircle,
  Bell,
  ChevronRight,
  Languages,
  LogOut,
  Info,
  Server,
  MessageCircle,
  Code2,
  BookOpen,
  Globe,
  Heart,
  Workflow,
} from 'lucide-react-native';
import * as Application from 'expo-application';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { SectionHeader } from '@/components/ui/section-header';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useServerVersion, SERVER_2_2 } from '@/hooks/useServerVersion';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { ROUTES } from '@/lib/routes';
import { useAuthStateStore } from '@/lib/authStateStore';
import { colors } from '@/lib/theme';
import { instanceHost } from '@/lib/utils';
import {
  getCurrentLanguage,
  getLanguageDisplayName,
  useTranslation,
} from '@tracearr/translations/mobile';

const DISCORD_URL = 'https://discord.gg/a7n3sFd2Yw';
const DOCS_URL = 'https://docs.tracearr.com/';
const WEBSITE_URL = 'https://tracearr.com';
const GITHUB_URL = 'https://github.com/connorgallopo/Tracearr';
const SPONSOR_URL = 'https://github.com/sponsors/connorgallopo';

function openUrl(url: string) {
  void Linking.openURL(url);
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
    <Pressable
      onPress={onPress}
      accessibilityRole={external ? 'link' : 'button'}
      className="flex-row items-center justify-between px-4 py-3.5"
    >
      <View className="flex-1 flex-row items-center gap-4">
        {icon}
        <View className="flex-1">
          <Text className={`text-[15px] font-medium ${destructive ? 'text-destructive' : ''}`}>
            {label}
          </Text>
          {description ? (
            <Text className="text-muted-foreground mt-0.5 text-xs">{description}</Text>
          ) : null}
        </View>
      </View>
      {showChevron && !external && <ChevronRight size={20} color={colors.icon.default} />}
    </Pressable>
  );
}

function ProfileRow() {
  const { t } = useTranslation(['mobile']);
  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.me(),
    queryFn: ({ signal }) => api.me(signal),
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <View className="items-center px-4 py-3.5">
        <ActivityIndicator size="small" color={colors.text.secondary.dark} />
      </View>
    );
  }
  if (!user) return null;

  return (
    <View className="flex-row items-center gap-4 px-4 py-3.5">
      <UserAvatar thumbUrl={user.thumbUrl} username={user.username} size={40} />
      <View className="flex-1">
        <Text className="text-[15px] font-semibold" numberOfLines={1}>
          {user.friendlyName}
        </Text>
        <Text className="text-muted-foreground text-xs capitalize">
          {user.role === 'owner' ? t('mobile:users.owner') : user.role}
        </Text>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const { t } = useTranslation(['mobile', 'common', 'nav', 'settings', 'pages']);
  const router = useRouter();
  const server = useAuthStateStore((s) => s.server);
  const unpairServer = useAuthStateStore((s) => s.unpairServer);
  const { supports, updateAvailable, latestVersion, releaseUrl, upgradeWarnings } =
    useServerVersion();
  const host = server ? instanceHost(server.url) : null;
  const showUpdate = updateAvailable && latestVersion !== null && releaseUrl !== null;
  const showAutomations = supports(SERVER_2_2);
  const appVersion = Application.nativeApplicationVersion ?? '1.0.0';
  const buildNumber = Application.nativeBuildVersion ?? 'dev';

  const handleDisconnect = () => {
    Alert.alert(
      t('mobile:settings.disconnectServer'),
      host
        ? t('mobile:settings.disconnectConfirm', { serverName: host })
        : t('mobile:settings.disconnectConfirmGeneric'),
      [
        { text: t('common:actions.cancel'), style: 'cancel' },
        {
          text: t('common:actions.disconnect'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await unpairServer();
              router.replace(ROUTES.PAIR);
            })();
          },
        },
      ]
    );
  };

  const handleUpdatePress = () => {
    if (!releaseUrl) return;
    if (upgradeWarnings.length === 0) {
      openUrl(releaseUrl);
      return;
    }
    Alert.alert(
      t('settings:update.beforeUpdating'),
      upgradeWarnings.map((w) => `v${w.version}: ${w.text}`).join('\n\n'),
      [
        { text: t('common:actions.later'), style: 'cancel' },
        { text: t('common:actions.viewOnGithub'), onPress: () => openUrl(releaseUrl) },
      ]
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['left', 'right', 'bottom']}
    >
      <ScreenHeader title={t('nav:settings')} onBack={() => router.back()} />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, padding: 16 }}>
        {(showUpdate || showAutomations) && (
          <SettingsSection title={t('common:labels.server')}>
            {showUpdate && (
              <SettingsRow
                icon={<ArrowUpCircle size={20} color={colors.success} />}
                label={t('settings:update.title')}
                description={
                  upgradeWarnings.length > 0
                    ? `${t('settings:update.versionAvailable', { version: latestVersion })} · ${t('settings:update.beforeUpdating')}`
                    : t('settings:update.versionAvailable', { version: latestVersion })
                }
                onPress={handleUpdatePress}
                showChevron={false}
                external
              />
            )}
            {showUpdate && showAutomations && <View className="bg-border ml-14 h-px" />}
            {showAutomations && (
              <SettingsRow
                icon={<Workflow size={20} color={colors.icon.default} />}
                label={t('nav:automations')}
                description={t('pages:automations.description')}
                onPress={() => router.push(ROUTES.AUTOMATIONS)}
              />
            )}
          </SettingsSection>
        )}

        {/* Preferences */}
        <SettingsSection title={t('mobile:settings.preferences')}>
          <SettingsRow
            icon={<Bell size={20} color={colors.icon.default} />}
            label={t('mobile:settings.notifications')}
            description={t('mobile:settings.configureNotifications')}
            onPress={() => router.push('/settings/notifications')}
          />
          <View className="bg-border ml-14 h-px" />
          <SettingsRow
            icon={<Languages size={20} color={colors.icon.default} />}
            label={t('mobile:settings.language')}
            description={getLanguageDisplayName(getCurrentLanguage())}
            onPress={() => router.push('/settings/language')}
          />
        </SettingsSection>

        {/* Links */}
        <SettingsSection title={t('mobile:settings.community')}>
          <SettingsRow
            icon={<MessageCircle size={20} color="#5865F2" />}
            label={t('mobile:settings.discord')}
            description={t('mobile:settings.joinCommunity')}
            onPress={() => openUrl(DISCORD_URL)}
            showChevron={false}
            external
          />
          <View className="bg-border ml-14 h-px" />
          <SettingsRow
            icon={<BookOpen size={20} color={colors.icon.default} />}
            label={t('mobile:settings.docs')}
            description={t('mobile:settings.readDocs')}
            onPress={() => openUrl(DOCS_URL)}
            showChevron={false}
            external
          />
          <View className="bg-border ml-14 h-px" />
          <SettingsRow
            icon={<Globe size={20} color={colors.icon.default} />}
            label={t('mobile:settings.website')}
            description={t('mobile:settings.visitWebsite')}
            onPress={() => openUrl(WEBSITE_URL)}
            showChevron={false}
            external
          />
          <View className="bg-border ml-14 h-px" />
          <SettingsRow
            icon={<Code2 size={20} color={colors.icon.default} />}
            label={t('mobile:settings.github')}
            description={t('mobile:settings.viewSourceCode')}
            onPress={() => openUrl(GITHUB_URL)}
            showChevron={false}
            external
          />
          <View className="bg-border ml-14 h-px" />
          <SettingsRow
            icon={<Heart size={20} color="#DB61A2" />}
            label={t('mobile:settings.sponsor')}
            description={t('mobile:settings.supportDevelopment')}
            onPress={() => openUrl(SPONSOR_URL)}
            showChevron={false}
            external
          />
        </SettingsSection>

        {/* Account */}
        <SettingsSection title={t('mobile:settings.account')}>
          <ProfileRow />
          <SettingsRow
            icon={<LogOut size={20} color={colors.icon.danger} />}
            label={t('mobile:settings.disconnect')}
            description={
              host ? t('mobile:settings.currentlyConnected', { serverName: host }) : undefined
            }
            onPress={handleDisconnect}
            showChevron={false}
            destructive
          />
        </SettingsSection>

        {/* Spacer to push About to bottom */}
        <View className="min-h-8 flex-1" />

        {/* About - at very bottom */}
        <View className="items-center gap-1 py-6">
          <View className="flex-row items-center gap-2">
            <Info size={16} color={colors.icon.default} />
            <Text className="text-muted-foreground text-xs">
              {t('mobile:settings.version', { version: appVersion })}
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <Server size={16} color={colors.icon.default} />
            <Text className="text-muted-foreground text-xs">
              {t('mobile:settings.build', { build: buildNumber })}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
