/**
 * Main tab navigation - NativeTabs over four route groups.
 * Detail screens are shared into every group via the
 * (dashboard,activity,users,history) array folder so they push
 * inside each tab's stack and keep the tab bar visible.
 */
import { Platform } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { VectorIcon } from 'expo-router';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { ACCENT_COLOR } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';

export const unstable_settings = {
  initialRouteName: '(dashboard)',
};

export default function TabLayout() {
  const { t } = useTranslation(['nav']);
  const isIOS = Platform.OS === 'ios';

  return (
    <NativeTabs tintColor={ACCENT_COLOR} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(dashboard)">
        {isIOS ? (
          <NativeTabs.Trigger.Icon
            sf={{ default: 'rectangle.3.group', selected: 'rectangle.3.group.fill' }}
          />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="view-dashboard" />}
          />
        )}
        <NativeTabs.Trigger.Label>{t('nav:dashboard')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(activity)">
        {isIOS ? (
          <NativeTabs.Trigger.Icon
            sf={{ default: 'waveform.path.ecg', selected: 'waveform.path.ecg' }}
          />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="pulse" />}
          />
        )}
        <NativeTabs.Trigger.Label>{t('nav:activity')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(users)">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="account-group" />}
          />
        )}
        <NativeTabs.Trigger.Label>{t('nav:users')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} />
        ) : (
          <NativeTabs.Trigger.Icon
            src={<VectorIcon family={MaterialCommunityIcons} name="history" />}
          />
        )}
        <NativeTabs.Trigger.Label>{t('nav:history')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
