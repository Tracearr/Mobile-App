/**
 * Custom app header with hamburger menu and alerts bell icon
 * - Left: Hamburger menu icon (opens drawer)
 * - Center: Current screen title or server name
 * - Right: Bell icon with unacknowledged alerts badge
 */
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { DrawerActions, useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Menu, Bell } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { api } from '@/lib/api';
import { colors, spacing } from '@/lib/theme';

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        {/* Left: Hamburger menu */}
        <Pressable
          onPress={handleMenuPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Menu size={24} color={colors.text.primary.dark} />
        </Pressable>

        {/* Center: Title or Server name */}
        <View style={styles.titleContainer}>
          {displayText && (
            <Text style={styles.title} numberOfLines={1}>
              {displayText}
            </Text>
          )}
        </View>

        {/* Right: Alerts bell with badge */}
        <Pressable
          onPress={handleAlertsPress}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.bellContainer}>
            <Bell size={24} color={colors.text.primary.dark} />
            {unacknowledgedCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 52,
    paddingHorizontal: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  bellContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
});
