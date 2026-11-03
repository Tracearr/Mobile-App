export const SPLIT_MIN_WIDTH = { ios: 600, android: 840 } as const;

export function isSplitWidth(width: number, os: string): boolean {
  return width >= (os === 'android' ? SPLIT_MIN_WIDTH.android : SPLIT_MIN_WIDTH.ios);
}

export function splitListWidth(width: number): number {
  return Math.min(380, Math.round(width * 0.4));
}

export type SplitFlip =
  { type: 'none' } | { type: 'embed'; id: string } | { type: 'push'; id: string };

/**
 * The pushed detail an unfold would embed: the copy this list pushed, found by
 * the memory token in its `mem` param wherever it sits in the stack.
 */
export function flipCopy<R extends { params?: object }>(
  routes: readonly R[],
  mem: string | null
): R | undefined {
  if (mem === null) return undefined;
  return routes.find((route) => (route.params as { mem?: string } | undefined)?.mem === mem);
}

export function splitFlip(input: {
  wasSplit: boolean;
  isSplit: boolean;
  selectedId: string | null;
  pushedId: string | null;
  copy: { name: string; id?: string } | null;
  detailRoute: string;
}): SplitFlip {
  const { wasSplit, isSplit, selectedId, pushedId, copy, detailRoute } = input;
  if (wasSplit === isSplit) return { type: 'none' };
  if (isSplit) {
    return pushedId && copy?.name === detailRoute && copy.id === pushedId
      ? { type: 'embed', id: pushedId }
      : { type: 'none' };
  }
  return selectedId ? { type: 'push', id: selectedId } : { type: 'none' };
}
