export const COUNT_TICKS = 4;

/**
 * Y domain for an axis of whole-number counts. d3 only picks integer ticks
 * when the span divided by the tick count is at least 1, so a chart whose
 * largest value is under COUNT_TICKS would repeat rounded labels (1, 1, 0, 0).
 */
export function countDomain(values: readonly number[]): [number, number] {
  return [0, Math.max(COUNT_TICKS, ...values)];
}

export function hasCounts(values: readonly number[]): boolean {
  return values.some((value) => value > 0);
}

/**
 * /stats/plays returns one row per (date, server), so a multi-server selection
 * has several rows for the same date. Order follows each date's first row.
 */
export function sumByDate(
  rows: readonly { date: string; count: number }[]
): { date: string; count: number }[] {
  const totals = new Map<string, number>();
  for (const { date, count } of rows) {
    totals.set(date, (totals.get(date) ?? 0) + count);
  }
  return Array.from(totals, ([date, count]) => ({ date, count }));
}
