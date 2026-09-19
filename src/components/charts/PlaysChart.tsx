/**
 * Area chart showing plays over time with touch-to-reveal tooltip
 */
import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from '@tracearr/translations/mobile';
import { CartesianChart, Area, useChartPressState } from 'victory-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { ACCENT_COLOR } from '../../lib/theme';
import { useChartFont } from './useChartFont';
import { ChartCard, PlaysReadout } from './ChartCard';
import { ChartCursor } from './ChartCursor';
import { AXIS_COLORS } from './chartColors';
import { COUNT_TICKS, countDomain, hasCounts, sumByDate } from './countAxis';
import {
  DATE_TICKS,
  formatAxisDate,
  formatReadoutDate,
  usesMonthLabels,
  type ChartPeriod,
} from './dateLabels';

interface PlaysChartProps {
  data: { date: string; count: number }[];
  period?: ChartPeriod;
  height?: number;
  isLoading?: boolean;
}

export function PlaysChart({ data, period = 'month', height = 200, isLoading }: PlaysChartProps) {
  const { t, i18n } = useTranslation(['common', 'mobile']);
  const font = useChartFont(10);
  const { state, isActive } = useChartPressState({ x: 0, y: { count: 0 } });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    index: number;
    count: number;
  } | null>(null);

  const byDate = useMemo(() => sumByDate(data), [data]);
  // CartesianChart cancels an active press whenever `data` changes identity.
  const chartData = useMemo(
    () => byDate.map((d, index) => ({ x: index, count: d.count })),
    [byDate]
  );
  const counts = chartData.map((d) => d.count);
  const dates = byDate.map((d) => new Date(d.date));
  const monthLabels = usesMonthLabels(dates[0] ?? null, dates[dates.length - 1] ?? null);

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

  const activeDate = displayValue ? dates[displayValue.index] : undefined;
  const activeLabel = activeDate ? formatReadoutDate(activeDate, period, i18n.language) : '';

  return (
    <ChartCard height={height} isLoading={isLoading} isEmpty={!hasCounts(counts)}>
      <PlaysReadout
        color={ACCENT_COLOR}
        active={
          displayValue && activeDate
            ? {
                count: displayValue.count,
                label:
                  period === 'all'
                    ? t('mobile:charts.weekOf', {
                        date: activeLabel,
                        defaultValue: 'Week of {{date}}',
                      })
                    : activeLabel,
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
        xAxis={{
          ...AXIS_COLORS,
          font,
          tickCount: DATE_TICKS,
          formatXLabel: (value) => {
            const date = dates[Math.round(value)];
            return date ? formatAxisDate(date, monthLabels, i18n.language) : '';
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
            <Area
              points={points.count}
              y0={chartBounds.bottom}
              color={ACCENT_COLOR}
              opacity={0.85}
              animate={{ type: 'timing', duration: 500 }}
            />
            {isActive && (
              <ChartCursor
                x={state.x.position}
                y={state.y.count.position}
                index={state.matchedIndex}
                chartBounds={chartBounds}
                color={ACCENT_COLOR}
                radius={6}
              />
            )}
          </>
        )}
      </CartesianChart>
    </ChartCard>
  );
}
