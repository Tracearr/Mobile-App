import { PixelRatio, Platform, Pressable } from 'react-native';
import { Stack, useNavigation, useRouter, type NativeStackNavigationOptions } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { colors } from '@/lib/theme';

const headerOptions = {
  headerShown: true,
  headerTintColor: colors.text.primary.dark,
  headerTitleStyle: { fontWeight: '600' },
  headerTitleAlign: 'center',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background.dark },
} as const satisfies NativeStackNavigationOptions;

// Layout-level defaults. Screens spread headerOptions instead, so a layout's
// contentStyle (background, safe-area padding) is not overridden per screen.
export const stackHeaderOptions = {
  ...headerOptions,
  contentStyle: { backgroundColor: colors.background.dark },
} as const satisfies NativeStackNavigationOptions;

// Numeric so the target is 48 dp (h-12 rendered at 42 dp; see button.tsx on
// rem). The size is 48 dp rounded up to a whole pixel: Yoga
// would otherwise round it to the nearest pixel and lose up to half of one
// where 48 dp is fractional, and slop cannot make that up, because the native
// toolbar only delivers touches inside this view's bounds.
const BACK_BUTTON_DP = Math.ceil(48 * PixelRatio.get()) / PixelRatio.get();
const BACK_BUTTON_SIZE = { width: BACK_BUTTON_DP, height: BACK_BUTTON_DP };

export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation(['common']);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common:actions.back')}
      className="items-center justify-center"
      style={BACK_BUTTON_SIZE}
    >
      <ArrowLeft size={24} color={colors.text.primary.dark} />
    </Pressable>
  );
}

export interface ScreenHeaderProps {
  title: string;
  /**
   * Replaces the native back button where there is none: on iOS the first screen
   * of a nested stack (Settings, Alerts), and on either platform a screen opened
   * from a push notification with no history behind it. Android's toolbar shows
   * its own up button on a nested stack's first screen, so it is kept there.
   */
  onBack?: () => void;
  right?: NativeStackNavigationOptions['headerRight'];
}

export function ScreenHeader({ title, onBack: onBackProp, right }: ScreenHeaderProps) {
  const { t } = useTranslation(['common']);
  const router = useRouter();
  const navigation = useNavigation();
  const useToolbar = Platform.OS === 'ios';
  // Both sources, because each is false on one first render: router.canGoBack()
  // until the container reports ready (a screen seeded under a cold deep link),
  // navigation.canGoBack() until a nested stack has joined its parent (Alerts
  // pushed from a tab).
  const canGoBack = router.canGoBack() || navigation.canGoBack();
  const onBack = useToolbar || !canGoBack ? onBackProp : undefined;

  return (
    <>
      <Stack.Screen
        options={{
          ...headerOptions,
          title,
          // These screens sit on the root stack, where the screen behind is a
          // route group like (tabs) whose name iOS would print as the back label.
          headerBackButtonDisplayMode: 'minimal',
          headerBackVisible: !onBack,
          headerLeft:
            onBack && !useToolbar ? () => <HeaderBackButton onPress={onBack} /> : undefined,
          headerRight: right,
        }}
      />
      {onBack && useToolbar ? (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Button
            icon="chevron.left"
            accessibilityLabel={t('common:actions.back')}
            onPress={onBack}
          />
        </Stack.Toolbar>
      ) : null}
    </>
  );
}
