/**
 * Shared props for the detail screens. They render either as their own route,
 * where the route file supplies the id and pops on back, or embedded in the
 * right pane of a list screen at regular width, where the list owns selection.
 */
export interface DetailScreenProps {
  id: string;
  embedded?: boolean;
  onBack: () => void;
}
