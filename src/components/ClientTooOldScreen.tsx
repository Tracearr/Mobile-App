/**
 * Full-screen replacement when the server needs a newer app build.
 * The pairing stays: updating the app is all it takes.
 */
import { View, Pressable, Linking, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpCircle } from 'lucide-react-native';
import { useAuthStateStore } from '../lib/authStateStore';
import { colors } from '../lib/theme';
import { instanceHost } from '../lib/utils';
import { useTranslation } from '@tracearr/translations/mobile';

// ascAppId in eas.json, android.package in app.json
const STORE_URL =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/id6755941553'
    : 'market://details?id=com.tracearr.mobile';

export function ClientTooOldScreen() {
  const { t } = useTranslation(['mobile']);
  const serverUrl = useAuthStateStore((s) => s.server?.url ?? s._cachedServerUrl);

  const serverDisplay = serverUrl ? instanceHost(serverUrl) : 'your server';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="bg-card border-border mb-6 h-24 w-24 items-center justify-center rounded-full border">
          <ArrowUpCircle size={48} color={colors.text.muted.dark} />
        </View>

        <Text accessibilityRole="header" className="text-foreground mb-4 text-2xl font-semibold">
          {t('mobile:clientTooOld.title')}
        </Text>

        <Text className="text-secondary-foreground mb-8 text-center text-base leading-6">
          {t('mobile:clientTooOld.body', { serverName: serverDisplay })}
        </Text>

        <Pressable
          accessibilityRole="button"
          className="bg-primary w-full items-center rounded-md px-8 py-4"
          onPress={() =>
            void Linking.openURL(STORE_URL).catch(() =>
              Linking.openURL(
                'https://play.google.com/store/apps/details?id=com.tracearr.mobile'
              ).catch(() => {})
            )
          }
        >
          <Text className="text-primary-foreground text-base font-semibold">
            {t('mobile:clientTooOld.update')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
