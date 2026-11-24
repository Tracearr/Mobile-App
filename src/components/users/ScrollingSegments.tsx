import { View, ScrollView } from 'react-native';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { haptics } from '@/lib/haptics';

const SEGMENTS_THAT_FIT = 3;

/** A segmented picker that spans the width up to three options and scrolls sideways past that */
export function ScrollingSegments({
  accessibilityLabel,
  options,
  value,
  onChange,
}: {
  accessibilityLabel: string;
  options: SegmentedOption<string>[];
  value: string;
  onChange: (value: string) => void;
}) {
  const fits = options.length <= SEGMENTS_THAT_FIT;

  const control = (
    <SegmentedControl
      accessibilityLabel={accessibilityLabel}
      options={options}
      value={value}
      fullWidth={fits}
      onChange={(next) => {
        if (next === value) return;
        haptics.selection();
        onChange(next);
      }}
    />
  );

  return (
    <View className="mb-4">
      {fits ? (
        control
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {control}
        </ScrollView>
      )}
    </View>
  );
}
