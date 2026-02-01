/**
 * Timezone utilities for mobile app
 * Uses expo-localization for reliable device timezone detection
 */
import * as Localization from 'expo-localization';

/**
 * Get the device's IANA timezone identifier.
 *
 * Uses expo-localization which is more reliable than Intl.DateTimeFormat
 * on React Native with Hermes engine (which may incorrectly return 'UTC').
 *
 * @returns IANA timezone string (e.g., 'America/Los_Angeles') or 'UTC' as fallback
 */
export function getDeviceTimezone(): string {
  try {
    const calendars = Localization.getCalendars();
    const timezone = calendars[0]?.timeZone;
    if (timezone) {
      return timezone;
    }
  } catch {
    // Fall through to fallback
  }

  // Fallback to Intl API (may not work correctly on Hermes)
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
