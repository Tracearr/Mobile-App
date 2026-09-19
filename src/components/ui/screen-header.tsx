import { Platform, Pressable } from 'react-native';
import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { colors } from '@/lib/theme';

export const stackHeaderOptions = {
  headerShown: true,
  headerTintColor: colors.text.primary.dark,
  headerTitleStyle: { fontWeight: '600' },
  headerTitleAlign: 'center',
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background.dark },
  contentStyle: { backgroundColor: colors.background.dark },
} as const satisfies NativeStackNavigationOptions;

export function HeaderBackButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation(['common']);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('common:actions.back')}
      className="h-11 w-11 items-center justify-center"
    >
      <ChevronLeft size={24} color={colors.text.primary.dark} />
    </Pressable>
  );
}

export interface ScreenHeaderProps {
  title: string;
  /**
   * Replaces the native back button. Only for screens the stack cannot pop on
   * its own: the first screen of a modal's nested stack, or a screen opened
   * from a push notification with no history behind it.
   */
  onBack?: () => void;
  right?: NativeStackNavigationOptions['headerRight'];
}

export function ScreenHeader({ title, onBack, right }: ScreenHeaderProps) {
  const { t } = useTranslation(['common']);
  const useToolbar = Platform.OS === 'ios';

  return (
    <>
      <Stack.Screen
        options={{
          ...stackHeaderOptions,
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
