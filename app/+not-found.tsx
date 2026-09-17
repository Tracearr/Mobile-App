/**
 * 404 Not Found screen
 */
import { Stack, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertCircle } from 'lucide-react-native';
import { EmptyState } from '@/components/ui/empty-state';
import { colors } from '@/lib/theme';
import { useTranslation } from '@tracearr/translations/mobile';

export default function NotFoundScreen() {
  const router = useRouter();
  const { t } = useTranslation(['common']);

  return (
    <>
      <Stack.Screen options={{ title: t('common:errors.pageNotFound') }} />
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
        <EmptyState
          className="flex-1 justify-center"
          icon={AlertCircle}
          title={t('common:errors.pageNotFound')}
          description={t('common:errors.pageNotFoundDesc')}
          action={{ label: t('common:actions.goHome'), onPress: () => router.replace('/') }}
        />
      </SafeAreaView>
    </>
  );
}
