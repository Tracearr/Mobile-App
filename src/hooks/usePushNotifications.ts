/**
 * Push notifications hook for violation alerts
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSocket } from '../providers/SocketProvider';
import type { ViolationWithDetails } from '@tracearr/shared';

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

    const severityEmoji: Record<string, string> = {
      low: 'ℹ️',
      warning: '⚠️',
      high: '🚨',
      critical: '🔴',
    };

    const title = `${severityEmoji[violation.severity] || '⚠️'} ${ruleTypeLabels[violation.rule?.type || ''] || 'Alert'}`;
    const body = `${violation.user?.username || 'Unknown user'} triggered a rule violation`;

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

  // Initialize push notifications
  useEffect(() => {
    void registerForPushNotifications().then(setExpoPushToken);

    // Listen for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(
      (receivedNotification) => {
        setNotification(receivedNotification);
      }
    );

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.type === 'violation') {
          // Navigate to alerts tab
          router.push('/(tabs)/alerts');
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
    };
  }, [registerForPushNotifications, router]);

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

  // Configure Android notification channel
  useEffect(() => {
    if (Platform.OS === 'android') {
      void Notifications.setNotificationChannelAsync('violations', {
        name: 'Violation Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22D3EE',
        sound: 'default',
      });
    }
  }, []);

  return {
    expoPushToken,
    notification,
    showViolationNotification,
  };
}
