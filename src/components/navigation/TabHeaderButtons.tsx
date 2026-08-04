/**
 * Header controls for the four tab root screens, defined once.
 * Android: HeaderLeft / HeaderRight for the shared stack layout.
 * iOS: TabToolbar renders the same three actions as native Stack.Toolbar
 * buttons; each tab screen mounts it with one line.
 */
import { View, Pressable, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Server, Bell, Settings } from 'lucide-react-native';
import { useUnacknowledgedAlertsCount } from '@/hooks';
import { Text } from '@/components/ui/text';
import { colors, spacing } from '@/lib/theme';
import { ROUTES } from '@/lib/routes';
import { useTranslation } from '@tracearr/translations/mobile';

export function HeaderLeft() {
  const { t } = useTranslation(['mobile']);
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(ROUTES.SERVER_SELECT)}
      accessibilityRole="button"
      accessibilityLabel={t('mobile:a11y.selectServer')}
      style={{ padding: spacing.xs }}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Server size={24} color={colors.text.primary.dark} />
    </Pressable>
  );
}

export function HeaderRight() {
  const { t } = useTranslation(['mobile']);
  const router = useRouter();
  const { hasAlerts, displayCount } = useUnacknowledgedAlertsCount();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={() => router.push(ROUTES.ALERTS)}
        accessibilityRole="button"
        accessibilityLabel={
          hasAlerts
            ? t('mobile:a11y.alertsCount', { count: Number(displayCount) || 0 })
            : t('mobile:a11y.alerts')
        }
        style={{ padding: spacing.xs }}
        hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      >
        <View style={{ position: 'relative' }}>
          <Bell size={24} color={colors.text.primary.dark} />
          {hasAlerts && (
            <View
              style={{
                position: 'absolute',
                top: -6,
                right: -8,
                minWidth: 18,
                borderRadius: 10,
                backgroundColor: colors.error,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#fff' }}>{displayCount}</Text>
            </View>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push(ROUTES.SETTINGS)}
        accessibilityRole="button"
        accessibilityLabel={t('mobile:a11y.settings')}
        style={{ padding: spacing.xs }}
        hitSlop={{ top: 10, bottom: 10, left: 4, right: 4 }}
      >
        <Settings size={24} color={colors.text.primary.dark} />
      </Pressable>
    </View>
  );
}

/**
 * Spread into each tab root screen's <Stack.Screen options>. Detail
 * screens keep the native back button, so this must not live in the
 * stack's screenOptions.
 */
export const androidHeaderOptions =
  Platform.OS === 'android'
    ? {
        headerLeft: () => <HeaderLeft />,
        headerRight: () => <HeaderRight />,
      }
    : {};

export function TabToolbar() {
  const router = useRouter();
  const { hasAlerts, displayCount } = useUnacknowledgedAlertsCount();

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button
          icon="server.rack"
          onPress={() => router.push(ROUTES.SERVER_SELECT)}
        />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button icon="bell" onPress={() => router.push(ROUTES.ALERTS)}>
          {hasAlerts && <Stack.Toolbar.Badge>{displayCount}</Stack.Toolbar.Badge>}
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button icon="gearshape" onPress={() => router.push(ROUTES.SETTINGS)} />
      </Stack.Toolbar>
    </>
  );
}
