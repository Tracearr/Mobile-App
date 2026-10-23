import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DATE_OPTIONS,
  checkedDateFormat,
  dateFormatChoices,
  dateToTime,
  formatAxisDate,
  formatDate,
  formatHourOfDay,
  formatReadoutDate,
  formatSample,
  formatWatchTime,
  getDateConventions,
  is24HourClock,
  orderedWeekdays,
  pairedLocale,
  parseChartDate,
  REGION_LANGUAGES,
  resolveFormatLocale,
  safeParseDate,
  setDateConventions,
  timeToDate,
  usesMonthLabels,
  weekdayCounts,
  weekdayName,
} from './dateFormat.ts';

const EXT = '-u-ca-gregory-nu-latn';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function use(locale, overrides = {}) {
  setDateConventions({
    ...getDateConventions(),
    locale,
    hour12: undefined,
    weekStart: 0,
    ...overrides,
  });
}

test('watch time keeps minutes under a day and matches web above it', () => {
  assert.equal(formatWatchTime(0), '0m');
  assert.equal(formatWatchTime(null), '0m');
  assert.equal(formatWatchTime(45 * MINUTE), '45m');
  assert.equal(formatWatchTime(5 * HOUR + 30 * MINUTE), '5h 30m');
  assert.equal(formatWatchTime(3 * DAY + 4 * HOUR + 59 * MINUTE), '3d 4h');
  assert.equal(formatWatchTime(377 * DAY + 4 * HOUR), '1yr 12d 4h');
});

test('axis labels carry the year once ticks sit a month apart', () => {
  use('en-US' + EXT);
  const start = new Date(2025, 8, 17);
  assert.equal(usesMonthLabels(start, new Date(2026, 8, 17)), true);
  assert.equal(usesMonthLabels(start, new Date(2025, 9, 17)), false);
  assert.equal(usesMonthLabels(null, null), false);
  assert.equal(formatAxisDate(start, true), 'Sep 25');
  assert.equal(formatAxisDate(start, false), 'Sep 17');
});

test('the readout shows the year for daily and weekly buckets and the hour for 6-hour ones', () => {
  use('en-US' + EXT);
  const date = new Date(2026, 8, 17, 18);
  assert.equal(formatReadoutDate(date, 'year'), 'Sep 17, 2026');
  assert.equal(formatReadoutDate(date, 'all'), 'Sep 17, 2026');
  assert.match(formatReadoutDate(date, 'week'), /^Sep 17, 6\sPM$/);
});

test('parses the Postgres text timestamps the server sends', () => {
  assert.equal(
    safeParseDate('2026-09-17 14:29:35.04+00')?.toISOString(),
    '2026-09-17T14:29:35.040Z'
  );
  assert.equal(
    safeParseDate('2026-09-17 20:00:00+05:30')?.toISOString(),
    '2026-09-17T14:30:00.000Z'
  );
  assert.equal(
    safeParseDate('2026-09-17T14:29:35.040Z')?.toISOString(),
    '2026-09-17T14:29:35.040Z'
  );
  assert.equal(safeParseDate(null), null);
  assert.equal(safeParseDate('not a date'), null);
});

test('bare chart days are local midnight and Postgres text parses', () => {
  const day = parseChartDate('2026-01-28');
  assert.equal(day?.getDate(), 28);
  assert.equal(day?.getHours(), 0);
  assert.equal(parseChartDate('2024-01-15 13:00:00+00')?.toISOString(), '2024-01-15T13:00:00.000Z');
  assert.equal(parseChartDate('nope'), null);
});

test('a pair counts only when it keeps the language and the region', () => {
  assert.equal(pairedLocale('en', 'DE'), 'en-DE');
  assert.equal(pairedLocale('de-DE', 'US'), undefined);
  assert.equal(pairedLocale('en', 'ZZ'), undefined);
});

test('the picked region wins, then the phone region, then the interface locale', () => {
  assert.equal(resolveFormatLocale('en', 'GB', 'DE'), 'en-GB' + EXT);
  assert.equal(resolveFormatLocale('de-DE', null, 'AT'), 'de-AT' + EXT);
  assert.equal(resolveFormatLocale('de-DE', null, 'US'), 'de-DE' + EXT);
  assert.equal(resolveFormatLocale('en', null, null), 'en' + EXT);
});

test('a picked region without data for the interface language falls back to the language of that country', () => {
  assert.equal(resolveFormatLocale('de-DE', 'BR', 'DE'), 'pt-BR' + EXT);
  assert.equal(resolveFormatLocale('en', 'ZZ', null), 'en' + EXT);
});

test('every offered region names the language CLDR gives that country', () => {
  for (const [region, language] of Object.entries(REGION_LANGUAGES)) {
    assert.equal(new Intl.Locale(`und-${region}`).maximize().language, language, region);
  }
});

test('an interface language with few regional variants still gets format choices', () => {
  const auto = resolveFormatLocale('de-DE', null, 'US');
  const samples = dateFormatChoices('de-DE', auto).map((choice) => choice.sample);
  assert.ok(samples.length > 3);
  assert.ok(samples.some((sample) => sample.startsWith('2026-05-17')));
});

test('format choices are distinct samples without the automatic one', () => {
  const auto = resolveFormatLocale('en', null, 'US');
  const samples = dateFormatChoices('en', auto).map((choice) => choice.sample);
  assert.equal(new Set(samples).size, samples.length);
  assert.ok(!samples.includes(formatSample(auto)));
  assert.ok(samples.includes('17/05/2026 · 17 May 2026'));
  assert.ok(samples.some((sample) => sample.startsWith('2026-05-17')));
});

test('dates use Gregorian years and Latin digits', () => {
  use('th-TH' + EXT);
  assert.match(formatDate(Date.UTC(2026, 4, 17, 12), { year: 'numeric', timeZone: 'UTC' }), /2026/);
  // iOS Hermes ignores nu-latn; an explicit Arabic numbering stands in for it here.
  use('ar-SA-u-nu-arab');
  assert.doesNotMatch(formatDate(Date.UTC(2026, 4, 17, 12), DATE_OPTIONS), /[٠-٩۰-۹]/);
});

test('the phone clock overrides the locale hour cycle', () => {
  use('en-US' + EXT, { hour12: false });
  assert.equal(formatHourOfDay(13), '13:00');
  assert.equal(is24HourClock(), true);
  use('en-GB' + EXT, { hour12: true });
  assert.match(formatHourOfDay(13), /^1\spm$/i);
  assert.equal(is24HourClock(), false);
});

test('weekdays rotate to the week start and missing days count zero', () => {
  use('en-US' + EXT, { weekStart: 1 });
  assert.deepEqual(orderedWeekdays(), [1, 2, 3, 4, 5, 6, 0]);
  assert.equal(weekdayName(0, 'short'), 'Sun');
  assert.equal(weekdayName(1, 'long'), 'Monday');
  const counts = weekdayCounts([
    { day: 0, count: 5 },
    { day: 3, count: 2 },
  ]);
  assert.deepEqual(
    counts.map((c) => c.day),
    [1, 2, 3, 4, 5, 6, 0]
  );
  assert.deepEqual(
    counts.map((c) => c.count),
    [0, 0, 2, 0, 0, 0, 5]
  );
  assert.deepEqual(
    weekdayCounts([{ day: 6, count: 1 }], 6).map((c) => c.day),
    [6, 0, 1, 2, 3, 4, 5]
  );
});

test('a stored quiet hours time becomes that wall clock time on the device', () => {
  const date = timeToDate('23:05');
  assert.equal(date.getHours(), 23);
  assert.equal(date.getMinutes(), 5);
});

test('a picked quiet hours time is stored zero padded and survives the round trip', () => {
  assert.equal(dateToTime(new Date(2026, 0, 1, 8, 0)), '08:00');
  assert.equal(dateToTime(new Date(2026, 0, 1, 0, 7)), '00:07');
  assert.equal(dateToTime(timeToDate('13:45')), '13:45');
});

test('the picker checks the row matching the format in effect, even when its country is not the one listed', () => {
  const auto = resolveFormatLocale('en', null, 'US');
  const choices = dateFormatChoices('en', auto);
  const effective = resolveFormatLocale('en', 'IE', 'US');
  const listed = choices.find((choice) => choice.sample === formatSample(effective));
  assert.ok(listed);
  assert.notEqual(listed.region, 'IE');
  assert.equal(checkedDateFormat(choices, auto, effective), listed.region);
  assert.equal(checkedDateFormat(choices, auto, auto), 'auto');
});
