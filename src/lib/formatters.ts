/**
 * Shared formatting utilities for dates, durations, and time display
 * Centralizes duplicated logic from multiple components
 */
import { formatDistanceToNow, format } from 'date-fns';

/**
 * Safely parse a date that might be a Date object, string, null, or undefined
 * Returns null for invalid dates
 */
export function safeParseDate(date: Date | string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Safely format a date with a format string
 * Returns fallback string for invalid dates
 */
export function safeFormatDate(
  date: Date | string | null | undefined,
  formatStr: string,
  fallback = 'Unknown'
): string {
  const parsed = safeParseDate(date);
  if (!parsed) return fallback;
  return format(parsed, formatStr);
}

/**
 * Safely format distance to now with suffix
 * Returns fallback string for invalid dates
 */
export function safeFormatDistanceToNow(
  date: Date | string | null | undefined,
  fallback = 'Unknown'
): string {
  const parsed = safeParseDate(date);
  if (!parsed) return fallback;
  return formatDistanceToNow(parsed, { addSuffix: true });
}

/**
 * Format duration in milliseconds to human-readable string
 * Supports multiple output formats
 */
export function formatDuration(
  ms: number | null,
  options: { style?: 'compact' | 'full' | 'clock' } = {}
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

    case 'compact':
    default:
      // "2h 30m" format
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m`;
      return '<1m';
  }
}

/**
 * Format a timestamp for display in lists
 * Shows "Today 2:30 PM", "Yesterday 9:15 AM", or "Jan 12, 2:30 PM"
 */
export function formatListTimestamp(date: Date | string | null | undefined): string {
  const parsed = safeParseDate(date);
  if (!parsed) return '-';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const timeStr = format(parsed, 'h:mm a');

  if (dateOnly.getTime() === today.getTime()) {
    return `Today ${timeStr}`;
  }
  if (dateOnly.getTime() === yesterday.getTime()) {
    return `Yesterday ${timeStr}`;
  }
  return format(parsed, 'MMM d, h:mm a');
}
