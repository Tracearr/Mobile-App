/**
 * Main tab navigation layout
 */
import { Tabs } from 'expo-router';
import {
  LayoutDashboard,
  Activity,
  Users,
  Bell,
  Settings,
  type LucideIcon,
} from 'lucide-react-native';
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
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background.dark,
        },
        headerTintColor: colors.text.primary.dark,
        headerTitleStyle: {
          fontWeight: '600',
        },
        tabBarStyle: {
          backgroundColor: colors.card.dark,
          borderTopColor: colors.border.dark,
          borderTopWidth: 1,
          height: 80,
          paddingBottom: 20,
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
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={LayoutDashboard} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: 'Activity',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Activity} focused={focused} />
          ),
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
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon icon={Bell} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={Settings} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
