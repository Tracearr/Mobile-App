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
import { View, Animated } from 'react-native';
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
  const barHeight = isTablet ? 8 : 6;
  const iconSize = isTablet ? 18 : 16;
  const labelFontSize = isTablet ? 14 : 13;
  const barLabelFontSize = isTablet ? 12 : 11;

  return (
    <View style={{ marginBottom: isTablet ? 16 : 12 }}>
      {/* Header row */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginBottom: isTablet ? 8 : 6,
        }}
      >
        <Ionicons name={icon} size={iconSize} color={colors.text.primary.dark} />
        <Text
          style={{
            marginLeft: 6,
            fontSize: labelFontSize,
            fontWeight: '600',
            color: colors.text.primary.dark,
          }}
        >
          {label}
        </Text>
      </View>

      {/* Process bar (Plex Media Server) */}
      <View style={{ marginBottom: isTablet ? 8 : 6 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: barLabelFontSize, color: colors.text.muted.dark }}>
            Plex Media Server
          </Text>
          <Text
            style={{
              fontSize: barLabelFontSize,
              fontWeight: '600',
              color: colors.text.primary.dark,
            }}
          >
            {processValue}%
          </Text>
        </View>
        <View
          style={{
            height: barHeight,
            backgroundColor: colors.surface.dark,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 4,
              backgroundColor: BAR_COLORS.process,
              width: processWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}
          />
        </View>
      </View>

      {/* System bar */}
      <View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4,
          }}
        >
          <Text style={{ fontSize: barLabelFontSize, color: colors.text.muted.dark }}>System</Text>
          <Text
            style={{
              fontSize: barLabelFontSize,
              fontWeight: '600',
              color: colors.text.primary.dark,
            }}
          >
            {systemValue}%
          </Text>
        </View>
        <View
          style={{
            height: barHeight,
            backgroundColor: colors.surface.dark,
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <Animated.View
            style={{
              height: '100%',
              borderRadius: 4,
              backgroundColor: BAR_COLORS.system,
              width: systemWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            }}
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

  const cardStyle = {
    backgroundColor: colors.card.dark,
    borderRadius: 12,
    padding: containerPadding,
  };

  if (isLoading) {
    return (
      <View style={cardStyle}>
        <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.text.muted.dark }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={cardStyle}>
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 20,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary.dark }}>
            Failed to load
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.muted.dark, marginTop: 2 }}>
            {error.message}
          </Text>
        </View>
      </View>
    );
  }

  if (!latest) {
    return (
      <View style={cardStyle}>
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
          <View
            style={{
              backgroundColor: colors.surface.dark,
              borderRadius: 20,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <Ionicons name="server-outline" size={24} color={colors.icon.default} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary.dark }}>
            No resource data
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.muted.dark, marginTop: 2 }}>
            Waiting for server statistics...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={cardStyle}>
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
