/**
 * Server resource monitoring card (CPU + RAM)
 * Displays real-time server resource utilization with progress bars
 * Note: Section header is rendered by parent - this is just the card content
 *
 * Responsive enhancements for tablets:
 * - Larger progress bars (6px vs 4px)
 * - Increased padding and spacing
 * - Slightly larger text
 */
import { View, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Text } from '@/components/ui/text';
import { useResponsive } from '@/hooks/useResponsive';
import { colors, spacing } from '@/lib/theme';

// Bar colors matching web app
const BAR_COLORS = {
  process: '#00b4e4', // Plex-style cyan for "Plex Media Server"
  system: '#cc7b9f', // Pink/purple for "System"
};

interface ResourceBarProps {
  label: string;
  processValue: number;
  systemValue: number;
  icon: keyof typeof Ionicons.glyphMap;
  isTablet?: boolean;
}

function ResourceBar({ label, processValue, systemValue, icon, isTablet }: ResourceBarProps) {
  const processWidth = useRef(new Animated.Value(0)).current;
  const systemWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(processWidth, {
        toValue: processValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(systemWidth, {
        toValue: systemValue,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  }, [processValue, systemValue, processWidth, systemWidth]);

  // Responsive sizing
  const barHeight = isTablet ? 6 : 4;
  const iconSize = isTablet ? 16 : 14;
  const labelFontSize = isTablet ? 13 : 11;
  const barLabelFontSize = isTablet ? 11 : 10;

  return (
    <View className={isTablet ? 'mb-4' : 'mb-2'}>
      {/* Header row */}
      <View className={`flex-row items-center ${isTablet ? 'mb-2' : 'mb-1'}`}>
        <Ionicons name={icon} size={iconSize} color={colors.text.secondary.dark} />
        <Text className="ml-1 font-semibold" style={{ fontSize: labelFontSize }}>
          {label}
        </Text>
      </View>

      {/* Process bar (Plex Media Server) */}
      <View className={isTablet ? 'mb-2' : 'mb-1'}>
        <View className="mb-0.5 flex-row items-center justify-between">
          <Text className="text-muted-foreground" style={{ fontSize: barLabelFontSize }}>
            Plex Media Server
          </Text>
          <Text className="font-semibold" style={{ fontSize: barLabelFontSize }}>
            {processValue}%
          </Text>
        </View>
        <View className="bg-card overflow-hidden rounded-sm" style={{ height: barHeight }}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: BAR_COLORS.process,
                width: processWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* System bar */}
      <View>
        <View className="mb-0.5 flex-row items-center justify-between">
          <Text className="text-muted-foreground" style={{ fontSize: barLabelFontSize }}>
            System
          </Text>
          <Text className="font-semibold" style={{ fontSize: barLabelFontSize }}>
            {systemValue}%
          </Text>
        </View>
        <View className="bg-card overflow-hidden rounded-sm" style={{ height: barHeight }}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: BAR_COLORS.system,
                width: systemWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}

interface ServerResourceCardProps {
  latest: {
    hostCpu: number;
    processCpu: number;
    hostMemory: number;
    processMemory: number;
  } | null;
  isLoading?: boolean;
  error?: Error | null;
}

export function ServerResourceCard({ latest, isLoading, error }: ServerResourceCardProps) {
  const { isTablet } = useResponsive();
  const containerPadding = isTablet ? spacing.md : spacing.sm;

  if (isLoading) {
    return (
      <View className="bg-card rounded-xl" style={{ padding: containerPadding }}>
        <View className="h-20 items-center justify-center">
          <Text className="text-muted-foreground text-xs">Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View className="bg-card rounded-xl" style={{ padding: containerPadding }}>
        <View className="items-center justify-center py-6">
          <View className="bg-destructive/10 mb-2 rounded-full p-2">
            <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
          </View>
          <Text className="text-sm font-semibold">Failed to load</Text>
          <Text className="text-muted-foreground mt-0.5 text-xs">{error.message}</Text>
        </View>
      </View>
    );
  }

  if (!latest) {
    return (
      <View className="bg-card rounded-xl" style={{ padding: containerPadding }}>
        <View className="items-center justify-center py-6">
          <View className="bg-card mb-2 rounded-full p-2">
            <Ionicons name="server-outline" size={24} className="text-muted-foreground" />
          </View>
          <Text className="text-sm font-semibold">No resource data</Text>
          <Text className="text-muted-foreground mt-0.5 text-xs">
            Waiting for server statistics...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-card rounded-xl" style={{ padding: containerPadding }}>
      <ResourceBar
        label="CPU"
        icon="speedometer-outline"
        processValue={latest.processCpu}
        systemValue={latest.hostCpu}
        isTablet={isTablet}
      />

      <ResourceBar
        label="RAM"
        icon="hardware-chip-outline"
        processValue={latest.processMemory}
        systemValue={latest.hostMemory}
        isTablet={isTablet}
      />
    </View>
  );
}

// Keep StyleSheet for animated styles
const styles = StyleSheet.create({
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
