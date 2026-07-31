/**
 * Root layout - handles auth state and navigation
 */
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import '../global.css';
import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { MediaServerProvider } from '@/providers/MediaServerProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { UnauthenticatedScreen } from '@/components/UnauthenticatedScreen';
import { Toast } from '@/components/Toast';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { useConnectionValidator } from '@/hooks/useConnectionValidator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { i18nReady } from '@/lib/i18n';
import { useTranslation } from '@tracearr/translations/mobile';

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

  // Multi-server selection is a Dashboard-only feature; collapse to one
  // server when leaving it, and say so instead of doing it silently.
  const pathname = usePathname();
  const { selectedServerIds, selectedServers, selectServer } = useMediaServer();
  const [scopeToast, setScopeToast] = useState<string | null>(null);
  const prevIsDashboard = useRef(pathname === '/');
  useEffect(() => {
    const isDashboard = pathname === '/';
    const wasDashboard = prevIsDashboard.current;
    prevIsDashboard.current = isDashboard;

    if (wasDashboard && !isDashboard && selectedServerIds.length > 1) {
      const keep = selectedServers[0];
      selectServer(selectedServerIds[0] ?? null);
      if (keep) {
        setScopeToast(t('mobile:serverScope.single', { name: keep.name }));
      }
    }
  }, [pathname, selectedServerIds, selectedServers, selectServer, t]);

  // Track connection state changes for reconnection toast
  useEffect(() => {
    if (prevConnectionState.current === 'disconnected' && connectionState === 'connected') {
      setShowReconnectedToast(true);
    }
    prevConnectionState.current = connectionState;
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

  if (isInitializing) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.dark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </View>
    );
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
      <Toast
        message={t('mobile:reconnected')}
        visible={showReconnectedToast}
        onHide={() => setShowReconnectedToast(false)}
      />
      <Toast
        message={scopeToast ?? ''}
        visible={scopeToast !== null}
        onHide={() => setScopeToast(null)}
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

export default function RootLayout() {
  const [i18nLoaded, setI18nLoaded] = useState(false);

  useEffect(() => {
    void i18nReady.then(() => setI18nLoaded(true));
  }, []);

  if (!i18nLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background.dark,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <ActivityIndicator size="large" color={ACCENT_COLOR} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.background.dark }}>
          <ErrorBoundary>
            <QueryProvider>
              <SocketProvider>
                <MediaServerProvider>
                  <RootLayoutNav />
                </MediaServerProvider>
              </SocketProvider>
            </QueryProvider>
          </ErrorBoundary>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
