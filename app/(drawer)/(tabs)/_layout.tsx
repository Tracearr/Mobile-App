/**
 * Main tab navigation layout (inside drawer)
 * 4 tabs: Dashboard, Activity, Users, History
 */
import { Tabs } from 'expo-router';
import { LayoutDashboard, Activity, Users, History, type LucideIcon } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/lib/theme';

interface TabIconProps {
  icon: LucideIcon;
  focused: boolean;
}

function TabIcon({ icon: Icon, focused }: TabIconProps) {
  return (
    <Icon
      size={24}
      color={focused ? colors.cyan.core : colors.text.muted.dark}
      strokeWidth={focused ? 2.5 : 2}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Dynamic tab bar height: base height + safe area bottom inset
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tabs
      screenOptions={{
        header: () => <AppHeader />,
        tabBarStyle: {
          backgroundColor: colors.card.dark,
          borderTopColor: colors.border.dark,
          borderTopWidth: 1,
          height: tabBarHeight,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarActiveTintColor: colors.cyan.core,
        tabBarInactiveTintColor: colors.text.muted.dark,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ focused }) => <TabIcon icon={LayoutDashboard} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: 'Activity',
          tabBarIcon: ({ focused }) => <TabIcon icon={Activity} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarLabel: 'Users',
          tabBarIcon: ({ focused }) => <TabIcon icon={Users} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ focused }) => <TabIcon icon={History} focused={focused} />,
        }}
      />
    </Tabs>
  );
}
