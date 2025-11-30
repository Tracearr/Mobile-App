/**
 * Bar chart showing plays by platform
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Bar } from 'victory-native';
import { colors, spacing, borderRadius, typography } from '../../lib/theme';

interface PlatformChartProps {
  data: { platform: string; plays: number }[];
  height?: number;
}

// Platform colors
const platformColors: Record<string, string> = {
  'Plex Web': colors.orange.core,
  'Plex for iOS': colors.blue.core,
  'Plex for Android': colors.success,
  'Plex HTPC': colors.purple,
  'Plex for Roku': colors.error,
  'Plex for Apple TV': colors.cyan.core,
  'Plex for Android TV': colors.warning,
  'Plex for Smart TV': colors.info,
  'Jellyfin Web': colors.purple,
  'Jellyfin iOS': colors.cyan.core,
  'Jellyfin Android': colors.success,
  default: colors.text.secondary.dark,
};

export function PlatformChart({ data, height = 200 }: PlatformChartProps) {
  // Sort by plays and take top 5
  const sortedData = [...data]
    .sort((a, b) => b.plays - a.plays)
    .slice(0, 5)
    .map((d, index) => ({
      x: index,
      plays: d.plays,
      platform: d.platform,
      color: platformColors[d.platform] || platformColors.default,
    }));

  if (sortedData.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No platform data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <CartesianChart
        data={sortedData}
        xKey="x"
        yKeys={["plays"]}
        domainPadding={{ left: 30, right: 30, top: 20 }}
        axisOptions={{
          font: null,
          lineColor: colors.border.dark,
          labelColor: colors.text.muted.dark,
          formatXLabel: (value) => {
            const item = sortedData[Math.round(value)];
            if (!item) return '';
            // Shorten platform name
            return item.platform.replace('Plex for ', '').replace('Jellyfin ', '').slice(0, 8);
          },
          formatYLabel: (value) => String(Math.round(value)),
        }}
      >
        {({ points, chartBounds }) => (
          <Bar
            points={points.plays}
            chartBounds={chartBounds}
            color={colors.cyan.core}
            roundedCorners={{ topLeft: 4, topRight: 4 }}
            animate={{ type: "timing", duration: 500 }}
          />
        )}
      </CartesianChart>

      {/* Legend */}
      <View style={styles.legend}>
        {sortedData.slice(0, 3).map((item) => (
          <View key={item.platform} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <Text style={styles.legendText} numberOfLines={1}>
              {item.platform.replace('Plex for ', '').replace('Jellyfin ', '')}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card.dark,
    borderRadius: borderRadius.lg,
    padding: spacing.sm,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.muted.dark,
    fontSize: typography.fontSize.sm,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border.dark,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.muted.dark,
    maxWidth: 80,
  },
});
