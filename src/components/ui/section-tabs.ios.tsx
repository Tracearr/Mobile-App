import { View } from 'react-native';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { spacing } from '@/lib/theme';

export interface SectionTabsProps<T extends string> {
  sections: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function SectionTabs<T extends string>({
  sections,
  value,
  onChange,
  accessibilityLabel,
}: SectionTabsProps<T>) {
  return (
    <View style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
      <SegmentedControl
        values={sections.map((section) => section.label)}
        selectedIndex={sections.findIndex((section) => section.value === value)}
        onChange={({ nativeEvent }) => {
          const next = sections[nativeEvent.selectedSegmentIndex];
          if (next) onChange(next.value);
        }}
        appearance="dark"
        accessibilityLabel={accessibilityLabel}
      />
    </View>
  );
}
