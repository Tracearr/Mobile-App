/**
 * Design system tokens matching Tracearr web app
 */

export const colors = {
  // Brand colors (from Tracearr web)
  cyan: {
    core: '#18D1E7',
    deep: '#0EAFC8',
    dark: '#0A7C96',
  },
  blue: {
    core: '#0B1A2E',
    steel: '#162840',
    soft: '#1E3A5C',
  },

  // Background colors
  background: {
    dark: '#050A12',
    light: '#F9FAFB',
  },
  card: {
    dark: '#0B1A2E',
    light: '#FFFFFF',
  },
  surface: {
    dark: '#0F2338',
    light: '#F3F4F6',
  },

  // Accent colors
  orange: {
    core: '#F97316',
  },
  purple: '#8B5CF6',

  // Status colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Switch/toggle colors
  switch: {
    trackOff: '#27272A',
    trackOn: '#0EAFC8',
    thumbOn: '#18D1E7',
    thumbOff: '#71717A',
  },

  // Text colors
  text: {
    primary: {
      dark: '#FFFFFF',
      light: '#0B1A2E',
    },
    secondary: {
      dark: '#94A3B8',
      light: '#64748B',
    },
    muted: {
      dark: '#64748B',
      light: '#94A3B8',
    },
  },

  // Border colors
  border: {
    dark: '#1E3A5C',
    light: '#E5E7EB',
  },

  // Chart colors
  chart: ['#18D1E7', '#0EAFC8', '#1E3A5C', '#F59E0B', '#EF4444', '#22C55E'],
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const typography = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 5,
  },
} as const;

// Helper function to get theme-aware colors
export function getThemeColor(
  colorKey: 'background' | 'card' | 'surface' | 'border',
  isDark: boolean
): string {
  return colors[colorKey][isDark ? 'dark' : 'light'];
}

export function getTextColor(
  variant: 'primary' | 'secondary' | 'muted',
  isDark: boolean
): string {
  return colors.text[variant][isDark ? 'dark' : 'light'];
}
