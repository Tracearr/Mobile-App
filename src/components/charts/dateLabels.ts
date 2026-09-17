export type ChartPeriod = 'week' | 'month' | 'year' | 'all';

export const DATE_TICKS = 5;

const MONTH_MS = 28 * 86_400_000;

/**
 * Web's Highcharts axis moves from "%b %e" to "%b '%y" once ticks sit a month apart.
 * The series is not zero-filled, so the spacing is read from the dates that arrived:
 * a new install on "All" still gets day labels.
 */
export function usesMonthLabels(first: Date | null, last: Date | null): boolean {
  if (!first || !last) return false;
  return (last.getTime() - first.getTime()) / (DATE_TICKS - 1) >= MONTH_MS;
}

export function formatAxisDate(date: Date, monthLabels: boolean, locale: string): string {
  if (!monthLabels) return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
  const month = date.toLocaleDateString(locale, { month: 'short' });
  return `${month} '${String(date.getFullYear()).slice(-2)}`;
}

/** Web's tooltip date: weekly and daily buckets carry the year, 6-hour buckets the hour. */
export function formatReadoutDate(date: Date, period: ChartPeriod, locale: string): string {
  if (period === 'week') {
    return date.toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric' });
  }
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}
