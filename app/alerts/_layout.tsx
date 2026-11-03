import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from '@tracearr/translations/mobile';
import { stackHeaderOptions } from '@/components/ui/screen-header';

export const unstable_settings = {
  anchor: 'index',
};

export default function AlertsLayout() {
  const { t } = useTranslation(['nav']);
  // iPhone Duo's vertical rail arrives as a horizontal safe-area inset; the tab
  // stacks pad for it the same way.
  const insets = useSafeAreaInsets();

  return (
    <Stack
      screenOptions={{
        ...stackHeaderOptions,
        contentStyle: {
          ...stackHeaderOptions.contentStyle,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="violation/[id]" options={{ title: t('nav:violation') }} />
      <Stack.Screen name="user/[id]" options={{ title: t('nav:user') }} />
      <Stack.Screen name="session/[id]" options={{ title: t('nav:session') }} />
    </Stack>
  );
}
