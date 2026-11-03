import { useEffect, useRef, useState, type ComponentRef, type Ref } from 'react';
import { findNodeHandle, Pressable, View } from 'react-native';
import { FocusRing } from './focus-ring';
import { Text } from './text';
import { useFocusRing } from '@/hooks/useFocusRing';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors } from '@/lib/theme';

export interface SectionTabsProps<T extends string> {
  sections: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

type ViewRef = ComponentRef<typeof View>;

const TAB_HEIGHT = 48;
// M3 tabs ripple in the on-surface color at a low opacity.
const TAB_RIPPLE = { color: `${colors.text.primary.dark}1F` };
const INDICATOR_HEIGHT = 3;
const INDICATOR_INSET = 4;
const INDICATOR_MIN_WIDTH = 24;

interface TabProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  nextFocusLeft?: number;
  nextFocusRight?: number;
  tabRef?: Ref<ViewRef>;
}

function Tab({ label, selected, onPress, nextFocusLeft, nextFocusRight, tabRef }: TabProps) {
  const { focused, onFocus, onBlur } = useFocusRing();
  const [labelWidth, setLabelWidth] = useState(0);

  return (
    <Pressable
      ref={tabRef}
      onPress={onPress}
      onFocus={onFocus}
      onBlur={onBlur}
      nextFocusLeft={nextFocusLeft}
      nextFocusRight={nextFocusRight}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      android_ripple={TAB_RIPPLE}
      style={{ flex: 1, height: TAB_HEIGHT, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text
        numberOfLines={1}
        onLayout={(event) => setLabelWidth(event.nativeEvent.layout.width)}
        className={selected ? 'text-sm font-medium' : 'text-muted-foreground text-sm font-medium'}
      >
        {label}
      </Text>
      {selected && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            alignSelf: 'center',
            width: Math.max(labelWidth + INDICATOR_INSET, INDICATOR_MIN_WIDTH),
            height: INDICATOR_HEIGHT,
            borderTopLeftRadius: 3,
            borderTopRightRadius: 3,
            backgroundColor: ACCENT_COLOR,
          }}
        />
      )}
      {focused && <FocusRing />}
    </Pressable>
  );
}

export function SectionTabs<T extends string>({
  sections,
  value,
  onChange,
  accessibilityLabel,
}: SectionTabsProps<T>) {
  const firstRef = useRef<ViewRef>(null);
  const lastRef = useRef<ViewRef>(null);
  const [edgeTags, setEdgeTags] = useState<{ first?: number; last?: number }>({});
  const lastIndex = sections.length - 1;

  useEffect(() => {
    setEdgeTags({
      first: findNodeHandle(firstRef.current) ?? undefined,
      last: findNodeHandle(lastRef.current) ?? undefined,
    });
  }, [sections.length]);

  return (
    // Fabric flattens a View whose only extras are accessibility role and label,
    // which drops the tablist node from the Android hierarchy.
    <View
      collapsable={false}
      accessibilityRole="tablist"
      accessibilityLabel={accessibilityLabel}
      style={{ height: TAB_HEIGHT, flexDirection: 'row' }}
    >
      {sections.map((section, index) => (
        <Tab
          key={section.value}
          label={section.label}
          selected={section.value === value}
          onPress={() => {
            if (section.value === value) return;
            haptics.selection();
            onChange(section.value);
          }}
          tabRef={index === 0 ? firstRef : index === lastIndex ? lastRef : undefined}
          nextFocusLeft={index === 0 ? edgeTags.first : undefined}
          nextFocusRight={index === lastIndex ? edgeTags.last : undefined}
        />
      ))}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 1,
          backgroundColor: colors.border.dark,
        }}
      />
    </View>
  );
}
