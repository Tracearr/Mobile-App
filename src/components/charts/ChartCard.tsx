import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { ACCENT_COLOR } from '../../lib/theme';

interface ChartCardProps {
  height?: number;
  isLoading?: boolean;
  isEmpty: boolean;
  className?: string;
  children: React.ReactNode;
}

export function ChartCard({ height, isLoading, isEmpty, className, children }: ChartCardProps) {
  const { t } = useTranslation(['common']);
  const showChart = !isLoading && !isEmpty;

  return (
    <Card
      padding="chart"
      className={cn(
        !showChart && 'items-center justify-center',
        !showChart && height === undefined && 'min-h-[150px]',
        className
      )}
      style={{ height }}
    >
      {isLoading ? (
        <ActivityIndicator color={ACCENT_COLOR} accessibilityLabel={t('common:states.loading')} />
      ) : isEmpty ? (
        <Text className="text-muted-foreground text-sm">{t('common:empty.noData')}</Text>
      ) : (
        children
      )}
    </Card>
  );
}

interface PlaysReadoutProps {
  active: { count: number; label: string } | null;
  color: string;
}

export function PlaysReadout({ active, color }: PlaysReadoutProps) {
  const { t } = useTranslation(['common']);

  return (
    <View className="mb-1 min-h-5 flex-row items-center justify-between px-1">
      {active ? (
        <>
          <Text className="text-sm font-semibold" style={{ color }}>
            {t('common:count.play', {
              count: active.count,
              defaultValue: '{{count}} plays',
              defaultValue_one: '{{count}} play',
              defaultValue_other: '{{count}} plays',
            })}
          </Text>
          <Text className="text-muted-foreground text-xs">{active.label}</Text>
        </>
      ) : null}
    </View>
  );
}
