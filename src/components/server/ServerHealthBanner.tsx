/**
 * Media server health banner
 * Names the media servers Tracearr cannot reach. Sibling of OfflineBanner:
 * same slot, size and pulse, in the destructive color web's banner uses.
 */
import React, { useEffect, useState } from 'react';
import { View, Pressable, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TriangleAlert } from 'lucide-react-native';
import { useShallow } from 'zustand/react/shallow';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { useServerHealth } from '@/hooks/useServerHealth';
import { useAuthStateStore } from '@/lib/authStateStore';
import { colors, spacing, withAlpha } from '@/lib/theme';

export function ServerHealthBanner() {
  const { t } = useTranslation(['settings', 'common']);
  const { connectionState, server, tokenStatus } = useAuthStateStore(
    useShallow((s) => ({
      connectionState: s.connectionState,
      server: s.server,
      tokenStatus: s.tokenStatus,
    }))
  );
  const { unhealthyServers } = useServerHealth();
  const insets = useSafeAreaInsets();
  const [pulseAnim] = useState(() => new Animated.Value(1));
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  // A server that recovers leaves the dismissed list, so its next outage shows again.
  const stillDown = dismissedIds.filter((id) => unhealthyServers.some((s) => s.serverId === id));
  if (stillDown.length !== dismissedIds.length) setDismissedIds(stillDown);

  // The banner shares OfflineBanner's slot, and health is stale while Tracearr is unreachable.
  const visible =
    server !== null &&
    tokenStatus !== 'revoked' &&
    connectionState === 'connected' &&
    unhealthyServers.some((s) => !dismissedIds.includes(s.serverId));

  useEffect(() => {
    if (!visible) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.5, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, pulseAnim]);

  if (!visible) return null;

  const serverNames = unhealthyServers.map((s) => s.serverName).join(', ');
  const message =
    unhealthyServers.length === 1
      ? t('settings:serverHealth.unreachable', { serverName: serverNames })
      : t('settings:serverHealth.multipleUnreachable', {
          count: unhealthyServers.length,
          serverNames,
        });

  return (
    <View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      className="bg-destructive"
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
          <TriangleAlert size={16} color={colors.text.primary.dark} />
        </Animated.View>
        <Text
          className="text-destructive-foreground text-sm font-medium"
          style={{ flexShrink: 1 }}
          numberOfLines={1}
        >
          {message}
        </Text>
      </View>
      <Pressable
        onPress={() => setDismissedIds(unhealthyServers.map((s) => s.serverId))}
        accessibilityRole="button"
        hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        style={{
          backgroundColor: withAlpha(colors.background.dark, '30'),
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 4,
        }}
      >
        <Text className="text-destructive-foreground text-xs font-semibold">
          {t('common:actions.dismiss')}
        </Text>
      </Pressable>
    </View>
  );
}
