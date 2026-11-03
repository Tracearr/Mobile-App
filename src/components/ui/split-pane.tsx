import type { ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { splitListWidth } from '@/lib/splitLayout';
import { EmptyState } from './empty-state';

interface SplitPaneProps {
  /** Show the detail column beside the list. When false only the list renders. */
  split: boolean;
  list: ReactNode;
  /** The selected item's screen, or null when nothing is selected yet. */
  detail: ReactNode | null;
  placeholder: { icon: LucideIcon; title: string };
}

/**
 * List beside detail for regular widths (iPad, iPhone Duo open, Android
 * foldables). The list keeps a phone-sized column and the detail takes the rest,
 * as Apple's iPhone Duo guidance shows for mail: what was a push on the outer
 * display becomes a selection on the inner one.
 *
 * The row and the list column stay mounted in both modes, so folding and
 * unfolding keeps the list's scroll position, search text and filters.
 */
export function SplitPane({ split, list, detail, placeholder }: SplitPaneProps) {
  const { width } = useWindowDimensions();
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View
        style={
          split
            ? {
                width: splitListWidth(width),
                borderRightWidth: 1,
                borderRightColor: colors.border.dark,
              }
            : { flex: 1 }
        }
      >
        {list}
      </View>
      {split ? (
        <View style={{ flex: 1 }}>
          {detail ?? (
            <EmptyState
              className="flex-1 justify-center"
              icon={placeholder.icon}
              title={placeholder.title}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}
