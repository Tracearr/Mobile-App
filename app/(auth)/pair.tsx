/**
 * Pairing screen - QR code scanner or manual entry
 * Single-server model - one Tracearr server per mobile app
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
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
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

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
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Connect to Server</Text>
              <Text style={styles.subtitle}>
                Enter your Tracearr server URL and mobile access token
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Server URL</Text>
                <TextInput
                  style={styles.input}
                  value={serverUrl}
                  onChangeText={handleServerUrlChange}
                  placeholder="https://tracearr.example.com"
                  placeholderTextColor={colors.text.muted.dark}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Access Token</Text>
                <TextInput
                  style={styles.input}
                  value={token}
                  onChangeText={handleTokenChange}
                  placeholder="trr_mob_..."
                  placeholderTextColor={colors.text.muted.dark}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <Pressable
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleManualPair}
                disabled={isLoading}
              >
                <Text style={styles.buttonText}>{isLoading ? 'Connecting...' : 'Connect'}</Text>
              </Pressable>

              <Pressable
                style={styles.linkButton}
                onPress={() => setManualMode(false)}
                disabled={isLoading}
              >
                <Text style={styles.linkText}>Scan QR Code Instead</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Welcome to Tracearr</Text>
        <Text style={styles.subtitle}>
          Open Settings → Mobile App in your Tracearr dashboard and scan the QR code
        </Text>
      </View>

      <View style={styles.cameraContainer}>
        {permission?.granted ? (
          <View style={styles.camera}>
            <CameraView
              style={StyleSheet.absoluteFill}
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            />
            <View style={styles.overlay}>
              <View style={styles.scanFrame} />
            </View>
          </View>
        ) : (
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              Camera permission is required to scan QR codes
            </Text>
            <Pressable style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>Grant Permission</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Pressable style={styles.linkButton} onPress={() => setManualMode(true)}>
          <Text style={styles.linkText}>Enter URL and Token Manually</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: typography.fontSize['2xl'],
    fontWeight: 'bold',
    color: colors.text.primary.dark,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    lineHeight: 22,
  },
  cameraContainer: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: colors.card.dark,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: colors.cyan.core,
    borderRadius: borderRadius.lg,
    backgroundColor: 'transparent',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  permissionText: {
    fontSize: typography.fontSize.base,
    color: colors.text.secondary.dark,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    alignItems: 'center',
  },
  form: {
    flex: 1,
    gap: spacing.md,
  },
  inputGroup: {
    gap: spacing.xs,
  },
  label: {
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
    color: colors.text.secondary.dark,
  },
  input: {
    backgroundColor: colors.card.dark,
    borderWidth: 1,
    borderColor: colors.border.dark,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.text.primary.dark,
  },
  button: {
    backgroundColor: colors.cyan.core,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: '600',
    color: colors.blue.core,
  },
  linkButton: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  linkText: {
    fontSize: typography.fontSize.base,
    color: colors.cyan.core,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    color: colors.error,
    textAlign: 'center',
  },
});
