/**
 * Type-safe route constants for expo-router navigation
 * Eliminates 'as never' type assertions throughout the app
 */
import type { Href } from 'expo-router';

export const ROUTES = {
  // Auth
  PAIR: '/(auth)/pair',

  // The generated route table has no bare '/(tabs)', only group-qualified paths.
  TABS: '/(tabs)/(dashboard)',
  DASHBOARD: '/',
  ACTIVITY: '/activity',
  USERS: '/users',
  HISTORY: '/history',

  // Detail screens
  // Dynamic segments widen to `string`, which the route table's
  // SingleRoutePart will not accept, so these stay cast.
  USER: (id: string) => `/user/${id}` as Href,
  SESSION: (id: string) => `/session/${id}` as Href,
  VIOLATION: (id: string) => `/violation/${id}` as Href,

  // Other
  SETTINGS: '/settings',
  ALERTS: '/alerts',
  SERVER_SELECT: '/server-select',
} as const;
