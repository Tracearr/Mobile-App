/**
 * Settings stack navigator layout
 * Provides navigation between settings sub-screens
 */
import { Stack } from 'expo-router';
import { useTranslation } from '@tracearr/translations/mobile';
import { stackHeaderOptions } from '@/components/ui/screen-header';

export default function SettingsLayout() {
  const { t } = useTranslation(['nav', 'mobile']);

  return (
    <Stack screenOptions={stackHeaderOptions}>
      <Stack.Screen name="index" options={{ title: t('nav:settings') }} />
      <Stack.Screen name="notifications" options={{ title: t('mobile:settings.notifications') }} />
      <Stack.Screen name="language" options={{ title: t('mobile:settings.language') }} />
    </Stack>
  );
}
