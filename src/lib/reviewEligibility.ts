const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_ACTIVE_DAYS = 7;
export const TROUBLE_FREE_MS = 14 * DAY_MS;
export const ASK_INTERVAL_MS = 120 * DAY_MS;

export interface ReviewHistory {
  activeDays: number;
  lastActiveDay: string | null;
  lastTroubleAt: number | null;
  lastAskedAt: number | null;
}

function localDay(now: number): string {
  const date = new Date(now);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function recordActiveDay<T extends ReviewHistory>(history: T, now: number): T {
  const day = localDay(now);
  if (history.lastActiveDay === day) return history;
  return { ...history, activeDays: history.activeDays + 1, lastActiveDay: day };
}

export function canAskForReview(history: ReviewHistory, paired: boolean, now: number): boolean {
  return (
    paired &&
    history.activeDays >= MIN_ACTIVE_DAYS &&
    (history.lastTroubleAt === null || now - history.lastTroubleAt >= TROUBLE_FREE_MS) &&
    (history.lastAskedAt === null || now - history.lastAskedAt >= ASK_INTERVAL_MS)
  );
}
