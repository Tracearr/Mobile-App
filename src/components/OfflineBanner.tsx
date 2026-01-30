/**
 * Offline banner component
 * Shows persistent warning banner when disconnected from server
 * Includes pulsing animation and manual retry button
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useAuthStateStore } from '../lib/authStateStore';
import { colors, spacing, borderRadius, typography, withAlpha } from '../lib/theme';

interface OfflineBannerProps {
  onRetry: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const connectionState = useAuthStateStore((s) => s.connectionState);
  const server = useAuthStateStore((s) => s.server);
  const tokenStatus = useAuthStateStore((s) => s.tokenStatus);
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Only show offline banner if user is authenticated (has paired server)
  // and connection is lost. Don't show on fresh install or during pairing.
  const isAuthenticated = server !== null && tokenStatus !== 'revoked';

  useEffect(() => {
    if (connectionState === 'disconnected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [connectionState, pulseAnim]);

  if (connectionState !== 'disconnected' || !isAuthenticated) return null;

  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.left}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <WifiOff size={16} color={colors.warning} />
        </Animated.View>
        <Text style={styles.text}>Connection lost</Text>
      </View>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: withAlpha(colors.warning, '20'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.warning, '40'),
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    color: colors.warning,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
  button: {
    backgroundColor: colors.warning,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
  },
  buttonText: {
    color: colors.background.dark,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
  },
});
