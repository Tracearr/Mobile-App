/**
 * Toast notification component
 * Animated toast for showing brief feedback messages like "Reconnected"
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, AlertCircle, Info } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { colors, spacing } from '../lib/theme';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
  duration?: number;
  type?: 'success' | 'error' | 'info';
}

export function Toast({ message, visible, onHide, duration = 2000, type = 'success' }: ToastProps) {
  const insets = useSafeAreaInsets();
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
    <Animated.View
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        zIndex: 1000,
        backgroundColor,
        opacity: fadeAnim,
        top: insets.top + spacing.sm,
      }}
    >
      <IconComponent size={16} color={colors.background.dark} />
      <Text className="text-background text-sm font-medium">{message}</Text>
    </Animated.View>
  );
}
