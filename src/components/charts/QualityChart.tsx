/**
 * Simple chart showing direct play vs transcode breakdown
 */
import React from 'react';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { colors } from '../../lib/theme';

interface QualityChartProps {
  directPlay: number;
  transcode: number;
  directPlayPercent: number;
  transcodePercent: number;
  height?: number;
}

export function QualityChart({
  directPlay,
  transcode,
  directPlayPercent,
  transcodePercent,
  height = 120,
}: QualityChartProps) {
  const total = directPlay + transcode;

  if (total === 0) {
    return (
      <View className="bg-card items-center justify-center rounded-xl p-3" style={{ height }}>
        <Text className="text-muted-foreground text-sm">No playback data available</Text>
      </View>
    );
  }

  return (
    <View className="bg-card justify-center rounded-xl p-3" style={{ height }}>
      {/* Progress bar */}
      <View className="mb-3 h-6 flex-row overflow-hidden rounded-lg">
        <View style={{ flex: directPlayPercent || 1, backgroundColor: colors.success }} />
        <View style={{ flex: transcodePercent || 1, backgroundColor: colors.warning }} />
      </View>

      {/* Legend */}
      <View className="gap-2">
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.success }} />
          <Text className="text-foreground flex-1 text-sm">Direct Play</Text>
          <Text className="text-muted-foreground text-sm">
            {directPlay} ({directPlayPercent}%)
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors.warning }} />
          <Text className="text-foreground flex-1 text-sm">Transcode</Text>
          <Text className="text-muted-foreground text-sm">
            {transcode} ({transcodePercent}%)
          </Text>
        </View>
      </View>
    </View>
  );
}
