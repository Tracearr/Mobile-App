/**
 * Type-safe route constants for expo-router navigation
 * Eliminates 'as never' type assertions throughout the app
 */
import type { Href } from 'expo-router';

export const ROUTES = {
  // Auth
  PAIR: '/(auth)/pair' as Href,

  // Main tabs
  TABS: '/(drawer)/(tabs)' as Href,
  DASHBOARD: '/(drawer)/(tabs)/index' as Href,
  ACTIVITY: '/(drawer)/(tabs)/tab-activity' as Href,
  USERS: '/(drawer)/(tabs)/tab-users' as Href,
  HISTORY: '/(drawer)/(tabs)/tab-history' as Href,

  // Detail screens
  USER: (id: string) => `/user/${id}` as Href,
  SESSION: (id: string) => `/session/${id}` as Href,
  VIOLATION: (id: string) => `/violation/${id}` as Href,

  // Other
  SETTINGS: '/settings' as Href,
  ALERTS: '/alerts' as Href,
} as const;
