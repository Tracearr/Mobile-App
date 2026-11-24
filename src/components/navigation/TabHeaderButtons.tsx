/**
 * Header controls for the four tab root screens, defined once.
 * Android: HeaderLeft / HeaderRight for the shared stack layout.
 * iOS: TabToolbar renders the same three as native Stack.Toolbar items, the
 * server picker as a menu; each tab screen mounts it with one line.
 */
import { View, Pressable, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Server, Bell, Settings } from 'lucide-react-native';
import { useUnacknowledgedAlertsCount } from '@/hooks';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { ROUTES } from '@/lib/routes';
import { serverLogo } from '@/lib/serverLogos';
import { serverSubtitle } from '@/lib/utils';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useTranslation } from '@tracearr/translations/mobile';

// Header icons sit in the native toolbar, which only delivers touches inside a
// view's bounds, so the 48 dp target is the view itself.
export const ICON_BUTTON = {
  width: 48,
  height: 48,
  alignItems: 'center',
  justifyContent: 'center',
} as const;

function useAlertsButton() {
  const { t } = useTranslation(['mobile']);
  const { count, hasAlerts, displayCount } = useUnacknowledgedAlertsCount();
  return {
    hasAlerts,
    displayCount,
    label: hasAlerts ? t('mobile:a11y.alertsCount', { count }) : t('mobile:a11y.alerts'),
  };
}

export function HeaderLeft() {
  const { t } = useTranslation(['mobile']);
  const router = useRouter();
  const { servers } = useMediaServer();
  if (servers.length < 2) return null;
  return (
    <Pressable
      onPress={() => router.push(ROUTES.SERVER_SELECT)}
      accessibilityRole="button"
      accessibilityLabel={t('mobile:a11y.selectServer')}
      style={ICON_BUTTON}
    >
      <Server size={24} color={colors.text.primary.dark} />
    </Pressable>
  );
}

export function HeaderRight() {
  const { t } = useTranslation(['mobile']);
  const router = useRouter();
  const { hasAlerts, displayCount, label } = useAlertsButton();

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Pressable
        onPress={() => router.push(ROUTES.ALERTS)}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={ICON_BUTTON}
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
              <Text
                maxFontSizeMultiplier={1.5}
                style={{ fontSize: 10, fontWeight: '700', color: colors.text.primary.dark }}
              >
                {displayCount}
              </Text>
            </View>
          )}
        </View>
      </Pressable>
      <Pressable
        onPress={() => router.push(ROUTES.SETTINGS)}
        accessibilityRole="button"
        accessibilityLabel={t('mobile:a11y.settings')}
        style={ICON_BUTTON}
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
  const { t } = useTranslation(['mobile', 'common']);
  const router = useRouter();
  const { hasAlerts, displayCount, label } = useAlertsButton();
  const { servers, selectedServerIds, isAllServersSelected, toggleServer, selectAllServers } =
    useMediaServer();

  if (Platform.OS !== 'ios') {
    return null;
  }

  return (
    <>
      {servers.length > 1 && (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.Menu
            icon="server.rack"
            title={t('mobile:serverSelector.selectServers')}
            accessibilityLabel={t('mobile:a11y.selectServer')}
          >
            <Stack.Toolbar.MenuAction
              isOn={isAllServersSelected}
              unstable_keepPresented
              onPress={selectAllServers}
            >
              {t('mobile:serverSelector.allServers')}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.Menu inline>
              {servers.map((server) => {
                const isOn = selectedServerIds.includes(server.id);
                return (
                  <Stack.Toolbar.MenuAction
                    key={server.id}
                    isOn={isOn}
                    disabled={isOn && selectedServerIds.length === 1}
                    subtitle={serverSubtitle(server, t('common:serverSelector.historical'))}
                    icon={serverLogo(server.type)}
                    iconRenderingMode="original"
                    unstable_keepPresented
                    onPress={() => toggleServer(server.id)}
                  >
                    {server.name}
                  </Stack.Toolbar.MenuAction>
                );
              })}
            </Stack.Toolbar.Menu>
          </Stack.Toolbar.Menu>
        </Stack.Toolbar>
      )}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="bell"
          accessibilityLabel={label}
          onPress={() => router.push(ROUTES.ALERTS)}
        >
          {hasAlerts && <Stack.Toolbar.Badge>{displayCount}</Stack.Toolbar.Badge>}
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Button
          icon="gearshape"
          accessibilityLabel={t('mobile:a11y.settings')}
          onPress={() => router.push(ROUTES.SETTINGS)}
        />
      </Stack.Toolbar>
    </>
  );
}
