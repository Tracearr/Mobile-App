/**
 * Pairing screen - QR code scanner or manual entry
 * Single-server model - one Tracearr server per mobile app
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
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
import { validateServerUrl, isInternalUrl } from '@/lib/validation';
import { ROUTES } from '@/lib/routes';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/providers/ThemeProvider';

interface QRPairingPayload {
  url: string;
  token: string;
}

export default function PairScreen() {
  const router = useRouter();
  const { prefillUrl } = useLocalSearchParams<{ prefillUrl?: string }>();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualMode, setManualMode] = useState(!!prefillUrl);
  const [serverUrl, setServerUrl] = useState(prefillUrl ?? '');
  const [token, setToken] = useState('');
  const [scanned, setScanned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scanLockRef = useRef(false);
  const { accentColor } = useTheme();

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
        throw new Error('Invalid QR code: missing pairing data');
      }

      // Decode and parse payload
      let payload: QRPairingPayload;
      try {
        const decoded = atob(base64Data);
        payload = JSON.parse(decoded) as QRPairingPayload;
      } catch {
        throw new Error('Invalid QR code format. Please generate a new code.');
      }

      // Validate payload fields
      if (!payload.url || typeof payload.url !== 'string') {
        throw new Error('Invalid QR code: missing server URL');
      }
      if (!payload.token || typeof payload.token !== 'string') {
        throw new Error('Invalid QR code: missing pairing token');
      }

      // Use shared validation
      const validation = validateServerUrl(payload.url);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Check for internal/localhost URL and warn
      if (isInternalUrl(payload.url)) {
        Alert.alert(
          'Internal URL Detected',
          'This QR code contains a local network address that may not work outside your home network.\n\nSet an External URL in Settings → General on your Tracearr web dashboard to enable remote access.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                setTimeout(() => {
                  scanLockRef.current = false;
                  setScanned(false);
                }, 1000);
              },
            },
            {
              text: 'Continue Anyway',
              onPress: () => {
                void (async () => {
                  try {
                    await pairServer(payload.url, payload.token);
                    router.replace(ROUTES.TABS);
                  } catch {
                    // Error is stored in auth store - stay on screen
                    setTimeout(() => {
                      scanLockRef.current = false;
                      setScanned(false);
                    }, 3000);
                  }
                })();
              },
            },
          ]
        );
        return;
      }

      await pairServer(payload.url, payload.token);
      router.replace(ROUTES.TABS);
    } catch (err) {
      Alert.alert('Pairing Failed', err instanceof Error ? err.message : 'Invalid QR code');
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
      Alert.alert('Invalid URL', urlValidation.error ?? 'Please enter a valid server URL');
      setIsSubmitting(false);
      return;
    }

    // Validate token
    if (!trimmedToken) {
      Alert.alert('Missing Token', 'Please enter your access token');
      setIsSubmitting(false);
      return;
    }

    // Check for internal/localhost URL and warn
    if (isInternalUrl(trimmedUrl)) {
      Alert.alert(
        'Internal URL Detected',
        'This appears to be a local network address that may not work outside your home network.\n\nSet an External URL in Settings → General on your Tracearr web dashboard to enable remote access.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setIsSubmitting(false),
          },
          {
            text: 'Continue Anyway',
            onPress: () => {
              void (async () => {
                try {
                  await pairServer(trimmedUrl, trimmedToken);
                  router.replace(ROUTES.TABS);
                } catch {
                  // Error stored in auth store - displayed below inputs
                } finally {
                  setIsSubmitting(false);
                }
              })();
            },
          },
        ]
      );
      // Keep isSubmitting true while alert is visible - callbacks will reset it
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
      <SafeAreaView className="bg-background flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
            <View className="items-center px-6 pt-8 pb-6">
              <Text className="text-foreground mb-2 text-center text-2xl font-bold">
                Connect to Server
              </Text>
              <Text className="text-muted-foreground text-center text-base leading-6">
                Enter your Tracearr server URL and mobile access token
              </Text>
            </View>

            <View className="flex-1 gap-4">
              <View className="gap-1">
                <Text className="text-muted-foreground text-sm font-medium">Server URL</Text>
                <TextInput
                  className="bg-card border-border text-foreground rounded-md border p-4 text-base"
                  value={serverUrl}
                  onChangeText={handleServerUrlChange}
                  placeholder="https://tracearr.example.com"
                  placeholderTextColor="#71717a"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!isLoading}
                />
              </View>

              <View className="gap-1">
                <Text className="text-muted-foreground text-sm font-medium">Access Token</Text>
                <TextInput
                  className="bg-card border-border text-foreground rounded-md border p-4 text-base"
                  value={token}
                  onChangeText={handleTokenChange}
                  placeholder="trr_mob_..."
                  placeholderTextColor="#71717a"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              {error && <Text className="text-destructive text-center text-sm">{error}</Text>}

              <Pressable
                className="mt-2 items-center rounded-md px-6 py-4"
                style={{ backgroundColor: accentColor, opacity: isLoading ? 0.6 : 1 }}
                onPress={handleManualPair}
                disabled={isLoading}
              >
                <Text className="text-base font-semibold" style={{ color: '#0d1117' }}>
                  {isLoading ? 'Connecting...' : 'Connect'}
                </Text>
              </Pressable>

              <Pressable
                className="items-center py-4"
                onPress={() => setManualMode(false)}
                disabled={isLoading}
              >
                <Text className="text-base" style={{ color: accentColor }}>
                  Scan QR Code Instead
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="bg-background flex-1" edges={['top', 'bottom']}>
      <View className="items-center px-6 pt-8 pb-6">
        <Text className="text-foreground mb-2 text-center text-2xl font-bold">
          Welcome to Tracearr
        </Text>
        <Text className="text-muted-foreground text-center text-base leading-6">
          Open Settings → Mobile App in your Tracearr dashboard and scan the QR code
        </Text>
      </View>

      <View className="bg-card mx-6 mb-6 flex-1 overflow-hidden rounded-xl">
        {permission?.granted ? (
          <View className="flex-1">
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <View
                className="h-[250] w-[250] rounded-lg border-2"
                style={{ borderColor: accentColor }}
              />
            </View>
          </View>
        ) : (
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-muted-foreground mb-6 text-center text-base">
              Camera permission is required to scan QR codes
            </Text>
            <Pressable
              className="items-center rounded-md px-6 py-4"
              style={{ backgroundColor: accentColor }}
              onPress={requestPermission}
            >
              <Text className="text-base font-semibold" style={{ color: '#0d1117' }}>
                Grant Permission
              </Text>
            </Pressable>
          </View>
        )}
      </View>

      <View className="items-center px-6 pb-6">
        <Pressable className="items-center py-4" onPress={() => setManualMode(true)}>
          <Text className="text-base" style={{ color: accentColor }}>
            Enter URL and Token Manually
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
