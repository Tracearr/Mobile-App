/**
 * Type-safe route constants for expo-router navigation
 * Eliminates 'as never' type assertions throughout the app
 */
import type { Href } from 'expo-router';

export const ROUTES = {
  // Auth
  PAIR: '/(auth)/pair' as Href,

  // Main tabs (group names never appear in URLs)
  TABS: '/(tabs)' as Href,
  DASHBOARD: '/' as Href,
  ACTIVITY: '/activity' as Href,
  USERS: '/users' as Href,
  HISTORY: '/history' as Href,

  // Detail screens
  USER: (id: string) => `/user/${id}` as Href,
  SESSION: (id: string) => `/session/${id}` as Href,
  VIOLATION: (id: string) => `/violation/${id}` as Href,

  // Other
  SETTINGS: '/settings' as Href,
  ALERTS: '/alerts' as Href,
  SERVER_SELECT: '/server-select' as Href,
} as const;
