/**
 * Settings stack navigator layout
 * Provides navigation between settings sub-screens
 */
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@tracearr/translations/mobile';
import { useResponsive } from '@/hooks/useResponsive';
import { stackHeaderOptions } from '@/components/ui/screen-header';

export default function SettingsLayout() {
  const { t } = useTranslation(['nav', 'mobile']);
  // At compact width the sheet spans the window and iPhone Duo draws its
  // vertical rail over it without reporting a safe-area inset to the sheet, so
  // the window insets pad the content. At regular width the sheet floats clear
  // of the rail and the same insets would only shift it.
  const insets = useSafeAreaInsets();
  const { isTablet } = useResponsive();

  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        contentStyle: {
          ...stackHeaderOptions.contentStyle,
          paddingLeft: isTablet ? 0 : insets.left,
          paddingRight: isTablet ? 0 : insets.right,
        },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('nav:settings') }} />
      <Stack.Screen name="notifications" options={{ title: t('mobile:settings.notifications') }} />
      <Stack.Screen name="language" options={{ title: t('mobile:settings.language') }} />
    </Stack>
  );
}
