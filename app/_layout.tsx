/**
 * Root layout - handles auth state and navigation
 */
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import '../global.css';
import { useEffect, useState, useRef } from 'react';
import { Stack, ThemeProvider, DarkTheme, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { MediaServerProvider } from '@/providers/MediaServerProvider';
import { ErrorBoundary, ScreenErrorFallback } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ServerHealthBanner } from '@/components/server/ServerHealthBanner';
import { UnauthenticatedScreen } from '@/components/UnauthenticatedScreen';
import { Toast } from '@/components/Toast';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useConnectionValidator } from '@/hooks/useConnectionValidator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNowPlayingWidget } from '@/hooks/useNowPlayingWidget';
import { useServerVersion } from '@/hooks/useServerVersion';
import { colors } from '@/lib/theme';
import { i18nReady } from '@/lib/i18n';
import { useTranslation } from '@tracearr/translations/mobile';
import { Observe, ObserveRoot } from 'expo-observe';
import { PostHogProvider, usePostHog } from 'posthog-react-native';
import * as Updates from 'expo-updates';
import { startReviewTracking } from '@/lib/reviewPrompt';
import * as SplashScreen from 'expo-splash-screen';

// Every build profile bundles with NODE_ENV=production, so the channel is what
// separates internal, beta and production. Route params carry server-side ids
// and the paired server URL.
Observe.configure({
  environment: Updates.channel ?? 'development',
  integrations: { 'expo-router': { filteredParams: ['id', 'prefillUrl'] } },
});
startReviewTracking();

// Held until the first real screen can render; hidden in RootLayoutNav, or by
// the ErrorBoundary fallback if that render throws.
void SplashScreen.preventAutoHideAsync();

// Every route below gets this boundary, so a screen that throws keeps its tab bar and back button.
export const unstable_settings = {
  screenErrorBoundary: ScreenErrorFallback,
};

function RootLayoutNav() {
  const { t } = useTranslation(['mobile']);
  // Use single-server auth state store with shallow compare for performance
  const { server, isInitializing, connectionState, tokenStatus } = useAuthStateStore(
    useShallow((s) => ({
      server: s.server,
      isInitializing: s.isInitializing,
      connectionState: s.connectionState,
      tokenStatus: s.tokenStatus,
    }))
  );

  // Derived auth state
  const isAuthenticated = server !== null && tokenStatus !== 'revoked';

  const { validate } = useConnectionValidator();
  const segments = useSegments();
  const router = useRouter();
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const prevConnectionState = useRef(connectionState);

  usePushNotifications();
  useNowPlayingWidget();

  // Route pattern, not pathname: ids stay out of PostHog as filteredParams keeps them out of Observe.
  const posthog = usePostHog();
  const screen = '/' + segments.filter((s) => !(s.startsWith('(') && s.endsWith(')'))).join('/');
  useEffect(() => {
    if (isInitializing) return;
    void posthog.screen(screen);
  }, [posthog, screen, isInitializing]);

  // Which server release the app is talking to, so an error report can be
  // matched to a server-side change. Listed in the privacy policy.
  const { version: serverVersion } = useServerVersion();
  useEffect(() => {
    if (serverVersion) void posthog.register({ server_version: serverVersion });
    else void posthog.unregister('server_version');
  }, [posthog, serverVersion]);

  // Track connection state changes for reconnection toast
  useEffect(() => {
    if (prevConnectionState.current === 'disconnected' && connectionState === 'connected') {
      setShowReconnectedToast(true);
    }
    prevConnectionState.current = connectionState;
  }, [connectionState]);

  // UnauthenticatedScreen renders outside any route, so the route-scoped marker has no screen.
  useEffect(() => {
    if (connectionState === 'unauthenticated') Observe.markInteractive();
  }, [connectionState]);

  // Handle navigation based on auth state
  // Don't redirect if unauthenticated - we show UnauthenticatedScreen instead
  useEffect(() => {
    if (isInitializing) return;
    if (connectionState === 'unauthenticated') return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/pair');
    }
  }, [isAuthenticated, isInitializing, segments, router, connectionState]);

  useEffect(() => {
    if (!isInitializing) {
      SplashScreen.hide();
    }
  }, [isInitializing]);

  if (isInitializing) {
    return null;
  }

  // Show unauthenticated screen when token is revoked
  if (connectionState === 'unauthenticated') {
    return (
      <>
        <StatusBar style="light" />
        <UnauthenticatedScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <OfflineBanner onRetry={validate} />
      <ServerHealthBanner />
      <Toast
        message={t('mobile:reconnected')}
        visible={showReconnectedToast}
        onHide={() => setShowReconnectedToast(false)}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.dark },
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="alerts"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="server-select"
          options={{
            headerShown: false,
            presentation: 'formSheet',
            sheetAllowedDetents: [0.5, 0.9],
            sheetGrabberVisible: true,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}

function RootLayout() {
  const [i18nLoaded, setI18nLoaded] = useState(false);
  const pairedServerId = useAuthStateStore((s) => s.server?.id ?? null);

  useEffect(() => {
    // i18nReady only rejects when i18next fails to initialise twice. Rendering
    // untranslated beats a splash that never clears.
    void i18nReady
      .catch((error: unknown) => console.error('[i18n] Rendering without translations:', error))
      .then(() => setI18nLoaded(true));
  }, []);

  if (!i18nLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background.dark }}>
          <ErrorBoundary>
            <QueryProvider>
              <SocketProvider>
                {/* Keyed on the pairing: unpair/re-pair remounts the provider so no
                    server selection survives it. */}
                <MediaServerProvider key={pairedServerId ?? 'unpaired'}>
                  {/* Must be expo-router's ThemeProvider: it vendors react-navigation
                      theming, so the @react-navigation/native one sets a context its
                      header code never reads. theme.dark drives the nav bar's
                      userInterfaceStyle; without it, iOS 26 paints one white
                      liquid-glass frame every time a tab refocus re-creates the
                      toolbar buttons (rns#4163). */}
                  <ThemeProvider value={DarkTheme}>
                    <PostHogProvider
                      apiKey={process.env.EXPO_PUBLIC_POSTHOG_KEY}
                      options={{
                        host: 'https://us.i.posthog.com',
                        errorTracking: {
                          autocapture: {
                            uncaughtExceptions: true,
                            unhandledRejections: true,
                            // Render errors stop at ObserveErrorBoundary, which is above
                            // this provider, so they only surface via React's console.
                            console: ['error'],
                          },
                        },
                      }}
                      autocapture={{ captureScreens: false, captureTouches: false }}
                      style={{ flex: 1 }}
                    >
                      <RootLayoutNav />
                    </PostHogProvider>
                  </ThemeProvider>
                </MediaServerProvider>
              </SocketProvider>
            </QueryProvider>
          </ErrorBoundary>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default ObserveRoot.wrap(RootLayout);
