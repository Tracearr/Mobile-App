/**
 * Custom drawer content for the hamburger menu
 * Contains: Server Switcher, Settings link, User profile section at bottom
 */
import { View, Pressable, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ServerSelector } from '@/components/ServerSelector';
import { api } from '@/lib/api';
import { colors, spacing, withAlpha } from '@/lib/theme';

interface DrawerItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
}

function DrawerItem({ icon, label, onPress, showChevron = true }: DrawerItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.drawerItem}
      android_ripple={{ color: withAlpha(colors.cyan.core, '20') }}
    >
      <View style={styles.drawerItemLeft}>
        {icon}
        <Text style={styles.drawerItemLabel}>{label}</Text>
      </View>
      {showChevron && <ChevronRight size={20} color={colors.text.muted.dark} />}
    </Pressable>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch current user profile
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['mobile', 'me'],
    queryFn: () => api.me(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleSettingsPress = () => {
    props.navigation.closeDrawer();
    router.push('/settings');
  };

  return (
    <View style={[styles.drawer, { paddingTop: insets.top }]}>
      {/* Scrollable content area */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Title */}
        <View style={styles.header}>
          <Text style={styles.appTitle}>Tracearr</Text>
        </View>

        {/* Server Section - uses existing ServerSelector */}
        <DrawerSection title="Server">
          <View style={styles.serverSelectorWrapper}>
            <ServerSelector />
          </View>
        </DrawerSection>

        {/* Navigation Section */}
        <DrawerSection title="Navigation">
          <DrawerItem
            icon={<Settings size={20} color={colors.text.secondary.dark} />}
            label="Settings"
            onPress={handleSettingsPress}
          />
        </DrawerSection>
      </ScrollView>

      {/* User Profile Section - fixed at bottom */}
      <View style={[styles.userSection, { paddingBottom: insets.bottom + (spacing.md as number) }]}>
        {userLoading ? (
          <ActivityIndicator size="small" color={colors.cyan.core} />
        ) : user ? (
          <View style={styles.userInfo}>
            <UserAvatar thumbUrl={user.thumbUrl} username={user.username} size={40} />
            <View style={styles.userText}>
              <Text style={styles.userName} numberOfLines={1}>
                {user.friendlyName}
              </Text>
              <Text style={styles.userRole}>{user.role}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  drawer: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
    marginBottom: spacing.md,
  },
  appTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.cyan.core,
  },
  section: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.text.muted.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginLeft: spacing.sm,
  },
  sectionContent: {
    backgroundColor: colors.card.dark,
    borderRadius: 12,
    overflow: 'hidden',
  },
  serverSelectorWrapper: {
    paddingVertical: spacing.sm,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  drawerItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  drawerItemLabel: {
    fontSize: 15,
    color: colors.text.primary.dark,
    fontWeight: '500',
  },
  userSection: {
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
    paddingTop: spacing.md,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  userText: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  userRole: {
    fontSize: 12,
    color: colors.text.muted.dark,
    textTransform: 'capitalize',
  },
});
