/**
 * Segmented control for selecting time periods (7d, 30d, 1y)
 */
import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from './text';
import { cn } from '@/lib/utils';

export type StatsPeriod = 'week' | 'month' | 'year';

interface PeriodSelectorProps {
  value: StatsPeriod;
  onChange: (value: StatsPeriod) => void;
}

const PERIODS: { value: StatsPeriod; label: string }[] = [
  { value: 'week', label: '7d' },
  { value: 'month', label: '30d' },
  { value: 'year', label: '1y' },
];

export function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <View className="bg-surface flex-row rounded-lg p-1">
      {PERIODS.map((period) => {
        const isSelected = value === period.value;
        return (
          <Pressable
            key={period.value}
            onPress={() => onChange(period.value)}
            className={cn('rounded-md px-4 py-1.5', isSelected && 'bg-card')}
          >
            <Text
              className={cn(
                'text-[13px] font-medium',
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {period.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
