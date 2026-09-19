/**
 * Bar chart showing plays by day of week with touch interaction
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from '@tracearr/translations/mobile';
import { CartesianChart, Bar, useChartPressState } from 'victory-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ACCENT_COLOR } from '../../lib/theme';
import { useChartFont } from './useChartFont';
import { ChartCard, PlaysReadout } from './ChartCard';
import { ChartCursor } from './ChartCursor';
import { AXIS_COLORS } from './chartColors';
import { COUNT_TICKS, countDomain, hasCounts } from './countAxis';

interface DayOfWeekChartProps {
  data: { day: number; name: string; count: number }[];
  height?: number;
  isLoading?: boolean;
}

// 2023-01-01 is a Sunday, matching the API's day 0.
function dayName(day: number, locale: string, weekday: 'short' | 'long'): string {
  return new Date(2023, 0, 1 + day).toLocaleDateString(locale, { weekday });
}

export function DayOfWeekChart({ data, height = 180, isLoading }: DayOfWeekChartProps) {
  const { i18n } = useTranslation(['common']);
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
      active: state.isActive.value,
      x: state.x.value.value,
      y: state.y.count.value.value,
    }),
    (current, previous) => {
      if (current.active) {
        scheduleOnRN(updateDisplayValue, current.x, current.y);
      } else if (previous?.active && !current.active) {
        scheduleOnRN(clearDisplayValue);
      }
    }
  );

  // CartesianChart cancels an active press whenever `data` changes identity.
  const chartData = useMemo(() => data.map((d) => ({ x: d.day, count: d.count })), [data]);
  const counts = chartData.map((d) => d.count);

  return (
    <ChartCard height={height} isLoading={isLoading} isEmpty={!hasCounts(counts)}>
      <PlaysReadout
        color={ACCENT_COLOR}
        active={
          displayValue && {
            count: displayValue.count,
            label: dayName(displayValue.day, i18n.language, 'long'),
          }
        }
      />

      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['count']}
        domain={{ y: countDomain(counts) }}
        domainPadding={{ left: 25, right: 25, top: 20 }}
        chartPressState={state}
        xAxis={{
          ...AXIS_COLORS,
          font,
          tickCount: 7,
          formatXLabel: (value) => dayName(Math.round(value), i18n.language, 'short'),
        }}
        yAxis={[
          {
            ...AXIS_COLORS,
            font,
            tickCount: COUNT_TICKS,
            formatYLabel: (value) => String(Math.round(value)),
          },
        ]}
        frame={{ lineColor: AXIS_COLORS.lineColor }}
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
              <ChartCursor
                x={state.x.position}
                y={state.y.count.position}
                index={state.matchedIndex}
                chartBounds={chartBounds}
                color={ACCENT_COLOR}
                radius={5}
              />
            )}
          </>
        )}
      </CartesianChart>
    </ChartCard>
  );
}
