/**
 * Offline banner component
 * Shows persistent warning banner when disconnected from server
 * Includes pulsing animation and manual retry button
 */
import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated } from 'react-native';
import { WifiOff } from 'lucide-react-native';
import { useConnectionStore } from '../stores/connectionStore';
import { colors, spacing, borderRadius, typography, withAlpha } from '../lib/theme';

interface OfflineBannerProps {
  onRetry: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const { state } = useConnectionStore();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (state === 'disconnected') {
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
  }, [state, pulseAnim]);

  if (state !== 'disconnected') return null;

  return (
    <View style={styles.banner}>
      <View style={styles.left}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <WifiOff size={16} color={colors.warning} />
        </Animated.View>
        <Text style={styles.text}>Offline - data may be stale</Text>
      </View>
      <Pressable onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonText}>Try Now</Text>
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
