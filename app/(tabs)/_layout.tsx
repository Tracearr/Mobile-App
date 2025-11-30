/**
 * Main tab navigation layout
 */
import { Tabs } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

// Simple icon components (will be replaced with proper icons)
function TabIcon({ focused }: { focused: boolean }) {
  return (
    <View style={[styles.iconContainer, focused && styles.iconFocused]}>
      <View style={styles.icon}>
        <View style={{ opacity: focused ? 1 : 0.6 }}>
          <View>
            {/* Placeholder for actual icons */}
            <View style={[styles.iconPlaceholder, { backgroundColor: focused ? colors.cyan.core : colors.text.muted.dark }]} />
          </View>
        </View>
      </View>
    </View>
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
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarLabel: 'Activity',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Users',
          tabBarLabel: 'Users',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="alerts"
        options={{
          title: 'Alerts',
          tabBarLabel: 'Alerts',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconFocused: {
    // Add any focused styling
  },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 4,
  },
});
