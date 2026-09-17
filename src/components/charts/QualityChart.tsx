/**
 * Simple chart showing direct play / direct stream / transcode breakdown
 */
import React from 'react';
import { View } from 'react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { colors } from '../../lib/theme';
import { ChartCard } from './ChartCard';
import { PLAYBACK_COLORS } from './chartColors';

interface QualityChartProps {
  directPlay?: number;
  directStream?: number;
  transcode?: number;
  directPlayPercent?: number;
  directStreamPercent?: number;
  transcodePercent?: number;
  height?: number;
  isLoading?: boolean;
}

export function QualityChart({
  directPlay = 0,
  directStream = 0,
  transcode = 0,
  directPlayPercent = 0,
  directStreamPercent = 0,
  transcodePercent = 0,
  height = 140,
  isLoading,
}: QualityChartProps) {
  const { t } = useTranslation(['common']);
  const total = directPlay + directStream + transcode;
  const rows = [
    {
      label: t('common:playback.directPlay'),
      color: colors.success,
      count: directPlay,
      percent: directPlayPercent,
    },
    {
      label: t('common:playback.directStream'),
      color: PLAYBACK_COLORS.directStream,
      count: directStream,
      percent: directStreamPercent,
    },
    {
      label: t('common:playback.transcode'),
      color: PLAYBACK_COLORS.transcode,
      count: transcode,
      percent: transcodePercent,
    },
  ];

  return (
    <ChartCard
      height={height}
      isLoading={isLoading}
      isEmpty={total === 0}
      className="justify-center p-3"
    >
      <View className="mb-3 h-6 flex-row overflow-hidden rounded-lg">
        {rows.map(
          (row) =>
            row.count > 0 && (
              <View key={row.label} style={{ flex: row.count, backgroundColor: row.color }} />
            )
        )}
      </View>

      <View className="gap-2">
        {rows.map((row) => (
          <View key={row.label} className="flex-row items-center gap-2">
            <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />
            <Text className="text-foreground flex-1 text-sm">{row.label}</Text>
            <Text className="text-muted-foreground text-sm">
              {row.count} ({row.percent}%)
            </Text>
          </View>
        ))}
      </View>
    </ChartCard>
  );
}
