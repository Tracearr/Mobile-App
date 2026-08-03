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

/**
 * Detail titles come from this map rather than <Stack.Screen> children on
 * purpose. Declaring children makes expo-router order the stack by the
 * declaration list and demote the group's anchor to last (see
 * getSortedChildren in expo-router/build/useScreens.js), so every tab whose
 * stack was still empty opened session/[id] with no id instead of its own
 * root screen. Keeping the child list empty lets the anchor sort first.
 */
const DETAIL_TITLE_KEYS = {
  'session/[id]': 'nav:session',
  'user/[id]': 'nav:user',
  'violation/[id]': 'nav:violation',
} as const;

export default function TabStackLayout() {
  const { t } = useTranslation(['nav']);
  return (
    <Stack
      screenOptions={({ route }) => {
        const titleKey = DETAIL_TITLE_KEYS[route.name as keyof typeof DETAIL_TITLE_KEYS];
        return {
          headerTintColor: colors.text.primary.dark,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background.dark },
          contentStyle: { backgroundColor: colors.background.dark },
          headerTitleAlign: 'center',
          // Root screens override this with their own <Stack.Screen options>.
          ...(titleKey ? { title: t(titleKey) } : {}),
        };
      }}
    />
  );
}
