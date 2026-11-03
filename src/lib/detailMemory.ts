export type DetailKind = 'user' | 'session' | 'violation';

const scrollOffsets = new Map<string, number>();
const tabs = new Map<string, string>();
const tabListeners = new Set<() => void>();
let tokens = 0;

/**
 * Memory belongs to one opened detail, named by a token the opener mints. A
 * list hands its selection's token to the embedded copy as a prop and to a
 * pushed copy as the `mem` route param, so the two copies of one selection
 * share memory and two copies of one id never do.
 */
export function newToken(): string {
  tokens += 1;
  return `m${tokens}`;
}

export function scrollKey(detail: string, tab?: string): string {
  return tab ? `${detail}:${tab}` : detail;
}

// iOS reports negative offsets while a pull-to-refresh is held, and its
// setContentOffset does not clamp them back.
export function rememberScroll(key: string, y: number): void {
  scrollOffsets.set(key, Math.max(0, y));
}

export function recallScroll(key: string): number {
  return scrollOffsets.get(key) ?? 0;
}

/**
 * Where a key's scroll view starts. A remembered offset wins. A key with none
 * keeps the current offset up to `ceiling` (a pinned header's offset) so a
 * collapsed header stays collapsed; without a ceiling it starts at the top.
 */
export function startOffset(key: string, current: number, ceiling?: number): number {
  const remembered = scrollOffsets.get(key);
  if (remembered !== undefined || ceiling === undefined) return remembered ?? 0;
  return Math.min(current, ceiling);
}

export interface Size {
  width: number;
  height: number;
}

/**
 * One attempt at reaching `target` once the layout is known. Returns where to
 * scroll and whether the target was reachable; a target beyond the layout's
 * maximum offset scrolls to the bottom and stays open, so later growth can
 * still reach it. Null while the content or viewport size is unknown, and while
 * they were measured at different widths: the content container always spans
 * the viewport, so a mismatch means one of them predates a resize.
 */
export function restoreStep(
  target: number,
  content: Size,
  viewport: Size
): { y: number; done: boolean } | null {
  if (content.height <= 0 || viewport.height <= 0) return null;
  if (Math.abs(content.width - viewport.width) >= 1) return null;
  const max = Math.max(0, content.height - viewport.height);
  return max >= target ? { y: target, done: true } : { y: max, done: false };
}

export const QUIET_SCROLL_MS = 300;

/**
 * A scroll with no drag behind it (TalkBack, keyboard, a focus move) is the
 * user's when no layout change came within QUIET_SCROLL_MS of it. Offsets the
 * platform moves on a resize, and clamps, always arrive beside a layout event.
 */
export function isQuietScroll(scrollAt: number, lastLayoutAt: number): boolean {
  return scrollAt - lastLayoutAt >= QUIET_SCROLL_MS;
}

export function rememberTab(detail: string, tab: string): void {
  if (tabs.get(detail) === tab) return;
  tabs.set(detail, tab);
  tabListeners.forEach((listener) => listener());
}

export function subscribeTabs(listener: () => void): () => void {
  tabListeners.add(listener);
  return () => {
    tabListeners.delete(listener);
  };
}

export function recallTab(detail: string): string | undefined {
  return tabs.get(detail);
}

/** The detail was closed, so its memory goes. */
export function forgetDetail(detail: string): void {
  for (const stored of scrollOffsets.keys()) {
    if (stored === detail || stored.startsWith(`${detail}:`)) scrollOffsets.delete(stored);
  }
  if (tabs.delete(detail)) tabListeners.forEach((listener) => listener());
}
