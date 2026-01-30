/**
 * Custom drawer content for the hamburger menu
 * Contains: Server Switcher, Settings link, User profile section at bottom
 */
import { View, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, ChevronRight } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { UserAvatar } from '@/components/ui/user-avatar';
import { ServerSelector } from '@/components/ServerSelector';
import { api } from '@/lib/api';
import { useTheme } from '@/providers/ThemeProvider';
import { spacing, withAlpha } from '@/lib/theme';

interface DrawerItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  showChevron?: boolean;
  accentColor: string;
}

function DrawerItem({ icon, label, onPress, showChevron = true, accentColor }: DrawerItemProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between px-4 py-3.5"
      android_ripple={{ color: withAlpha(accentColor, '20') }}
    >
      <View className="flex-row items-center gap-4">
        {icon}
        <Text className="text-[15px] font-medium">{label}</Text>
      </View>
      {showChevron && <ChevronRight size={20} className="text-muted-foreground" />}
    </Pressable>
  );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6 px-4">
      <Text className="text-muted-foreground mb-2 ml-2 text-[11px] font-semibold tracking-wider uppercase">
        {title}
      </Text>
      <View className="bg-card overflow-hidden rounded-xl">{children}</View>
    </View>
  );
}

export function DrawerContent(props: DrawerContentComponentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { accentColor } = useTheme();

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
    <View className="bg-background flex-1" style={{ paddingTop: insets.top }}>
      {/* Scrollable content area */}
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: spacing.md }}>
        {/* App Title */}
        <View className="border-border mb-4 border-b px-6 pb-6">
          <Text className="text-2xl font-bold" style={{ color: accentColor }}>
            Tracearr
          </Text>
        </View>

        {/* Server Section - uses existing ServerSelector */}
        <DrawerSection title="Server">
          <View className="py-2">
            <ServerSelector />
          </View>
        </DrawerSection>

        {/* Navigation Section */}
        <DrawerSection title="Navigation">
          <DrawerItem
            icon={<Settings size={20} className="text-muted-foreground" />}
            label="Settings"
            onPress={handleSettingsPress}
            accentColor={accentColor}
          />
        </DrawerSection>
      </ScrollView>

      {/* User Profile Section - fixed at bottom */}
      <View
        className="border-border border-t px-4 pt-4"
        style={{ paddingBottom: insets.bottom + (spacing.md as number) }}
      >
        {userLoading ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : user ? (
          <View className="flex-row items-center gap-4">
            <UserAvatar thumbUrl={user.thumbUrl} username={user.username} size={40} />
            <View className="flex-1">
              <Text className="text-[15px] font-semibold" numberOfLines={1}>
                {user.friendlyName}
              </Text>
              <Text className="text-muted-foreground text-xs capitalize">{user.role}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
