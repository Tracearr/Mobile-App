import type { ReactNode } from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { colors } from '@/lib/theme';
import { EmptyState } from './empty-state';

interface SplitPaneProps {
  list: ReactNode;
  /** The selected item's screen, or null when nothing is selected yet. */
  detail: ReactNode | null;
  placeholder: { icon: LucideIcon; title: string };
}

// A phone-width column: wide enough for the segmented filters on Alerts, and it
// leaves the detail about 490 pt on the Duo inner display.
const LIST_WIDTH = 380;

/**
 * List beside detail for regular widths (iPad, iPhone Duo open, Android
 * foldables). The list keeps a phone-sized column and the detail takes the rest,
 * as Apple's iPhone Duo guidance shows for mail: what was a push on the outer
 * display becomes a selection on the inner one.
 */
export function SplitPane({ list, detail, placeholder }: SplitPaneProps) {
  return (
    <View style={{ flex: 1, flexDirection: 'row' }}>
      <View
        style={{ width: LIST_WIDTH, borderRightWidth: 1, borderRightColor: colors.border.dark }}
      >
        {list}
      </View>
      <View style={{ flex: 1 }}>
        {detail ?? (
          <EmptyState
            className="flex-1 justify-center"
            icon={placeholder.icon}
            title={placeholder.title}
          />
        )}
      </View>
    </View>
  );
}
