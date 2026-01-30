/**
 * Root layout - handles auth state and navigation
 */
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import '../global.css';
import { useEffect, useState, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { MediaServerProvider } from '@/providers/MediaServerProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { OfflineBanner } from '@/components/OfflineBanner';
import { UnauthenticatedScreen } from '@/components/UnauthenticatedScreen';
import { Toast } from '@/components/Toast';
import { useAuthStateStore } from '@/lib/authStateStore';
import { useConnectionValidator } from '@/hooks/useConnectionValidator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useTheme } from '@/providers/ThemeProvider';

function RootLayoutNav() {
  // Use single-server auth state store
  const server = useAuthStateStore((s) => s.server);
  const isInitializing = useAuthStateStore((s) => s.isInitializing);
  const connectionState = useAuthStateStore((s) => s.connectionState);
  const tokenStatus = useAuthStateStore((s) => s.tokenStatus);
  const { accentColor } = useTheme();

  // Derived auth state
  const isAuthenticated = server !== null && tokenStatus !== 'revoked';

  const { validate } = useConnectionValidator();
  const segments = useSegments();
  const router = useRouter();
  const [showReconnectedToast, setShowReconnectedToast] = useState(false);
  const prevConnectionState = useRef(connectionState);

  usePushNotifications();

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
      <View className="bg-background flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={accentColor} />
      </View>
    );
  }

  // Show unauthenticated screen when token is revoked
  if (connectionState === 'unauthenticated') {
    return (
      <>
        <StatusBar style="auto" translucent={false} />
        <UnauthenticatedScreen />
      </>
    );
  }

  return (
    <>
      <StatusBar style="auto" translucent={false} />
      <OfflineBanner onRetry={validate} />
      <Toast
        message="Reconnected"
        visible={showReconnectedToast}
        onHide={() => setShowReconnectedToast(false)}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
        <Stack.Screen
          name="user"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="session"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="alerts"
          options={{
            headerShown: false,
            presentation: 'card',
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
  return (
    <GestureHandlerRootView className="bg-background flex-1">
      <SafeAreaProvider>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryProvider>
              <SocketProvider>
                <MediaServerProvider>
                  <RootLayoutNav />
                </MediaServerProvider>
              </SocketProvider>
            </QueryProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
