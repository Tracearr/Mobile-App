/**
 * Main tab navigation layout (inside drawer)
 * Uses Native Tabs for platform-native experience
 * 4 tabs: Dashboard, Activity, Users, History
 */
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { VectorIcon } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ACCENT_COLOR } from '@/lib/theme';

// Force Dashboard (index) as the initial tab on app launch
export const unstable_settings = {
  initialRouteName: 'index',
};

export default function TabLayout() {
  // On iOS, use SF Symbols. On Android, use Material Community Icons via VectorIcon.
  const isIOS = Platform.OS === 'ios';

  return (
    <NativeTabs tintColor={ACCENT_COLOR} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        {isIOS ? (
          <NativeTabs.Trigger.Icon
            sf={{ default: 'rectangle.3.group', selected: 'rectangle.3.group.fill' }}
          />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="view-dashboard" />}
          />
        )}
        <NativeTabs.Trigger.Label>Dashboard</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        {isIOS ? (
          <NativeTabs.Trigger.Icon
            sf={{ default: 'waveform.path.ecg', selected: 'waveform.path.ecg' }}
          />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="pulse" />}
          />
        )}
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="users">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="account-group" />}
          />
        )}
        <NativeTabs.Trigger.Label>Users</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="history" />}
          />
        )}
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
