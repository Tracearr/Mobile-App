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
import { CircleAlert, Cpu, Gauge, Server, type LucideIcon } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import type { ServerType } from '@tracearr/shared';
import { Text } from '@/components/ui/text';
import { useResponsive } from '@/hooks/useResponsive';
import { ACCENT_COLOR, colors, spacing } from '@/lib/theme';

// Bar colors matching web app
const BAR_COLORS = {
  process: ACCENT_COLOR, // Plex-style cyan for the media server process
  system: '#cc7b9f', // Pink/purple for "System"
};

const PROCESS_LABELS: Record<ServerType, string> = {
  plex: 'Plex Media Server',
  jellyfin: 'Jellyfin',
  emby: 'Emby',
};

interface ResourceBarProps {
  label: string;
  processLabel: string;
  processValue: number;
  // Null when the source cannot see the host (non-Linux plugin hosts)
  systemValue: number | null;
  icon: LucideIcon;
  isTablet?: boolean;
}

function ResourceBar({
  label,
  processLabel,
  processValue,
  systemValue,
  icon: Icon,
  isTablet,
}: ResourceBarProps) {
  const [processWidth] = useState(() => new Animated.Value(0));
  const [systemWidth] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(processWidth, {
        toValue: processValue,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(systemWidth, {
        toValue: systemValue ?? 0,
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
        <Icon size={iconSize} color={colors.text.primary.dark} />
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

      {/* Process bar */}
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
            {processLabel}
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
      {systemValue !== null && (
        <View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <Text style={{ fontSize: barLabelFontSize, color: colors.text.muted.dark }}>
              System
            </Text>
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
      )}
    </View>
  );
}

interface ServerResourceCardProps {
  serverType: ServerType;
  latest: {
    hostCpu: number | null;
    processCpu: number;
    hostMemory: number | null;
    processMemory: number;
  } | null;
  isLoading?: boolean;
  error?: Error | null;
  // Set in multi-server views, where each card names its server
  serverName?: string;
  serverColor?: string | null;
}

export function ServerResourceCard({
  serverType,
  latest,
  isLoading,
  error,
  serverName,
  serverColor,
}: ServerResourceCardProps) {
  const { isTablet } = useResponsive();
  const containerPadding = isTablet ? spacing.md : spacing.sm;

  const cardStyle = {
    backgroundColor: colors.card.dark,
    borderRadius: 12,
    padding: containerPadding,
  };

  const header = serverName ? (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: isTablet ? 12 : 10,
      }}
    >
      {serverColor && (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: serverColor }} />
      )}
      <Text
        numberOfLines={1}
        style={{
          fontSize: isTablet ? 13 : 12,
          fontWeight: '600',
          color: colors.text.secondary.dark,
          flexShrink: 1,
        }}
      >
        {serverName}
      </Text>
    </View>
  ) : null;

  if (isLoading) {
    return (
      <View style={cardStyle}>
        {header}
        <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 12, color: colors.text.muted.dark }}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={cardStyle}>
        {header}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
          <View
            style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 20,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <CircleAlert size={24} color="#ef4444" />
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
        {header}
        <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 24 }}>
          <View
            style={{
              backgroundColor: colors.surface.dark,
              borderRadius: 20,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <Server size={24} color={colors.icon.default} />
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

  const processLabel = PROCESS_LABELS[serverType];

  return (
    <View style={cardStyle}>
      {header}
      <ResourceBar
        label="CPU"
        icon={Gauge}
        processLabel={processLabel}
        processValue={latest.processCpu}
        systemValue={latest.hostCpu}
        isTablet={isTablet}
      />

      <ResourceBar
        label="RAM"
        icon={Cpu}
        processLabel={processLabel}
        processValue={latest.processMemory}
        systemValue={latest.hostMemory}
        isTablet={isTablet}
      />
    </View>
  );
}
