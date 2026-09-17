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

export function PlaysChart({ data, period = 'month', height = 200, isLoading }: PlaysChartProps) {
  const { t, i18n } = useTranslation(['common', 'mobile']);
  const font = useChartFont(10);
  const { state, isActive } = useChartPressState({ x: 0, y: { count: 0 } });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    index: number;
    count: number;
  } | null>(null);

  const byDate = sumByDate(data);
  const chartData = byDate.map((d, index) => ({
    x: index,
    count: d.count,
  }));
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
        axisOptions={{
          font,
          tickCount: { x: DATE_TICKS, y: COUNT_TICKS },
          lineColor: colors.border.dark,
          labelColor: colors.text.muted.dark,
          formatXLabel: (value) => {
            const date = dates[Math.round(value)];
            return date ? formatAxisDate(date, monthLabels, i18n.language) : '';
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
