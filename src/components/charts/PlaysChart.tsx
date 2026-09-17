/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * Area chart showing plays over time with touch-to-reveal tooltip
 */
import React, { useState, useCallback } from 'react';
import { useTranslation } from '@tracearr/translations/mobile';
import { CartesianChart, Area, useChartPressState } from 'victory-native';
import { Circle } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { colors, ACCENT_COLOR } from '../../lib/theme';
import { useChartFont } from './useChartFont';
import { ChartCard, PlaysReadout } from './ChartCard';
import { COUNT_TICKS, countDomain, hasCounts } from './countAxis';

interface PlaysChartProps {
  data: { date: string; count: number }[];
  height?: number;
  isLoading?: boolean;
}

function ToolTip({
  x,
  y,
  color,
}: {
  x: SharedValue<number>;
  y: SharedValue<number>;
  color: string;
}) {
  return <Circle cx={x} cy={y} r={6} color={color} />;
}

export function PlaysChart({ data, height = 200, isLoading }: PlaysChartProps) {
  const { i18n } = useTranslation(['common']);
  const font = useChartFont(10);
  const { state, isActive } = useChartPressState({ x: 0, y: { count: 0 } });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    index: number;
    count: number;
  } | null>(null);

  // Transform data for victory-native
  const chartData = data.map((d, index) => ({
    x: index,
    count: d.count,
    label: d.date,
  }));
  const counts = chartData.map((d) => d.count);

  // Sync SharedValue changes to React state
  const updateDisplayValue = useCallback((index: number, count: number) => {
    setDisplayValue({ index: Math.round(index), count: Math.round(count) });
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

  const activeItem = displayValue ? chartData[displayValue.index] : undefined;

  return (
    <ChartCard height={height} isLoading={isLoading} isEmpty={!hasCounts(counts)}>
      <PlaysReadout
        color={ACCENT_COLOR}
        active={
          displayValue && activeItem
            ? {
                count: displayValue.count,
                label: new Date(activeItem.label).toLocaleDateString(i18n.language, {
                  month: 'short',
                  day: 'numeric',
                }),
              }
            : null
        }
      />

      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['count']}
        domain={{ y: countDomain(counts) }}
        domainPadding={{ top: 20, bottom: 10, left: 5, right: 5 }}
        chartPressState={state}
        axisOptions={{
          font,
          tickCount: { x: 5, y: COUNT_TICKS },
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
          <>
            <Area
              points={points.count}
              y0={chartBounds.bottom}
              color={ACCENT_COLOR}
              opacity={0.85}
              animate={{ type: 'timing', duration: 500 }}
            />
            {isActive && (
              <ToolTip x={state.x.position} y={state.y.count.position} color={ACCENT_COLOR} />
            )}
          </>
        )}
      </CartesianChart>
    </ChartCard>
  );
}
