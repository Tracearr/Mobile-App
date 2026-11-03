import * as React from 'react';
import { View, Pressable } from 'react-native';
import { cn } from '@/lib/utils';
import { useFocusRing } from '@/hooks/useFocusRing';
import { FocusRing } from './focus-ring';
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

// A min-h-9 segment renders at 31.5 dp and the p-1 container at 38.5 dp (see
// button.tsx on rem and the dpi sweep). The container's padding plus its slop
// covers the segment slop at every dpi, so the segments' hit area is never
// clipped at the container's bounds.
const SEGMENT_HIT_SLOP = { top: 10, bottom: 10 };
const CONTAINER_HIT_SLOP = { top: 8, bottom: 8 };

interface SegmentProps<T extends string> {
  option: SegmentedOption<T>;
  isSelected: boolean;
  fullWidth: boolean;
  onPress: () => void;
}

function Segment<T extends string>({ option, isSelected, fullWidth, onPress }: SegmentProps<T>) {
  const { focused, onFocus, onBlur } = useFocusRing();
  return (
    <Pressable
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      accessibilityRole="radio"
      accessibilityLabel={option.accessibilityLabel ?? option.label}
      accessibilityState={{ selected: isSelected, checked: isSelected }}
      hitSlop={SEGMENT_HIT_SLOP}
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
      {focused && <FocusRing radius={6} />}
    </Pressable>
  );
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
      hitSlop={CONTAINER_HIT_SLOP}
      className={cn('bg-surface flex-row rounded-lg p-1', className)}
    >
      {options.map((option) => (
        <Segment
          key={option.value}
          option={option}
          isSelected={value === option.value}
          fullWidth={fullWidth}
          onPress={() => onChange(option.value)}
        />
      ))}
    </View>
  );
}
