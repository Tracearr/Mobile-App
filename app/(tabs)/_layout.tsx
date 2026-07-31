/**
 * Main tab navigation - NativeTabs over four route groups.
 * Detail screens are shared into every group via the
 * (dashboard,activity,users,history) array folder so they push
 * inside each tab's stack and keep the tab bar visible.
 */
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { ACCENT_COLOR } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';

export const unstable_settings = {
  initialRouteName: '(dashboard)',
};

export default function TabLayout() {
  const { t } = useTranslation(['nav']);

  return (
    <NativeTabs tintColor={ACCENT_COLOR} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="(dashboard)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'rectangle.3.group', selected: 'rectangle.3.group.fill' }}
          md="dashboard"
        />
        <NativeTabs.Trigger.Label>{t('nav:dashboard')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(activity)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'waveform.path.ecg', selected: 'waveform.path.ecg' }}
          md="monitoring"
        />
        <NativeTabs.Trigger.Label>{t('nav:activity')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(users)">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.2', selected: 'person.2.fill' }}
          md="group"
        />
        <NativeTabs.Trigger.Label>{t('nav:users')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(history)">
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} md="history" />
        <NativeTabs.Trigger.Label>{t('nav:history')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
