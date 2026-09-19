/**
 * Bar chart showing plays by hour of day with touch interaction
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from '@tracearr/translations/mobile';
import { CartesianChart, Bar, useChartPressState } from 'victory-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors } from '../../lib/theme';
import { useChartFont } from './useChartFont';
import { ChartCard, PlaysReadout } from './ChartCard';
import { ChartCursor } from './ChartCursor';
import { AXIS_COLORS } from './chartColors';
import { COUNT_TICKS, countDomain, hasCounts } from './countAxis';

interface HourOfDayChartProps {
  data: { hour: number; count: number }[];
  height?: number;
  isLoading?: boolean;
}

const BAR_COLOR = colors.chart[1];

function formatHour(hour: number, locale: string): string {
  return new Date(2023, 0, 1, hour).toLocaleTimeString(locale, { hour: 'numeric' });
}

export function HourOfDayChart({ data, height = 180, isLoading }: HourOfDayChartProps) {
  const { i18n } = useTranslation(['common']);
  const font = useChartFont(9);
  const { state, isActive } = useChartPressState({ x: 0, y: { count: 0 } });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    hour: number;
    count: number;
  } | null>(null);

  // Sync SharedValue changes to React state
  const updateDisplayValue = useCallback((hour: number, count: number) => {
    setDisplayValue({ hour: Math.round(hour), count: Math.round(count) });
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
  const chartData = useMemo(() => data.map((d) => ({ x: d.hour, count: d.count })), [data]);
  const counts = chartData.map((d) => d.count);

  return (
    <ChartCard height={height} isLoading={isLoading} isEmpty={!hasCounts(counts)}>
      <PlaysReadout
        color={BAR_COLOR}
        active={
          displayValue && {
            count: displayValue.count,
            label: formatHour(displayValue.hour, i18n.language),
          }
        }
      />

      <CartesianChart
        data={chartData}
        xKey="x"
        yKeys={['count']}
        domain={{ y: countDomain(counts) }}
        domainPadding={{ left: 10, right: 10, top: 20 }}
        chartPressState={state}
        xAxis={{
          ...AXIS_COLORS,
          font,
          // 12 makes d3 step by 2 hours. At 6 it steps by 5, which only ever hits hour 0.
          tickCount: 12,
          formatXLabel: (value) => {
            const hour = Math.round(value);
            return hour % 6 === 0 && hour < 24 ? formatHour(hour, i18n.language) : '';
          },
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
              color={BAR_COLOR}
              roundedCorners={{ topLeft: 2, topRight: 2 }}
              animate={{ type: 'timing', duration: 500 }}
            />
            {isActive && (
              <ChartCursor
                x={state.x.position}
                y={state.y.count.position}
                index={state.matchedIndex}
                chartBounds={chartBounds}
                color={BAR_COLOR}
                radius={5}
              />
            )}
          </>
        )}
      </CartesianChart>
    </ChartCard>
  );
}
