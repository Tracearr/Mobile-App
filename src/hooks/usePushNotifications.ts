/**
 * Push notifications hook for violation alerts
 *
 * Handles push notification registration, foreground notifications,
 * background task registration, and payload decryption.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocket } from '../providers/SocketProvider';
import type { ViolationWithDetails, EncryptedPushPayload } from '@tracearr/shared';
import {
  registerBackgroundNotificationTask,
  unregisterBackgroundNotificationTask,
} from '../lib/backgroundTasks';
import { decryptPushPayload, isEncryptionAvailable, getDeviceSecret } from '../lib/crypto';
import { api } from '../lib/api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Check if notification payload is encrypted
function isEncrypted(data: unknown): data is EncryptedPushPayload {
  if (!data || typeof data !== 'object') return false;
  const payload = data as Record<string, unknown>;
  return (
    payload.v === 1 &&
    typeof payload.iv === 'string' &&
    typeof payload.ct === 'string' &&
    typeof payload.tag === 'string'
  );
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);
  const router = useRouter();
  const { socket } = useSocket();

  // Register for push notifications
  const registerForPushNotifications = useCallback(async (): Promise<string | null> => {
    if (!Device.isDevice) {
      console.log('Push notifications require a physical device');
      return null;
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
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      });
      return tokenData.data;
    } catch (error) {
      console.error('Failed to get push token:', error);
      return null;
    }
  }, []);

  // Show local notification for violations
  const showViolationNotification = useCallback(async (violation: ViolationWithDetails) => {
    const ruleTypeLabels: Record<string, string> = {
      impossible_travel: 'Impossible Travel',
      simultaneous_locations: 'Simultaneous Locations',
      device_velocity: 'Device Velocity',
      concurrent_streams: 'Concurrent Streams',
      geo_restriction: 'Geo Restriction',
    };

    const severityLabels: Record<string, string> = {
      low: 'Low',
      warning: 'Warning',
      high: 'High',
      critical: 'Critical',
    };

    const title = `${severityLabels[violation.severity] || 'Warning'} Violation`;
    const ruleType = violation.rule?.type || '';
    const body = `${violation.user?.username || 'Unknown user'}: ${ruleTypeLabels[ruleType] || 'Rule Violation'}`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: {
          type: 'violation',
          violationId: violation.id,
          serverUserId: violation.serverUserId,
        },
        sound: true,
      },
      trigger: null, // Show immediately
    });
  }, []);

  // Process notification data (handle encryption if needed)
  const processNotificationData = useCallback(
    async (data: Record<string, unknown>): Promise<Record<string, unknown>> => {
      if (isEncrypted(data) && isEncryptionAvailable()) {
        try {
          return await decryptPushPayload(data);
        } catch (error) {
          console.error('Failed to decrypt notification:', error);
          return data; // Fall back to encrypted data
        }
      }
      return data;
    },
    []
  );

  // Initialize push notifications
  useEffect(() => {
    const initializePushNotifications = async () => {
      const token = await registerForPushNotifications();
      if (token) {
        setExpoPushToken(token);

        // Register push token with server, including device secret for encryption
        try {
          const deviceSecret = isEncryptionAvailable() ? await getDeviceSecret() : undefined;
          await api.registerPushToken(token, deviceSecret);
          console.log('Push token registered with server');
        } catch (error) {
          console.error('Failed to register push token with server:', error);
        }
      }
    };

    void initializePushNotifications();

    // Register background notification task
    void registerBackgroundNotificationTask();

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      async (receivedNotification) => {
        // Process/decrypt the notification data if needed
        const rawData = receivedNotification.request.content.data;
        if (rawData && typeof rawData === 'object') {
          const processedData = await processNotificationData(
            rawData as Record<string, unknown>
          );
          // Update the notification with processed data
          const processedNotification = {
            ...receivedNotification,
            request: {
              ...receivedNotification.request,
              content: {
                ...receivedNotification.request.content,
                data: processedData,
              },
            },
          };
          setNotification(processedNotification as Notifications.Notification);
        } else {
          setNotification(receivedNotification);
        }
      }
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const rawData = response.notification.request.content.data;
        let data = rawData;

        // Decrypt if needed
        if (rawData && isEncrypted(rawData) && isEncryptionAvailable()) {
          try {
            data = await decryptPushPayload(rawData);
          } catch {
            // Use raw data if decryption fails
          }
        }

        // Navigate based on notification type
        if (data?.type === 'violation_detected') {
          router.push('/(tabs)/alerts');
        } else if (data?.type === 'stream_started' || data?.type === 'stream_stopped') {
          router.push('/(tabs)/activity');
        } else if (data?.type === 'server_down' || data?.type === 'server_up') {
          router.push('/(tabs)');
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
      // Note: We don't unregister background task on unmount
      // as it needs to persist for background notifications
    };
  }, [registerForPushNotifications, router, processNotificationData]);

  // Listen for violation events from socket
  useEffect(() => {
    if (!socket) return;

    const handleViolation = (violation: ViolationWithDetails) => {
      void showViolationNotification(violation);
    };

    socket.on('violation:new', handleViolation);

    return () => {
      socket.off('violation:new', handleViolation);
    };
  }, [socket, showViolationNotification]);

  // Configure Android notification channels for different notification types
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Violations channel - high priority
      void Notifications.setNotificationChannelAsync('violations', {
        name: 'Violation Alerts',
        description: 'Alerts when rule violations are detected',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22D3EE',
        sound: 'default',
      });

      // Sessions channel - default priority
      void Notifications.setNotificationChannelAsync('sessions', {
        name: 'Stream Activity',
        description: 'Notifications for stream start/stop events',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100, 100, 100],
        lightColor: '#10B981',
      });

      // Alerts channel - high priority (server status)
      void Notifications.setNotificationChannelAsync('alerts', {
        name: 'Server Alerts',
        description: 'Server online/offline notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 500],
        lightColor: '#EF4444',
        sound: 'default',
      });
    }
  }, []);

  // Cleanup function for logout
  const cleanup = useCallback(async () => {
    await unregisterBackgroundNotificationTask();
  }, []);

  return {
    expoPushToken,
    notification,
    showViolationNotification,
    cleanup,
    isEncryptionAvailable: isEncryptionAvailable(),
  };
}
