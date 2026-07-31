/**
 * Server switcher, presented as a form sheet from the tab headers.
 * Replaces the drawer's server section. Multi-select is only offered
 * when opened from the Dashboard (other screens are single-server).
 */
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ServerSelector } from '@/components/ServerSelector';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';

export default function ServerSelectScreen() {
  const { t } = useTranslation(['mobile']);
  const { multi } = useLocalSearchParams<{ multi?: string }>();

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.background.dark }}>
      <View className="border-border border-b px-6 py-4">
        <Text className="text-lg font-semibold">{t('mobile:navigation.server')}</Text>
      </View>
      <View className="py-2">
        <ServerSelector multiSelect={multi === '1'} />
      </View>
    </SafeAreaView>
  );
}
