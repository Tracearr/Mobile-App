/**
 * Offline banner component
 * Shows persistent warning banner when disconnected from server
 * Includes pulsing animation and manual retry button
 */
import React, { useEffect, useRef } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { Text } from '@/components/ui/text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WifiOff } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useAuthStateStore } from '../lib/authStateStore';
import { colors, spacing, withAlpha } from '../lib/theme';

interface OfflineBannerProps {
  onRetry: () => void;
}

export function OfflineBanner({ onRetry }: OfflineBannerProps) {
  const { connectionState, server, tokenStatus } = useAuthStateStore(
    useShallow((s) => ({
      connectionState: s.connectionState,
      server: s.server,
      tokenStatus: s.tokenStatus,
    }))
  );
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
    <View
      className="flex-row items-center justify-between border-b px-4 py-3"
      style={{
        paddingTop: insets.top + spacing.sm,
        backgroundColor: withAlpha(colors.warning, '20'),
        borderBottomColor: withAlpha(colors.warning, '40'),
      }}
    >
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
