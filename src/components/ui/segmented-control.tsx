import * as React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from '@/lib/utils';
import { Text } from './text';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** Spoken instead of `label` when the visible label is an abbreviation. */
  accessibilityLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Segments share the full width. Pass false to size the control to its labels. */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  fullWidth = true,
  accessibilityLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      className={cn('bg-surface flex-row rounded-lg p-1', className)}
    >
      {options.map((option) => {
        const isSelected = value === option.value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.accessibilityLabel ?? option.label}
            accessibilityState={{ selected: isSelected, checked: isSelected }}
            hitSlop={{ top: 4, bottom: 4 }}
            className={cn(
              'min-h-9 items-center justify-center rounded-md px-3',
              fullWidth && 'flex-1',
              isSelected && 'bg-card'
            )}
          >
            <Text
              numberOfLines={1}
              className={cn(
                'text-[13px] font-semibold',
                isSelected ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
