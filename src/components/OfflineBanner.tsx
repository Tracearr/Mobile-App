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
import { colors, spacing, withAlpha } from '../lib/theme';

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

  // Must keep StyleSheet for dynamic paddingTop and Animated.View opacity
  return (
    <View style={[styles.banner, { paddingTop: insets.top + spacing.sm }]}>
      <View className="flex-row items-center gap-3">
        <Animated.View style={{ opacity: pulseAnim }}>
          <WifiOff size={16} color={colors.warning} />
        </Animated.View>
        <Text className="text-warning text-sm font-medium">Connection lost</Text>
      </View>
      <Pressable onPress={onRetry} className="bg-warning rounded-sm px-3 py-2">
        <Text className="text-background text-xs font-semibold">Retry</Text>
      </Pressable>
    </View>
  );
}

// Keep StyleSheet for styles that require dynamic values or theme colors not in NativeWind
const styles = StyleSheet.create({
  banner: {
    backgroundColor: withAlpha(colors.warning, '20'),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: withAlpha(colors.warning, '40'),
  },
});
