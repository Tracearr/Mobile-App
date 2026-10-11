/** Quiet hours are stored as HH:MM wall clock times, read in the device's timezone. */

export const DEFAULT_QUIET_START = '23:00';
export const DEFAULT_QUIET_END = '08:00';

export function timeToDate(time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function dateToTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
