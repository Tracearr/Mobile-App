/**
 * Every date, time, weekday, duration and time zone helper in the app, and the conventions they
 * follow: which locale orders dates, the 12- or 24-hour clock, the first day of the week and the
 * device time zone. dateSettings.ts works the conventions out from the phone and the person's
 * choices; this module stays free of native imports so Node tests and the widget can load it.
 */
import { formatDistanceToNow } from 'date-fns';

// Thai, Persian and Arabic locales otherwise switch the calendar or the digits.
const LOCALE_EXTENSION = '-u-ca-gregory-nu-latn';

/** 0 = Sunday through 6 = Saturday, matching the server's DayOfWeekStats.day. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type WeekStartPref = 'auto' | 0 | 1 | 6;
export type DateRegion = 'auto' | (string & {});

export interface DateConventions {
  locale: string;
  hour12: boolean | undefined;
  weekStart: Weekday;
  timeZone: string;
}

/**
 * Countries behind the translation locales (sr-SP is Serbia, RS), plus common English-speaking
 * ones, each with the language CLDR gives it. Hermes has no Intl.Locale to look that up, and a
 * picked country the interface language has no data for is written in that language instead.
 */
export const REGION_LANGUAGES: Readonly<Record<string, string>> = {
  AU: 'en',
  BR: 'pt',
  CA: 'en',
  CN: 'zh',
  CZ: 'cs',
  DE: 'de',
  DK: 'da',
  ES: 'es',
  FI: 'fi',
  FR: 'fr',
  GB: 'en',
  GR: 'el',
  HU: 'hu',
  IE: 'en',
  IL: 'he',
  IN: 'hi',
  IT: 'it',
  JP: 'ja',
  KR: 'ko',
  NL: 'nl',
  NO: 'nb',
  NZ: 'en',
  PL: 'pl',
  PT: 'pt',
  RO: 'ro',
  RS: 'sr',
  RU: 'ru',
  SA: 'ar',
  SE: 'sv',
  TR: 'tr',
  TW: 'zh',
  UA: 'uk',
  US: 'en',
  VN: 'vi',
  ZA: 'en',
};

let conventions: DateConventions = {
  locale: 'en' + LOCALE_EXTENSION,
  hour12: undefined,
  weekStart: 0,
  timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
};

export function getDateConventions(): DateConventions {
  return conventions;
}

export function setDateConventions(next: DateConventions): void {
  conventions = next;
}

export function getDeviceTimezone(): string {
  return conventions.timeZone;
}

export function is24HourClock(): boolean {
  return conventions.hour12 === false;
}

/**
 * The language-region pair when the platform has data for it. Hermes has no Intl.Locale, and an
 * unsupported pair resolves to the bare language on iOS but to the device's own locale on Android,
 * so the pair only counts when the resolved tag keeps both parts.
 */
export function pairedLocale(uiLanguage: string, region: string): string | undefined {
  const language = uiLanguage.split('-')[0];
  const pair = `${language}-${region}`;
  try {
    const parts = new Intl.DateTimeFormat(pair).resolvedOptions().locale.split('-u-')[0].split('-');
    return parts[0] === language && parts.includes(region) ? pair : undefined;
  } catch {
    return undefined;
  }
}

/** The locale a picked region writes dates in: with the interface language, else its own. */
function pickedLocale(uiLanguage: string, region: string): string | undefined {
  const own = REGION_LANGUAGES[region];
  return pairedLocale(uiLanguage, region) ?? (own ? pairedLocale(own, region) : undefined);
}

export function resolveFormatLocale(
  uiLanguage: string,
  pickedRegion: string | null,
  phoneRegion: string | null
): string {
  const locale =
    (pickedRegion ? pickedLocale(uiLanguage, pickedRegion) : undefined) ??
    (phoneRegion ? pairedLocale(uiLanguage, phoneRegion) : undefined) ??
    uiLanguage;
  return locale + LOCALE_EXTENSION;
}

// iOS Hermes ignores nu-latn. ICU 72+ puts a narrow no-break space before AM; plain spaces keep text matching working.
function clean(text: string): string {
  return text
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/ /g, ' ');
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let cached = formatters.get(key);
  if (!cached) {
    cached = new Intl.DateTimeFormat(locale, options);
    formatters.set(key, cached);
  }
  return cached;
}

export function formatDate(date: Date | number, options: Intl.DateTimeFormatOptions): string {
  const { locale, hour12 } = conventions;
  const withClock =
    hour12 !== undefined && (options.hour !== undefined || options.timeStyle !== undefined)
      ? { ...options, hour12 }
      : options;
  return clean(formatter(locale, withClock).format(date));
}

const SAMPLE_DATE = Date.UTC(2026, 4, 17, 12);

/** A fixed date the way a locale writes it, short and medium, for the Date format choices. */
export function formatSample(locale: string): string {
  const short = formatter(locale, { dateStyle: 'short', timeZone: 'UTC' }).format(SAMPLE_DATE);
  const medium = formatter(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(SAMPLE_DATE);
  return clean(`${short} · ${medium}`);
}

/** The distinct formats a pick can give on this phone, other than Automatic's. */
export function dateFormatChoices(
  uiLanguage: string,
  automaticLocale: string
): { region: string; sample: string }[] {
  const seen = new Set([formatSample(automaticLocale)]);
  const choices: { region: string; sample: string }[] = [];
  for (const region of Object.keys(REGION_LANGUAGES)) {
    const locale = pickedLocale(uiLanguage, region);
    if (!locale) continue;
    const sample = formatSample(locale + LOCALE_EXTENSION);
    if (seen.has(sample)) continue;
    seen.add(sample);
    choices.push({ region, sample });
  }
  return choices.sort((a, b) => a.sample.localeCompare(b.sample));
}

/**
 * The picker row showing the format in effect. A saved region can drop out of the list by
 * sharing its sample with an earlier region, so rows are matched by sample, not by region.
 */
export function checkedDateFormat(
  choices: readonly { region: string; sample: string }[],
  automaticLocale: string,
  currentLocale: string
): 'auto' | (string & {}) {
  const sample = formatSample(currentLocale);
  if (sample === formatSample(automaticLocale)) return 'auto';
  return choices.find((choice) => choice.sample === sample)?.region ?? 'auto';
}

/** Day name for 0 = Sunday through 6 = Saturday. */
export function weekdayName(day: number, width: 'short' | 'long'): string {
  // 2026-01-04 was a Sunday.
  return formatDate(Date.UTC(2026, 0, 4 + day), { weekday: width, timeZone: 'UTC' });
}

/** Day numbers in display order, starting at the week start. */
const WEEK: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

export function orderedWeekdays(weekStart: Weekday = conventions.weekStart): Weekday[] {
  return [...WEEK.slice(weekStart), ...WEEK.slice(0, weekStart)];
}

/** Per-day counts in display order, a day the server left out counting zero. */
export function weekdayCounts(
  data: readonly { day: number; count: number }[],
  weekStart: Weekday = conventions.weekStart
): { day: Weekday; count: number }[] {
  return orderedWeekdays(weekStart).map((day) => ({
    day,
    count: data.find((d) => d.day === day)?.count ?? 0,
  }));
}

/** An hour of the day (0-23) in the person's clock, such as "1 PM" or "13:00". */
export function formatHourOfDay(hour: number): string {
  return formatDate(new Date(2024, 0, 1, hour), {
    hour: 'numeric',
    ...(conventions.hour12 === false ? { minute: '2-digit' } : {}),
  });
}

export const DATE_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium' };

export const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

export const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
};

export const FULL_DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_TIME_OPTIONS,
  year: 'numeric',
};

// The server sends Postgres text ("2026-09-17 14:29:35.04+00"), which is not ISO 8601: a space
// for the T, a two-digit fraction and an offset with no minutes. Only the ISO form is guaranteed
// to parse on every engine.
const PG_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

function toIsoTimestamp(value: string): string {
  const match = PG_TIMESTAMP.exec(value);
  if (!match) return value;
  const [, date, time, fraction = '', offset = 'Z'] = match;
  const millis = fraction.padEnd(3, '0').slice(0, 3);
  const digits = offset.replace(':', '');
  const zone = offset === 'Z' ? 'Z' : `${digits.slice(0, 3)}:${digits.slice(3) || '00'}`;
  return `${date}T${time}.${millis}${zone}`;
}

/** A Date, ISO string or Postgres timestamp text as a Date; null when missing or invalid. */
export function safeParseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(toIsoTimestamp(date));
  return isNaN(parsed.getTime()) ? null : parsed;
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** A chart bucket date: a bare YYYY-MM-DD is that day's local midnight, anything else a timestamp. */
export function parseChartDate(dateStr: string): Date | null {
  const day = ISO_DAY.exec(dateStr);
  if (!day) return safeParseDate(dateStr);
  return new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3]));
}

/** Returns the fallback for invalid dates. */
export function safeFormatDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions,
  fallback = 'Unknown'
): string {
  const parsed = safeParseDate(date);
  if (!parsed) return fallback;
  return formatDate(parsed, options);
}

/** Returns the fallback for invalid dates. */
export function safeFormatDistanceToNow(
  date: Date | string | null | undefined,
  fallback = 'Unknown'
): string {
  const parsed = safeParseDate(date);
  if (!parsed) return fallback;
  return formatDistanceToNow(parsed, { addSuffix: true });
}

/** "Today 2:30 PM", "Yesterday 9:15 AM", or "Jan 12, 2:30 PM" in the person's conventions. */
export function formatListTimestamp(date: Date | string | null | undefined): string {
  const parsed = safeParseDate(date);
  if (!parsed) return '-';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const timeStr = formatDate(parsed, TIME_OPTIONS);

  if (dateOnly.getTime() === today.getTime()) {
    return `Today ${timeStr}`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr}`;
  }
  return formatDate(parsed, DATE_TIME_OPTIONS);
}

/**
 * Format duration in milliseconds to human-readable string
 * Supports multiple output formats
 */
export function formatDuration(
  ms: number | null | undefined,
  options: { style?: 'compact' | 'precise' | 'full' | 'clock' } = {}
): string {
  const { style = 'compact' } = options;

  if (!ms) return style === 'clock' ? '--:--' : '-';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  switch (style) {
    case 'clock':
      // HH:MM:SS or MM:SS format
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;

    case 'full': {
      // "2 hours 30 minutes" format
      const parts: string[] = [];
      if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
      if (minutes > 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
      if (parts.length === 0) return '<1 minute';
      return parts.join(' ');
    }

    case 'precise':
      // "2h 30m", "45m 12s", "12s": keeps seconds for short sessions
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${seconds}s`;
      return `${seconds}s`;

    case 'compact':
    default:
      // "2h 30m" format
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m`;
      return '<1m';
  }
}

/**
 * Format a total watch time in milliseconds the way web's stat cards do:
 * "1yr 12d 4h", "3d 4h", "5h 30m" or "45m"
 */
export function formatWatchTime(ms: number | null | undefined): string {
  if (!ms) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years}yr ${days % 365}d ${hours % 24}h`;
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${totalMinutes % 60}m`;
  return `${totalMinutes}m`;
}

export type ChartPeriod = 'week' | 'month' | 'year' | 'all';

export const DATE_TICKS = 5;

const MONTH_MS = 28 * 86_400_000;

/**
 * Web's chart axis moves from day labels to month labels once ticks sit a month apart.
 * The series is not zero-filled, so the spacing is read from the dates that arrived:
 * a new install on "All" still gets day labels.
 */
export function usesMonthLabels(first: Date | null, last: Date | null): boolean {
  if (!first || !last) return false;
  return (last.getTime() - first.getTime()) / (DATE_TICKS - 1) >= MONTH_MS;
}

export function formatAxisDate(date: Date, monthLabels: boolean): string {
  return formatDate(
    date,
    monthLabels ? { month: 'short', year: '2-digit' } : { month: 'short', day: 'numeric' }
  );
}

/** Web's tooltip date: weekly and daily buckets carry the year, 6-hour buckets the hour. */
export function formatReadoutDate(date: Date, period: ChartPeriod): string {
  if (period === 'week') {
    return formatDate(date, { month: 'short', day: 'numeric', hour: 'numeric' });
  }
  return formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Quiet hours are stored as HH:MM wall clock times, read in the device's timezone. */
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
