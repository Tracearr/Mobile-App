/**
 * The person's Date format and Week starts on choices, stored on this device only, and the work
 * of turning them plus the phone's own region, first weekday and clock into the conventions
 * dateFormat.ts formats with.
 */
import { AppState } from 'react-native';
import { getCalendars, getLocales } from 'expo-localization';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { getCurrentLanguage, i18n } from '@tracearr/translations/mobile';
import {
  getDateConventions,
  resolveFormatLocale,
  setDateConventions,
  type DateConventions,
  type DateRegion,
  type WeekStartPref,
  type Weekday,
} from './dateFormat';
import { zustandStorage } from './storage';

interface DateSettingsState {
  dateRegion: DateRegion;
  weekStart: WeekStartPref;
  setDateRegion: (region: DateRegion) => void;
  setWeekStart: (pref: WeekStartPref) => void;
}

export const useDateSettings = create<DateSettingsState>()(
  persist(
    (set) => ({
      dateRegion: 'auto',
      weekStart: 'auto',
      setDateRegion: (dateRegion) => set({ dateRegion }),
      setWeekStart: (weekStart) => set({ weekStart }),
    }),
    {
      name: 'tracearr_date_settings',
      storage: createJSONStorage(() => zustandStorage),
      partialize: ({ dateRegion, weekStart }) => ({ dateRegion, weekStart }),
    }
  )
);

const WEEK: readonly Weekday[] = [0, 1, 2, 3, 4, 5, 6];

const useConventionsStore = create(() => ({ conventions: getDateConventions() }));

/** The conventions in effect; the caller re-renders when they change. */
export function useDateConventions(): DateConventions {
  return useConventionsStore((s) => s.conventions);
}

export function phoneRegion(): string | null {
  return getLocales()[0]?.regionCode ?? null;
}

/** expo-localization numbers weekdays 1 = Sunday through 7 = Saturday on both platforms. */
export function phoneFirstWeekday(): Weekday {
  const firstWeekday = getCalendars()[0]?.firstWeekday;
  return firstWeekday ? (WEEK[firstWeekday - 1] ?? 0) : 0;
}

export function syncDateConventions(): void {
  const { dateRegion, weekStart } = useDateSettings.getState();
  const calendar = getCalendars()[0];
  const current = getDateConventions();
  const next: DateConventions = {
    locale: resolveFormatLocale(
      getCurrentLanguage(),
      dateRegion === 'auto' ? null : dateRegion,
      phoneRegion()
    ),
    hour12: calendar?.uses24hourClock == null ? undefined : !calendar.uses24hourClock,
    weekStart: weekStart === 'auto' ? phoneFirstWeekday() : weekStart,
    timeZone: calendar?.timeZone ?? current.timeZone,
  };
  if (
    next.locale === current.locale &&
    next.hour12 === current.hour12 &&
    next.weekStart === current.weekStart &&
    next.timeZone === current.timeZone
  ) {
    return;
  }
  setDateConventions(next);
  useConventionsStore.setState({ conventions: next });
}

syncDateConventions();

/** Follows the stored choices, the interface language and the phone's settings from here on. */
export function startDateConventionSync(): () => void {
  syncDateConventions();
  const stopSettings = useDateSettings.subscribe(syncDateConventions);
  const stopHydration = useDateSettings.persist.onFinishHydration(syncDateConventions);
  i18n.on('languageChanged', syncDateConventions);
  // The region, first weekday or clock may have changed in system settings while away.
  const appState = AppState.addEventListener('change', (status) => {
    if (status === 'active') syncDateConventions();
  });
  return () => {
    stopSettings();
    stopHydration();
    i18n.off('languageChanged', syncDateConventions);
    appState.remove();
  };
}
