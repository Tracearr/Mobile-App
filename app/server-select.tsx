/**
 * Server switcher, presented as a form sheet from the tab headers.
 * Replaces the drawer's server section. Always multi-select, with an
 * explicit All row above the per-server rows.
 */
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServerSelector } from '@/components/ServerSelector';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';

export default function ServerSelectScreen() {
  const { t } = useTranslation(['mobile']);

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background.dark }}>
      <View className="border-border border-b px-6 py-4">
        <Text className="text-lg font-semibold">{t('mobile:navigation.server')}</Text>
      </View>
      <View className="py-2">
        <ServerSelector />
      </View>
    </SafeAreaView>
  );
}
