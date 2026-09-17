/* eslint-disable @typescript-eslint/no-deprecated */
/**
 * Stacked area chart showing concurrent streams over time with direct/directStream/transcode breakdown
 */
import React, { useState, useCallback } from 'react';
import { View } from 'react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { CartesianChart, StackedArea, useChartPressState } from 'victory-native';
import { Circle, LinearGradient, vec } from '@shopify/react-native-skia';
import { useAnimatedReaction, runOnJS } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { colors } from '../../lib/theme';
import { useChartFont } from './useChartFont';
import { ChartCard } from './ChartCard';
import { PLAYBACK_COLORS } from './chartColors';
import { COUNT_TICKS, countDomain, hasCounts } from './countAxis';

interface ConcurrentChartProps {
  data: { hour: string; total: number; direct: number; directStream?: number; transcode: number }[];
  height?: number;
  isLoading?: boolean;
}

// Web's ConcurrentChart series: --chart-2, a fixed blue, --chart-4.
const CHART_COLORS = {
  direct: colors.chart[1],
  ...PLAYBACK_COLORS,
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

export function ConcurrentChart({ data, height = 200, isLoading }: ConcurrentChartProps) {
  const { t, i18n } = useTranslation(['common']);
  const hasDirectStream = data.some((d) => (d.directStream ?? 0) > 0);
  const font = useChartFont(10);
  const { state, isActive } = useChartPressState({
    x: 0,
    y: { direct: 0, directStream: 0, transcode: 0 },
  });

  // React state to display values (synced from SharedValues)
  const [displayValue, setDisplayValue] = useState<{
    index: number;
    direct: number;
    directStream: number;
    transcode: number;
  } | null>(null);

  // Always include directStream in chart data (defaults to 0 for old API responses)
  const chartData = data.map((d, index) => ({
    x: index,
    direct: d.direct,
    directStream: d.directStream ?? 0,
    transcode: d.transcode,
    label: d.hour,
  }));
  // The areas stack, so the axis has to fit the sum, not the largest single series.
  const stackTotals = chartData.map((d) => d.direct + d.directStream + d.transcode);

  // Sync SharedValue changes to React state
  const updateDisplayValue = useCallback(
    (index: number, direct: number, directStream: number, transcode: number) => {
      setDisplayValue({
        index: Math.round(index),
        direct: Math.round(direct),
        directStream: Math.round(directStream),
        transcode: Math.round(transcode),
      });
    },
    []
  );

  const clearDisplayValue = useCallback(() => {
    setDisplayValue(null);
  }, []);

  // Watch for changes in chart press state
  useAnimatedReaction(
    () => ({
      active: isActive,
      x: state.x.value.value,
      direct: state.y.direct.value.value,
      directStream: state.y.directStream.value.value,
      transcode: state.y.transcode.value.value,
    }),
    (current, previous) => {
      if (current.active) {
        runOnJS(updateDisplayValue)(
          current.x,
          current.direct,
          current.directStream,
          current.transcode
        );
      } else if (previous?.active && !current.active) {
        runOnJS(clearDisplayValue)();
      }
    },
    [isActive]
  );

  const currentItem = displayValue ? chartData[displayValue.index] : null;
  const activeDate = currentItem ? parseTimestamp(currentItem.label) : null;
  const dateLabel =
    activeDate?.toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' }) ?? '';

  const total = displayValue
    ? displayValue.direct + displayValue.directStream + displayValue.transcode
    : 0;

  return (
    <ChartCard height={height} isLoading={isLoading} isEmpty={!hasCounts(stackTotals)}>
      {/* Legend */}
      <View className="mb-1 flex-row justify-end gap-4 px-1">
        <View className="flex-row items-center gap-1">
          <View className="h-2 w-2 rounded-full" style={{ backgroundColor: CHART_COLORS.direct }} />
          <Text className="text-muted-foreground text-xs">{t('common:playback.directPlay')}</Text>
        </View>
        {hasDirectStream && (
          <View className="flex-row items-center gap-1">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: CHART_COLORS.directStream }}
            />
            <Text className="text-muted-foreground text-xs">
              {t('common:playback.directStream')}
            </Text>
          </View>
        )}
        <View className="flex-row items-center gap-1">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: CHART_COLORS.transcode }}
          />
          <Text className="text-muted-foreground text-xs">{t('common:playback.transcode')}</Text>
        </View>
      </View>

      {/* Active value display */}
      <View className="mb-1 min-h-9 flex-row items-center justify-between px-1">
        {displayValue && currentItem ? (
          <>
            <View className="flex-col">
              <Text className="text-sm font-semibold">
                {t('common:count.stream', { count: total })}
              </Text>
              <Text className="text-xs">
                <Text className="text-xs" style={{ color: CHART_COLORS.direct }}>
                  {displayValue.direct} {t('common:playback.directPlay')}
                </Text>
                {hasDirectStream && (
                  <>
                    {' · '}
                    <Text className="text-xs" style={{ color: CHART_COLORS.directStream }}>
                      {displayValue.directStream} {t('common:playback.directStream')}
                    </Text>
                  </>
                )}
                {' · '}
                <Text className="text-xs" style={{ color: CHART_COLORS.transcode }}>
                  {displayValue.transcode} {t('common:playback.transcode')}
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
        yKeys={['direct', 'directStream', 'transcode']}
        domain={{ y: countDomain(stackTotals) }}
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
              points={[points.direct, points.directStream, points.transcode]}
              y0={chartBounds.bottom}
              animate={{ type: 'timing', duration: 500 }}
              areaOptions={({ rowIndex, lowestY, highestY }) => {
                const colorOrder = [
                  CHART_COLORS.direct,
                  CHART_COLORS.directStream,
                  CHART_COLORS.transcode,
                ];
                return {
                  children: (
                    <LinearGradient
                      start={vec(0, highestY)}
                      end={vec(0, lowestY)}
                      colors={[`${colorOrder[rowIndex]}DD`, `${colorOrder[rowIndex]}66`]}
                    />
                  ),
                };
              }}
            />
            {isActive && <ToolTip x={state.x.position} y={state.y.direct.position} />}
          </>
        )}
      </CartesianChart>
    </ChartCard>
  );
}
