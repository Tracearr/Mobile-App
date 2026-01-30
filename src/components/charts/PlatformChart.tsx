/**
 * Donut chart showing plays by platform (matches web implementation)
 * Note: Touch interactions not yet supported on PolarChart (victory-native issue #252)
 */
import React from 'react';
import { View } from 'react-native';
import { Pie, PolarChart } from 'victory-native';
import { Text } from '@/components/ui/text';
import { colors, ACCENT_COLOR } from '../../lib/theme';

interface PlatformChartProps {
  data: { platform: string; count: number }[];
  height?: number;
}

export function PlatformChart({ data, height }: PlatformChartProps) {
  // Colors for pie slices - all visible against dark card background
  // Using dynamic accent color as the primary color
  const chartColors = [
    ACCENT_COLOR, // Primary accent color
    colors.info, // #3B82F6 - Bright Blue
    colors.success, // #22C55E - Green
    colors.warning, // #F59E0B - Orange/Yellow
    colors.purple, // #8B5CF6 - Purple
    colors.error, // #EF4444 - Red
  ];
  // Sort by count and take top 5
  const sortedData = [...data]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
    .map((d, index) => ({
      label: d.platform.replace('Plex for ', '').replace('Jellyfin ', ''),
      value: d.count,
      color: chartColors[index % chartColors.length],
    }));

  if (sortedData.length === 0) {
    return (
      <View className="bg-card min-h-[150px] items-center justify-center rounded-xl p-2">
        <Text className="text-muted-foreground text-sm">No platform data available</Text>
      </View>
    );
  }

  const total = sortedData.reduce((sum, item) => sum + item.value, 0);

  return (
    <View className="bg-card rounded-xl p-2">
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
    </View>
  );
}
