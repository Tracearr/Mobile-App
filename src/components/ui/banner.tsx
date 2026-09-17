import { useEffect, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LucideIcon } from 'lucide-react-native';
import { colors, spacing, withAlpha } from '@/lib/theme';
import { Text } from './text';

const TONES = {
  warning: { bg: 'bg-warning', text: 'text-background', icon: colors.background.dark },
  destructive: {
    bg: 'bg-destructive',
    text: 'text-destructive-foreground',
    icon: colors.text.primary.dark,
  },
} as const;

export interface BannerProps {
  tone: keyof typeof TONES;
  icon: LucideIcon;
  message: string;
  numberOfLines?: number;
  action: { label: string; onPress: () => void };
}

/** Floats under the status bar, above every screen. Mount it only while it should show. */
export function Banner({ tone, icon: Icon, message, numberOfLines, action }: BannerProps) {
  const insets = useSafeAreaInsets();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const toneStyle = TONES[tone];

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className={toneStyle.bg}
      style={{
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 6,
        zIndex: 1000,
        top: insets.top + spacing.sm,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, flexShrink: 1 }}>
        <Animated.View style={{ opacity: pulseAnim }}>
          <Icon size={16} color={toneStyle.icon} />
        </Animated.View>
        <Text
          className={`${toneStyle.text} text-sm font-medium`}
          style={{ flexShrink: 1 }}
          numberOfLines={numberOfLines}
        >
          {message}
        </Text>
      </View>
      <Pressable
        onPress={action.onPress}
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={{
          backgroundColor: withAlpha(colors.background.dark, '30'),
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 4,
        }}
      >
        <Text className={`${toneStyle.text} text-xs font-semibold`}>{action.label}</Text>
      </Pressable>
    </View>
  );
}
