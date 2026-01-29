/**
 * Main tab navigation layout (inside drawer)
 * Uses Native Tabs for platform-native experience
 * 4 tabs: Dashboard, Activity, Users, History
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '@/providers/ThemeProvider';

export default function TabLayout() {
  const { accentColor } = useTheme();

  return (
    <NativeTabs tintColor={accentColor} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(dashboard)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.3.group', selected: 'rectangle.3.group.fill' }}
        />
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(activity)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'waveform.path.ecg', selected: 'waveform.path.ecg' }}
        />
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(users)">
        <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <NativeTabs.Trigger.Label>Users</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
