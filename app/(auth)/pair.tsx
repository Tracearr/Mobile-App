/**
 * Pairing screen - QR code scanner or manual entry
 * Single-server model - one Tracearr server per mobile app
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStateStore } from '@/lib/authStateStore';
import { validateServerUrl, isInternalUrl, showInternalUrlWarning } from '@/lib/validation';
import { ROUTES } from '@/lib/routes';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useTranslation } from '@tracearr/translations/mobile';
import { ObserveInteractiveMarker } from 'expo-observe';

interface QRPairingPayload {
  url: string;
  token: string;
}

export default function PairScreen() {
  const { t } = useTranslation(['mobile', 'common']);
  const router = useRouter();
  const { prefillUrl } = useLocalSearchParams<{ prefillUrl?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(!!prefillUrl);
  const [serverUrl, setServerUrl] = useState(prefillUrl ?? '');
  const [token, setToken] = useState('');
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scanLockRef = useRef(false);

  // Single-server auth model
  const isInitializing = useAuthStateStore((s) => s.isInitializing);
  const error = useAuthStateStore((s) => s.error);
  const pairServer = useAuthStateStore((s) => s.pairServer);
  const clearError = useAuthStateStore((s) => s.clearError);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scanLockRef.current = false;
    };
  }, []);

  // Clear error when user starts typing
  const handleServerUrlChange = useCallback(
    (text: string) => {
      setServerUrl(text);
      if (error) clearError();
    },
    [error, clearError]
  );

  const handleTokenChange = useCallback(
    (text: string) => {
      setToken(text);
      if (error) clearError();
    },
    [error, clearError]
  );

  const isLoading = isInitializing || isSubmitting;

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    // Use ref for synchronous check - state updates are async and cause race conditions
    if (scanLockRef.current || isLoading) return;
    scanLockRef.current = true;
    setScanned(true);

    try {
      // Parse tracearr://pair?data=<base64>
      if (!data.startsWith('tracearr://pair')) {
        // Silently ignore non-Tracearr QR codes
        setTimeout(() => {
          scanLockRef.current = false;
          setScanned(false);
        }, 2000);
        return;
      }

      const url = new URL(data);
      const base64Data = url.searchParams.get('data');
      if (!base64Data) {
        throw new Error(t('mobile:errors.invalidQrCodeMissingData'));
      }

      // Decode and parse payload
      let payload: QRPairingPayload;
      try {
        const decoded = atob(base64Data);
        payload = JSON.parse(decoded) as QRPairingPayload;
      } catch {
        throw new Error(t('mobile:errors.invalidQrCodeFormat'));
      }

      // Validate payload fields
      if (!payload.url || typeof payload.url !== 'string') {
        throw new Error(t('mobile:errors.invalidQrCodeMissingUrl'));
      }
      if (!payload.token || typeof payload.token !== 'string') {
        throw new Error(t('mobile:errors.invalidQrCodeMissingToken'));
      }

      // Use shared validation
      const validation = validateServerUrl(payload.url);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check for internal/localhost URL and warn
      if (isInternalUrl(payload.url)) {
        const choice = await showInternalUrlWarning();
        if (choice === 'cancel') {
          setTimeout(() => {
            scanLockRef.current = false;
            setScanned(false);
          }, 1000);
          return;
        }
        // User chose to continue - proceed with pairing
        try {
          await pairServer(payload.url, payload.token);
          router.replace(ROUTES.TABS);
        } catch (err) {
          Alert.alert(
            t('mobile:errors.pairingFailed'),
            err instanceof Error ? err.message : t('mobile:errors.unableToPair')
          );
          setTimeout(() => {
            scanLockRef.current = false;
            setScanned(false);
          }, 3000);
        }
        return;
      }

      await pairServer(payload.url, payload.token);
      router.replace(ROUTES.TABS);
    } catch (err) {
      Alert.alert(
        t('mobile:errors.pairingFailed'),
        err instanceof Error ? err.message : t('mobile:errors.invalidQrCode')
      );
      setTimeout(() => {
        scanLockRef.current = false;
        setScanned(false);
      }, 3000);
    }
  };

  const handleManualPair = async () => {
    if (isSubmitting || isInitializing) return;
    setIsSubmitting(true);
    clearError();

    const trimmedUrl = serverUrl.trim();
    const trimmedToken = token.trim();

    // Validate URL
    const urlValidation = validateServerUrl(trimmedUrl);
    if (!urlValidation.valid) {
      Alert.alert(
        t('mobile:errors.invalidUrl'),
        urlValidation.error ?? t('mobile:errors.pleaseEnterValidUrl')
      );
      setIsSubmitting(false);
      return;
    }

    // Validate token
    if (!trimmedToken) {
      Alert.alert(t('mobile:pair.missingToken'), t('mobile:pair.pleaseEnterToken'));
      setIsSubmitting(false);
      return;
    }

    // Check for internal/localhost URL and warn
    if (isInternalUrl(trimmedUrl)) {
      const choice = await showInternalUrlWarning();
      if (choice === 'cancel') {
        setIsSubmitting(false);
        return;
      }
      // User chose to continue - proceed with pairing
      try {
        await pairServer(trimmedUrl, trimmedToken);
        router.replace(ROUTES.TABS);
      } catch {
        // Error stored in auth store - displayed below inputs
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      await pairServer(trimmedUrl, trimmedToken);
      router.replace(ROUTES.TABS);
    } catch {
      // Error is stored in auth store - stay on screen to show error
    } finally {
      setIsSubmitting(false);
    }
  };

  if (manualMode) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: colors.background.dark }}
        edges={['top', 'bottom']}
      >
        <ObserveInteractiveMarker />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, padding: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="items-center px-6 pt-8 pb-6">
              <Text className="text-foreground mb-2 text-center text-2xl font-bold">
                {t('mobile:pair.connectToServer')}
              </Text>
              <Text className="text-muted-foreground text-center text-base leading-6">
                {t('mobile:pair.enterServerDetails')}
              </Text>
            </View>

            <View className="flex-1 gap-4">
              <View className="gap-1">
                <Text className="text-muted-foreground text-sm font-medium">
                  {t('mobile:pair.serverUrl')}
                </Text>
                <TextInput
                  className="bg-card border-border text-foreground rounded-md border p-4 text-base"
                  value={serverUrl}
                  onChangeText={handleServerUrlChange}
                  accessibilityLabel={t('mobile:pair.serverUrl')}
                  placeholder={t('mobile:pair.urlPlaceholder')}
                  placeholderTextColor={colors.text.muted.dark}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!isLoading}
                />
              </View>

              <View className="gap-1">
                <Text className="text-muted-foreground text-sm font-medium">
                  {t('mobile:pair.accessToken')}
                </Text>
                <TextInput
                  className="bg-card border-border text-foreground rounded-md border p-4 text-base"
                  value={token}
                  onChangeText={handleTokenChange}
                  accessibilityLabel={t('mobile:pair.accessToken')}
                  placeholder={t('mobile:pair.tokenPlaceholder')}
                  placeholderTextColor={colors.text.muted.dark}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              {error && <Text className="text-destructive text-center text-sm">{error}</Text>}

              <Button
                size="lg"
                className={cn('mt-2 py-4', isLoading && 'opacity-60')}
                onPress={handleManualPair}
                disabled={isLoading}
              >
                {isLoading ? t('common:states.connecting') : t('common:actions.connect')}
              </Button>

              <Button
                variant="ghost"
                className="py-4"
                onPress={() => setManualMode(false)}
                disabled={isLoading}
              >
                <Text className="text-primary text-base">{t('mobile:pair.scanQrCodeInstead')}</Text>
              </Button>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: colors.background.dark }}
      edges={['top', 'bottom']}
    >
      <ObserveInteractiveMarker />
      <View
        style={{ alignItems: 'center', paddingHorizontal: 24, paddingTop: 32, paddingBottom: 24 }}
      >
        <Text className="text-foreground mb-2 text-center text-2xl font-bold">
          {t('mobile:pair.welcome')}
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          {t('mobile:pair.scanQrInstructions')}
        </Text>
      </View>

      <View
        style={{
          flex: 1,
          marginHorizontal: 24,
          marginBottom: 24,
          borderRadius: 16,
          overflow: 'hidden',
          backgroundColor: colors.background.dark,
        }}
      >
        {permission?.granted ? (
          <View style={{ flex: 1 }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View
              style={StyleSheet.absoluteFill}
              className="items-center justify-center bg-black/30"
            >
              <View
                style={{
                  width: 250,
                  height: 250,
                  borderWidth: 2,
                  borderColor: ACCENT_COLOR,
                  borderRadius: 12,
                }}
              />
            </View>
          </View>
        ) : (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <Text className="text-muted-foreground mb-6 text-center text-base">
              {t('mobile:pair.cameraPermissionRequired')}
            </Text>
            <Button size="lg" className="py-4" onPress={requestPermission}>
              {t('common:actions.continue')}
            </Button>
          </View>
        )}
      </View>

      <View className="items-center px-6 pb-6">
        <Button variant="ghost" className="py-4" onPress={() => setManualMode(true)}>
          <Text className="text-primary text-base">{t('mobile:pair.enterManually')}</Text>
        </Button>
      </View>
    </SafeAreaView>
  );
}
