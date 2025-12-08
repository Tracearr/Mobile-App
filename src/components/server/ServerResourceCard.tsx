/**
 * Server resource monitoring card (CPU + RAM)
 * Displays real-time server resource utilization with progress bars
 * Note: Section header is rendered by parent - this is just the card content
 */
import { View, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';
import { Text } from '@/components/ui/text';
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
}

function ResourceBar({ label, processValue, systemValue, icon }: ResourceBarProps) {
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

  return (
    <View style={styles.resourceBar}>
      {/* Header row */}
      <View style={styles.resourceHeader}>
        <Ionicons name={icon} size={14} color={colors.text.secondary.dark} />
        <Text style={styles.resourceLabel}>{label}</Text>
      </View>

      {/* Process bar (Plex Media Server) */}
      <View style={styles.barSection}>
        <View style={styles.barLabelRow}>
          <Text style={styles.barLabelText}>Plex Media Server</Text>
          <Text style={styles.barValueText}>{processValue}%</Text>
        </View>
        <View style={styles.barTrack}>
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
          <Text style={styles.barLabelText}>System</Text>
          <Text style={styles.barValueText}>{systemValue}%</Text>
        </View>
        <View style={styles.barTrack}>
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
  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
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
      <View style={styles.container}>
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
    <View style={styles.container}>
      <ResourceBar
        label="CPU"
        icon="speedometer-outline"
        processValue={latest.processCpu}
        systemValue={latest.hostCpu}
      />

      <ResourceBar
        label="RAM"
        icon="hardware-chip-outline"
        processValue={latest.processMemory}
        systemValue={latest.hostMemory}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
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
