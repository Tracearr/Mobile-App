/**
 * Area chart showing plays over time
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CartesianChart, Area } from 'victory-native';
import { colors, spacing, borderRadius, typography } from '../../lib/theme';

interface PlaysChartProps {
  data: { date: string; plays: number }[];
  height?: number;
}

export function PlaysChart({ data, height = 200 }: PlaysChartProps) {
  // Transform data for victory-native
  const chartData = data.map((d, index) => ({
    x: index,
    plays: d.plays,
    label: d.date,
  }));

  if (chartData.length === 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No play data available</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={["plays"]}
        domainPadding={{ top: 20, bottom: 10 }}
        axisOptions={{
          font: null,
          lineColor: colors.border.dark,
          labelColor: colors.text.muted.dark,
          formatXLabel: (value) => {
            const item = chartData[Math.round(value)];
            if (!item) return '';
            const date = new Date(item.label);
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
          formatYLabel: (value) => String(Math.round(value)),
        }}
      >
        {({ points, chartBounds }) => (
          <Area
            points={points.plays}
            y0={chartBounds.bottom}
            color={colors.cyan.core}
            opacity={0.3}
            animate={{ type: "timing", duration: 500 }}
          />
        )}
      </CartesianChart>
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
});
