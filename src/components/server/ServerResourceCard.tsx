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
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

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
  const labelFontSize = isTablet ? typography.fontSize.sm : typography.fontSize.xs;
  const barLabelFontSize = isTablet ? 11 : 10;

  return (
    <View style={[styles.resourceBar, isTablet && { marginBottom: spacing.md }]}>
      {/* Header row */}
      <View style={[styles.resourceHeader, isTablet && { marginBottom: spacing.sm }]}>
        <Ionicons name={icon} size={iconSize} color={colors.text.secondary.dark} />
        <Text style={[styles.resourceLabel, { fontSize: labelFontSize }]}>{label}</Text>
      </View>

      {/* Process bar (Plex Media Server) */}
      <View style={[styles.barSection, isTablet && { marginBottom: spacing.sm }]}>
        <View style={styles.barLabelRow}>
          <Text style={[styles.barLabelText, { fontSize: barLabelFontSize }]}>Plex Media Server</Text>
          <Text style={[styles.barValueText, { fontSize: barLabelFontSize }]}>{processValue}%</Text>
        </View>
        <View style={[styles.barTrack, { height: barHeight }]}>
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
      <View style={styles.barSection}>
        <View style={styles.barLabelRow}>
          <Text style={[styles.barLabelText, { fontSize: barLabelFontSize }]}>System</Text>
          <Text style={[styles.barValueText, { fontSize: barLabelFontSize }]}>{systemValue}%</Text>
        </View>
        <View style={[styles.barTrack, { height: barHeight }]}>
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
      <View style={[styles.container, { padding: containerPadding }]}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { padding: containerPadding }]}>
        <View style={styles.emptyContainer}>
          <View style={[styles.emptyIconContainer, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
            <Ionicons name="alert-circle-outline" size={24} color="#ef4444" />
          </View>
          <Text style={styles.emptyText}>Failed to load</Text>
          <Text style={styles.emptySubtext}>{error.message}</Text>
        </View>
      </View>
    );
  }

  if (!latest) {
    return (
      <View style={[styles.container, { padding: containerPadding }]}>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="server-outline" size={24} color={colors.text.muted.dark} />
          </View>
          <Text style={styles.emptyText}>No resource data</Text>
          <Text style={styles.emptySubtext}>Waiting for server statistics...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { padding: containerPadding }]}>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    // padding is set dynamically based on isTablet
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
  },
  emptyContainer: {
    paddingVertical: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconContainer: {
    backgroundColor: colors.surface.dark,
    padding: spacing.sm,
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  emptySubtext: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    marginTop: 2,
  },
  resourceBar: {
    marginBottom: spacing.sm,
  },
  resourceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  resourceLabel: {
    marginLeft: spacing.xs,
    fontSize: typography.fontSize.xs,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  barSection: {
    marginBottom: spacing.xs,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  barLabelText: {
    fontSize: 10,
    color: colors.text.muted.dark,
  },
  barValueText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  barTrack: {
    height: 4,
    backgroundColor: colors.surface.dark,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
});
