/**
 * Donut chart showing plays by platform (matches web implementation)
 * Note: Touch interactions not yet supported on PolarChart (victory-native issue #252)
 */
import React from 'react';
import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';
import { Text } from '@/components/ui/text';
import { colors, ACCENT_COLOR } from '../../lib/theme';
import { ChartCard } from './ChartCard';

interface PlatformChartProps {
  data: { platform: string; count: number }[];
  height?: number;
  isLoading?: boolean;
}

const SLICE_COLORS = [
  ACCENT_COLOR,
  colors.info,
  colors.success,
  colors.warning,
  colors.purple,
  colors.danger,
];

export function PlatformChart({ data, height, isLoading }: PlatformChartProps) {
  // Sort by count and take top 5
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((d, index) => ({
      label: d.platform.replace('Plex for ', '').replace('Jellyfin ', ''),
      value: d.count,
      color: SLICE_COLORS[index % SLICE_COLORS.length],
    }));

  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartCard isLoading={isLoading} isEmpty={total === 0}>
      {/* Pie Chart */}
      <View style={{ height: height ? height - 60 : 160 }}>
        <PolarChart data={sortedData} labelKey="label" valueKey="value" colorKey="color">
          <Pie.Chart innerRadius="50%" circleSweepDegrees={360} startAngle={0} />
        </PolarChart>
      </View>

      {/* Legend with percentages */}
      <View className="border-border mt-2 flex-row flex-wrap justify-center gap-4 border-t pt-2">
        {sortedData.map((item) => (
          <View key={item.label} className="flex-row items-center gap-1">
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
            <Text className="text-muted-foreground max-w-[60px] text-xs" numberOfLines={1}>
              {item.label}
            </Text>
            <Text className="text-secondary-foreground text-xs font-medium">
              {Math.round((item.value / total) * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </ChartCard>
  );
}
