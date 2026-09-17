/**
 * Unauthenticated screen component
 * Full-screen replacement when token is revoked or invalid
 * Provides QR scan and manual entry options for re-pairing
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Unlink } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStateStore } from '../lib/authStateStore';
import { colors } from '../lib/theme';
import { instanceHost } from '../lib/utils';
import { useTranslation } from '@tracearr/translations/mobile';

export function UnauthenticatedScreen() {
  const { t } = useTranslation(['mobile']);
  const router = useRouter();
  const cachedServerUrl = useAuthStateStore((s) => s._cachedServerUrl);
  const unpairServer = useAuthStateStore((s) => s.unpairServer);

  const handleScanQR = async () => {
    // Remove the revoked server and reset state before navigating
    await unpairServer();
    router.replace('/(auth)/pair');
  };

  const handleManualEntry = async () => {
    // Remove the revoked server and reset state before navigating
    await unpairServer();
    router.replace({
      pathname: '/(auth)/pair',
      params: { prefillUrl: cachedServerUrl ?? '' },
    });
  };

  const serverDisplay = cachedServerUrl ? instanceHost(cachedServerUrl) : 'your server';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }}>
      <View className="flex-1 items-center justify-center px-8">
        <View className="bg-card border-border mb-6 h-24 w-24 items-center justify-center rounded-full border">
          <Unlink size={48} color={colors.text.muted.dark} />
        </View>

        <Text className="text-foreground mb-4 text-2xl font-semibold">
          {t('mobile:unauthenticated.connectionLost')}
        </Text>

        <Text className="text-secondary-foreground mb-8 text-center text-base leading-6">
          {t('mobile:unauthenticated.accessRevoked', { serverName: serverDisplay })}
        </Text>

        <Pressable
          className="bg-primary mb-4 w-full items-center rounded-md px-8 py-4"
          onPress={() => void handleScanQR()}
        >
          <Text className="text-primary-foreground text-base font-semibold">
            {t('mobile:unauthenticated.scanQrCode')}
          </Text>
        </Pressable>

        <Pressable className="py-4" onPress={() => void handleManualEntry()}>
          <Text className="text-muted-foreground text-base">{t('mobile:pair.enterManually')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
