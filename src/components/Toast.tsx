/**
 * Toast notification component
 * Animated toast for showing brief feedback messages like "Reconnected"
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { colors, spacing, borderRadius, typography } from '../lib/theme';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

export function Toast({ message, visible, onHide, duration = 2000, type = 'success' }: ToastProps) {
  const [fadeAnim] = useState(new Animated.Value(0));

  const hideCallback = useCallback(() => {
    onHide();
  }, [onHide]);

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        hideCallback();
      });
    }
  }, [visible, fadeAnim, duration, hideCallback]);

  if (!visible) return null;

  const backgroundColor =
    type === 'success' ? colors.success : type === 'error' ? colors.error : colors.info;

  const IconComponent = type === 'success' ? Check : type === 'error' ? AlertCircle : Info;

  return (
    <Animated.View style={[styles.container, { backgroundColor, opacity: fadeAnim }]}>
      <IconComponent size={16} color={colors.background.dark} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    zIndex: 1000,
  },
  text: {
    color: colors.background.dark,
    fontSize: typography.fontSize.sm,
    fontWeight: '500',
  },
});
