/**
 * Push notifications hook for violation alerts
 *
 * Handles push notification registration, notification taps (including the one
 * that launched the app), background task registration, and payload decryption.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, AppState } from 'react-native';
import axios from 'axios';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from '@tracearr/translations/mobile';
import { useSocket } from '../providers/SocketProvider';
import type { ViolationWithDetails } from '@tracearr/shared';
import { isEncrypted, registerBackgroundNotificationTask } from '../lib/backgroundTasks';
import { decryptPushPayload, isEncryptionAvailable, getDeviceSecret } from '../lib/crypto';
import { api } from '../lib/api';
import { describeApiError } from '../lib/apiError';
import { useAuthStateStore } from '../lib/authStateStore';
import { ROUTES } from '../lib/routes';
import { pushDestination, type PushDestination } from '../lib/pushRoute';

// A remote push is shown while the app is open. The socket-driven local
// notification below only exists for devices with no registered push token, so
// the two never fire for the same violation.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Routing table lives in lib/pushRoute.ts (tested); unknown types land on the dashboard.
function pushHref(dest: PushDestination): Href {
  switch (dest.screen) {
    case 'alerts':
      return ROUTES.ALERTS;
    case 'violation':
      return ROUTES.VIOLATION(dest.id);
    case 'session':
      return ROUTES.SESSION(dest.id);
    case 'activity':
      return ROUTES.ACTIVITY;
    case 'user':
      return ROUTES.USER(dest.id);
    default:
      return ROUTES.DASHBOARD;
  }
}

// Android notification channels - must be created before requesting push token on Android 13+
async function ensureAndroidChannels(): Promise<void> {
  await Promise.all([
    Notifications.setNotificationChannelAsync('violations', {
      name: 'Violation Alerts',
      description: 'Alerts when rule violations are detected',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#22D3EE',
    }),
    Notifications.setNotificationChannelAsync('sessions', {
      name: 'Stream Activity',
      description: 'Notifications for stream start/stop events',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 100, 100, 100],
      lightColor: '#10B981',
    }),
    Notifications.setNotificationChannelAsync('alerts', {
      name: 'Server Alerts',
      description: 'Server online/offline notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 500],
      lightColor: '#EF4444',
    }),
  ]);
}

export function usePushNotifications() {
  const { t } = useTranslation(['mobile', 'common', 'pages']);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  // True once the server holds this device's token, which is when it starts pushing.
  const pushRegistered = useRef(false);
  const handledResponseId = useRef<string | null>(null);
  const router = useRouter();
  const { socket } = useSocket();

  // Auth state - needed to know when we can register tokens
  const server = useAuthStateStore((s) => s.server);
  const isInitializing = useAuthStateStore((s) => s.isInitializing);
  // The root layout only mounts the navigator in this state, so a tap is routed no earlier.
  const canNavigate = useAuthStateStore(
    (s) =>
      !s.isInitializing &&
      s.server !== null &&
      s.tokenStatus !== 'revoked' &&
      s.connectionState !== 'unauthenticated'
  );

  // Track app state for permission re-check
  const appState = useRef(AppState.currentState);

  // Register for push notifications
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
    }

    // Android 13+ requires at least one notification channel to exist before
    // the permission prompt will appear and before a push token can be obtained.
    // Create channels first to ensure the permission flow works correctly.
    if (Platform.OS === 'android') {
      await ensureAndroidChannels();
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== Notifications.PermissionStatus.GRANTED) {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== Notifications.PermissionStatus.GRANTED) {
      console.log('Push notification permission not granted');
      return null;
    }

    // Get Expo push token
    try {
      const projectId =
        (Constants.expoConfig?.extra as { eas?: { projectId?: string } })?.eas?.projectId ??
        Constants.easConfig?.projectId;
      if (!projectId) {
        console.error('No EAS project ID found in app config');
        return null;
      }
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
      return tokenData.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }, []);

  const showViolationNotification = useCallback(
    async (violation: ViolationWithDetails) => {
      // 2.2 rows carry rule.type null; the automation's name is what identifies them.
      const title = t('mobile:push.violationTitle', {
        defaultValue: '{{severity}} Violation',
        severity: t(`common:severity.${violation.severity}`),
      });
      const username = violation.user?.username || t('common:labels.unknown');
      const ruleName = violation.rule?.name || t('pages:userDetail.unknownRule');

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body: `${username}: ${ruleName}`,
          data: {
            type: 'violation_detected',
            violationId: violation.id,
            serverUserId: violation.serverUserId,
          },
          sound: true,
        },
        trigger: Platform.OS === 'android' ? { channelId: 'violations' } : null,
      });
    },
    [t]
  );

  // The mount effect and the token listener both fire at launch, so one request
  // serves both. A 400 means the server will keep refusing this token (an old
  // server drops deviceId from refreshed tokens), so it is reported once.
  const registration = useRef<{ token: string; promise: Promise<void> } | null>(null);
  const rejectedToken = useRef<string | null>(null);

  // Register token with server (reusable for initial registration and re-registration)
  const registerTokenWithServer = useCallback(
    (token: string): Promise<void> => {
      if (!server) {
        console.log('Cannot register push token: not authenticated');
        return Promise.resolve();
      }
      if (rejectedToken.current === token) return Promise.resolve();
      if (registration.current?.token === token) return registration.current.promise;

      const promise = (async () => {
        try {
          const deviceSecret = isEncryptionAvailable() ? await getDeviceSecret() : undefined;
          await api.registerPushToken(token, deviceSecret);
          pushRegistered.current = true;
          console.log('Push token registered with server');
        } catch (error) {
          pushRegistered.current = false;
          if (axios.isAxiosError(error) && error.response?.status === 400) {
            rejectedToken.current = token;
          }
          console.error(describeApiError('Push token registration failed', error));
        } finally {
          registration.current = null;
        }
      })();
      registration.current = { token, promise };
      return promise;
    },
    [server]
  );

  // Initialize push notifications - only when authenticated
  useEffect(() => {
    // Don't run while auth is still loading
    if (isInitializing) {
      console.log('Push notifications: waiting for auth initialization');
      return;
    }

    // Don't run if not authenticated
    if (!server) {
      pushRegistered.current = false;
      rejectedToken.current = null;
      console.log('Push notifications: not authenticated, skipping registration');
      return;
    }

    const initializePushNotifications = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);
        await registerTokenWithServer(token);
      }
    };

    void initializePushNotifications();

    // Not unregistered on cleanup: it has to outlive the component to handle background pushes.
    void registerBackgroundNotificationTask();
  }, [isInitializing, server, registerForPushNotifications, registerTokenWithServer]);

  // Notification taps. The response that cold-started the app arrives before
  // auth has hydrated, so it is read from getLastNotificationResponse once the
  // navigator is mounted; later taps come through the listener. Both paths clear
  // the stored response, and the id guard covers a launch tap delivered to both.
  useEffect(() => {
    if (!canNavigate) {
      // A tap on an unpaired device has nowhere to go and must not replay after pairing.
      if (!isInitializing && !server) Notifications.clearLastNotificationResponse();
      return;
    }

    const handleResponse = (response: Notifications.NotificationResponse) => {
      const responseId = response.notification.request.identifier;
      if (handledResponseId.current === responseId) return;
      handledResponseId.current = responseId;
      Notifications.clearLastNotificationResponse();

      const rawData = response.notification.request.content.data;

      void (async () => {
        let data = rawData;

        if (rawData && isEncrypted(rawData) && isEncryptionAvailable()) {
          try {
            data = await decryptPushPayload(rawData);
          } catch {
            // Use raw data if decryption fails
          }
        }

        // Notification taps never mutate the server selection; detail screens
        // are id-based and don't need it.
        router.push(pushHref(pushDestination(data)));
      })();
    };

    const launchResponse = Notifications.getLastNotificationResponse();
    if (launchResponse) handleResponse(launchResponse);

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [canNavigate, isInitializing, server, router]);

  // Listen for violation events from socket
  useEffect(() => {
    if (!socket) return;

    const handleViolation = (violation: ViolationWithDetails) => {
      if (pushRegistered.current) return;
      void showViolationNotification(violation);
    };

    socket.on('violation:new', handleViolation);

    return () => {
      socket.off('violation:new', handleViolation);
    };
  }, [socket, showViolationNotification]);

  // Ensure Android notification channels exist on mount (idempotent)
  useEffect(() => {
    if (Platform.OS === 'android') {
      void ensureAndroidChannels();
    }
  }, []);

  // Re-check permissions when app returns to foreground
  // User may have enabled notifications in device settings
  useEffect(() => {
    if (!server) return; // Only when authenticated

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      // App coming back to foreground from background/inactive
      if (appState.current?.match(/inactive|background/) && nextAppState === 'active') {
        // Re-check and register if we don't have a token yet
        if (!expoPushToken) {
          void (async () => {
            const token = await registerForPushNotifications();
            if (token) {
              setExpoPushToken(token);
              await registerTokenWithServer(token);
            }
          })();
        }
      }
      appState.current = nextAppState;
    });

    return () => subscription.remove();
  }, [server, expoPushToken, registerForPushNotifications, registerTokenWithServer]);

  // Listen for Expo push token changes (rotation)
  useEffect(() => {
    if (!server) return; // Only when authenticated

    const subscription = Notifications.addPushTokenListener((tokenData) => {
      console.log('Push token changed:', tokenData.data);
      setExpoPushToken(tokenData.data);
      void registerTokenWithServer(tokenData.data);
    });

    return () => subscription.remove();
  }, [server, registerTokenWithServer]);
}
