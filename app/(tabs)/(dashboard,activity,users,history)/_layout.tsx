/**
 * Shared stack layout for all four tab groups. The array folder name
 * instantiates this layout (and the detail routes beside it) once per
 * group, replacing the four previously copy-pasted tab layouts.
 * Tab root screens set their own titles via <Stack.Screen options>.
 */
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';

export const unstable_settings = {
  initialRouteName: 'index',
  activity: {
    initialRouteName: 'activity',
  },
  users: {
    initialRouteName: 'users',
  },
  history: {
    initialRouteName: 'history',
  },
};

export default function TabStackLayout() {
  const { t } = useTranslation(['nav']);
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.text.primary.dark,
        headerTitleStyle: { fontWeight: '600' },
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background.dark },
        contentStyle: { backgroundColor: colors.background.dark },
        headerTitleAlign: 'center',
      }}
    >
      <Stack.Screen name="session/[id]" options={{ title: t('nav:session') }} />
      <Stack.Screen name="user/[id]" options={{ title: t('nav:user') }} />
      <Stack.Screen name="violation/[id]" options={{ title: t('nav:violation') }} />
    </Stack>
  );
}
