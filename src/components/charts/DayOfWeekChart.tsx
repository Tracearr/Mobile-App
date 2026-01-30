/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * Bar chart showing plays by day of week with touch interaction
 */
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { CartesianChart, Bar, useChartPressState } from 'victory-native';
import { Circle } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { colors, ACCENT_COLOR } from '../../lib/theme';
import { useChartFont } from './useChartFont';

interface DayOfWeekChartProps {
  data: { day: number; name: string; count: number }[];
  height?: number;
}

const DAY_ABBREV = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function ToolTip({
  x,
  y,
  color,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  color: string;
}) {
  return <Circle cx={x} cy={y} r={5} color={color} />;
}

export function DayOfWeekChart({ data, height = 180 }: DayOfWeekChartProps) {
  const font = useChartFont(10);
  const { state, isActive } = useChartPressState({ x: 0, y: { count: 0 } });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    day: number;
    count: number;
  } | null>(null);

  // Sync SharedValue changes to React state
  const updateDisplayValue = useCallback((day: number, count: number) => {
    setDisplayValue({ day: Math.round(day), count: Math.round(count) });
  }, []);

  const clearDisplayValue = useCallback(() => {
    setDisplayValue(null);
  }, []);

  // Watch for changes in chart press state
  useAnimatedReaction(
    () => ({
      active: isActive,
      x: state.x.value.value,
      y: state.y.count.value.value,
    }),
    (current, previous) => {
      if (current.active) {
        runOnJS(updateDisplayValue)(current.x, current.y);
      } else if (previous?.active && !current.active) {
        runOnJS(clearDisplayValue)();
      }
    },
    [isActive]
  );

  // Transform data for victory-native
  const chartData = data.map((d) => ({
    x: d.day,
    count: d.count,
    name: d.name,
  }));

  if (chartData.length === 0) {
    return (
      <View className="bg-card items-center justify-center rounded-xl p-2" style={{ height }}>
        <Text className="text-muted-foreground text-sm">No data available</Text>
      </View>
    );
  }

  // Find the selected day name from React state
  const selectedDay = displayValue ? chartData.find((d) => d.x === displayValue.day) : null;

  return (
    <View className="bg-card rounded-xl p-2" style={{ height }}>
      {/* Active value display */}
      <View className="mb-1 min-h-[18px] flex-row items-center justify-between px-1">
        {displayValue && selectedDay ? (
          <>
            <Text className="text-sm font-semibold" style={{ color: ACCENT_COLOR }}>
              {displayValue.count} plays
            </Text>
            <Text className="text-muted-foreground text-xs">{selectedDay.name}</Text>
          </>
        ) : null}
      </View>

      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['count']}
        domainPadding={{ left: 25, right: 25, top: 20 }}
        chartPressState={state}
        axisOptions={{
          font,
          tickCount: { x: 7, y: 4 },
          lineColor: colors.border.dark,
          labelColor: colors.text.muted.dark,
          formatXLabel: (value) => DAY_ABBREV[Math.round(value)] || '',
          formatYLabel: (value) => String(Math.round(value)),
        }}
      >
        {({ points, chartBounds }) => (
          <>
            <Bar
              points={points.count}
              chartBounds={chartBounds}
              color={ACCENT_COLOR}
              roundedCorners={{ topLeft: 4, topRight: 4 }}
              animate={{ type: 'timing', duration: 500 }}
            />
            {isActive && (
              <ToolTip x={state.x.position} y={state.y.count.position} color={ACCENT_COLOR} />
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}
