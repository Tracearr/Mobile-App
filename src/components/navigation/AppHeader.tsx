/**
 * Custom app header with hamburger menu and alerts bell icon
 * - Left: Hamburger menu icon (opens drawer)
 * - Center: Current screen title or server name
 * - Right: Bell icon with unacknowledged alerts badge
 */
import { View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { api } from '@/lib/api';
import { colors } from '@/lib/theme';

interface AppHeaderProps {
  title?: string;
  showServerName?: boolean;
}

export function AppHeader({ title, showServerName = true }: AppHeaderProps) {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { selectedServer, selectedServerId } = useMediaServer();

  // Query for unacknowledged violations count
  const { data: violationsData } = useQuery({
    queryKey: ['violations', 'unacknowledged-count', selectedServerId],
    queryFn: () =>
      api.violations.list({
        serverId: selectedServerId ?? undefined,
        acknowledged: false,
        pageSize: 1, // We only need the total count
      }),
    staleTime: 1000 * 30, // 30 seconds
    enabled: !!selectedServerId,
  });

  const unacknowledgedCount = violationsData?.total ?? 0;

  const handleMenuPress = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleAlertsPress = () => {
    router.push('/alerts');
  };

  // Determine display text: either explicit title or server name
  const displayText = title ?? (showServerName ? selectedServer?.name : undefined);

  return (
    <View
      className="border-border border-b"
      style={{ paddingTop: insets.top, backgroundColor: colors.background.dark }}
    >
      <View className="h-[52] flex-row items-center justify-between px-2">
        {/* Left: Hamburger menu */}
        <Pressable
          onPress={handleMenuPress}
          className="h-11 w-11 items-center justify-center rounded-lg"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={24} color={colors.text.primary.dark} />
        </Pressable>

        {/* Center: Title or Server name */}
        <View className="flex-1 items-center px-2">
          {displayText && (
            <Text className="text-[17px] font-semibold" numberOfLines={1}>
              {displayText}
            </Text>
          )}
        </View>

        {/* Right: Alerts bell with badge */}
        <Pressable
          onPress={handleAlertsPress}
          className="h-11 w-11 items-center justify-center rounded-lg"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View className="relative">
            <Bell size={24} color={colors.text.primary.dark} />
            {unacknowledgedCount > 0 && (
              <View className="bg-destructive absolute -top-1.5 -right-2 min-w-[18] items-center justify-center rounded-[10] px-1 py-0">
                <Text className="text-[10px] font-bold text-white">
                  {unacknowledgedCount > 99 ? '99+' : unacknowledgedCount}
                </Text>
              </View>
            )}
          </View>
        </Pressable>
      </View>
    </View>
  );
}
