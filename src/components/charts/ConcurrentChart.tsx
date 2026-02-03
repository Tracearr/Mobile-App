/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * Stacked area chart showing concurrent streams over time with direct/transcode breakdown
 */
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { CartesianChart, StackedArea, useChartPressState } from 'victory-native';
import { Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { colors } from '../../lib/theme';
import { useChartFont } from './useChartFont';

interface ConcurrentChartProps {
  data: { hour: string; total: number; direct: number; transcode: number }[];
  height?: number;
}

// Colors matching web chart (chart-2 for direct, chart-4 for transcode)
const CHART_COLORS = {
  direct: '#22c55e', // green - direct play
  transcode: '#f97316', // orange - transcode
};

function ToolTip({ x, y }: { x: SharedValue<number>; y: SharedValue<number> }) {
  return <Circle cx={x} cy={y} r={6} color={colors.text.primary.dark} />;
}

/**
 * Parse a timestamp string safely, handling various formats from the backend
 */
function parseTimestamp(timestamp: string): Date | null {
  // Handle PostgreSQL timestamp format: "2024-01-15 13:00:00+00"
  // Convert to ISO 8601 format that JS can parse reliably
  const normalized = timestamp.includes('T') ? timestamp : timestamp.replace(' ', 'T');
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
}

export function ConcurrentChart({ data, height = 200 }: ConcurrentChartProps) {
  const font = useChartFont(10);
  const { state, isActive } = useChartPressState({ x: 0, y: { direct: 0, transcode: 0 } });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    index: number;
    direct: number;
    transcode: number;
  } | null>(null);

  // Transform data for victory-native
  const chartData = data.map((d, index) => ({
    x: index,
    direct: d.direct,
    transcode: d.transcode,
    label: d.hour,
  }));

  // Sync SharedValue changes to React state
  const updateDisplayValue = useCallback((index: number, direct: number, transcode: number) => {
    setDisplayValue({
      index: Math.round(index),
      direct: Math.round(direct),
      transcode: Math.round(transcode),
    });
  }, []);

  const clearDisplayValue = useCallback(() => {
    setDisplayValue(null);
  }, []);

  // Watch for changes in chart press state
  useAnimatedReaction(
    () => ({
      active: isActive,
      x: state.x.value.value,
      direct: state.y.direct.value.value,
      transcode: state.y.transcode.value.value,
    }),
    (current, previous) => {
      if (current.active) {
        runOnJS(updateDisplayValue)(current.x, current.direct, current.transcode);
      } else if (previous?.active && !current.active) {
        runOnJS(clearDisplayValue)();
      }
    },
    [isActive]
  );

  if (chartData.length === 0) {
    return (
      <View className="bg-card items-center justify-center rounded-xl p-2" style={{ height }}>
        <Text className="text-muted-foreground text-sm">No concurrent stream data available</Text>
      </View>
    );
  }

  // Get date/time label from React state
  const currentItem = displayValue ? chartData[displayValue.index] : null;
  const dateLabel = currentItem
    ? (() => {
        const date = parseTimestamp(currentItem.label);
        return date ? date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
      })()
    : '';

  const total = displayValue ? displayValue.direct + displayValue.transcode : 0;

  return (
    <View className="bg-card rounded-xl p-2" style={{ height }}>
      {/* Legend */}
      <View className="mb-1 flex-row justify-end gap-4 px-1">
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.direct }} />
          <Text className="text-muted-foreground text-xs">Direct</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: CHART_COLORS.transcode }}
          />
          <Text className="text-muted-foreground text-xs">Transcode</Text>
        </View>
      </View>

      {/* Active value display */}
      <View className="mb-1 min-h-9 flex-row items-center justify-between px-1">
        {displayValue && currentItem ? (
          <>
            <View className="flex-col">
              <Text className="text-sm font-semibold">
                {total} stream{total !== 1 ? 's' : ''}
              </Text>
              <Text className="text-xs">
                <Text style={{ color: CHART_COLORS.direct }}>{displayValue.direct} direct</Text>
                {' · '}
                <Text style={{ color: CHART_COLORS.transcode }}>
                  {displayValue.transcode} transcode
                </Text>
              </Text>
            </View>
            <Text className="text-muted-foreground text-xs">{dateLabel}</Text>
          </>
        ) : null}
      </View>

      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['direct', 'transcode']}
        domainPadding={{ top: 20, bottom: 10, left: 5, right: 5 }}
        chartPressState={state}
        axisOptions={{
          font,
          tickCount: { x: 5, y: 4 },
          lineColor: colors.border.dark,
          labelColor: colors.text.muted.dark,
          formatXLabel: (value) => {
            const item = chartData[Math.round(value)];
            if (!item) return '';
            const date = parseTimestamp(item.label);
            if (!date) return '';
            return `${date.getMonth() + 1}/${date.getDate()}`;
          },
          formatYLabel: (value) => String(Math.round(value)),
        }}
      >
        {({ points, chartBounds }) => (
          <>
            <StackedArea
              points={[points.direct, points.transcode]}
              y0={chartBounds.bottom}
              animate={{ type: 'timing', duration: 500 }}
              areaOptions={({ rowIndex, lowestY, highestY }) => ({
                children: (
                  <LinearGradient
                    start={vec(0, highestY)}
                    end={vec(0, lowestY)}
                    colors={
                      rowIndex === 0
                        ? [`${CHART_COLORS.direct}DD`, `${CHART_COLORS.direct}66`]
                        : [`${CHART_COLORS.transcode}DD`, `${CHART_COLORS.transcode}66`]
                    }
                  />
                ),
              })}
            />
            {isActive && <ToolTip x={state.x.position} y={state.y.direct.position} />}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
