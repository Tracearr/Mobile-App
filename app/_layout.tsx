/**
 * Root layout - handles auth state and navigation
 */
import { Buffer } from 'buffer';
global.Buffer = Buffer;

import '../global.css';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet, Text, Pressable } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryProvider } from '@/providers/QueryProvider';
import { SocketProvider } from '@/providers/SocketProvider';
import { MediaServerProvider } from '@/providers/MediaServerProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/lib/authStore';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { colors } from '@/lib/theme';

function RootLayoutNav() {
  const {
    isAuthenticated,
    isLoading,
    initialize,
    storageAvailable,
    retryStorageAccess,
    resetStorageState,
  } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();
  const [hasInitialized, setHasInitialized] = useState(false);

  usePushNotifications();

  useEffect(() => {
    void initialize().finally(() => setHasInitialized(true));
  }, [initialize]);

  // Handle navigation based on auth state
  useEffect(() => {
    if (isLoading || !hasInitialized || !storageAvailable) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/pair');
    }
  }, [isAuthenticated, isLoading, hasInitialized, storageAvailable, segments, router]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.cyan.core} />
      </View>
    );
  }

  if (!storageAvailable) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Storage Unavailable</Text>
        <Text style={styles.statusSubtext}>
          Secure storage isn't responding. Try disabling battery saver or restarting the app.
        </Text>
        <Pressable
          style={styles.retryButton}
          onPress={() => {
            resetStorageState();
            void retryStorageAccess();
          }}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" backgroundColor={colors.background.dark} translucent={false} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background.dark },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryProvider>
            <SocketProvider>
              <MediaServerProvider>
                <RootLayoutNav />
              </MediaServerProvider>
            </SocketProvider>
          </QueryProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.dark,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.dark,
    paddingHorizontal: 32,
  },
  statusSubtext: {
    color: colors.text.secondary.dark,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  errorText: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  retryButton: {
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.cyan.core,
    borderRadius: 8,
  },
  retryButtonText: {
    color: colors.background.dark,
    fontSize: 16,
    fontWeight: '600',
  },
});
