import type { UserTab } from '@/lib/userTabs';

/**
 * Shared props for the detail screens. They render either as their own route,
 * where the route file supplies the id and pops on back, or embedded in the
 * right pane of a list screen at regular width, where the list owns selection.
 * `mem` names this opened detail's scroll and section memory (see detailMemory).
 */
export interface DetailScreenProps {
  id: string;
  mem: string;
  embedded?: boolean;
  onBack: () => void;
}

export type UserDetailProps = DetailScreenProps & {
  tab?: string;
  onTabChange?: (tab: UserTab) => void;
};
