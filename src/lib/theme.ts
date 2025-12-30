/**
 * Design system tokens matching Tracearr web app
 * These values match the web's dark mode theme exactly (shadcn neutral palette)
 *
 * HSL to Hex conversions from web globals.css:
 * - hsl(240 10% 4%)  = #09090B (background)
 * - hsl(0 0% 98%)    = #FAFAFA (foreground)
 * - hsl(240 4% 16%)  = #27272A (secondary/muted/border)
 * - hsl(240 5% 65%)  = #A1A1AA (muted-foreground)
 * - hsl(240 6% 10%)  = #18181B (surface/sidebar)
 */

export const colors = {
  // Brand colors (Tracearr identity - cyan accent hue 187)
  cyan: {
    core: '#18D1E7', // hsl(187 80% 50%) - primary accent
    deep: '#0EAFC8', // hsl(187 86% 42%) - hover/gradients
    dark: '#0A7C96', // hsl(187 85% 31%) - shadows/outlines
  },
  // Legacy blue panel colors - kept for gradual migration
  blue: {
    core: '#0B1A2E', // hsl(213 62% 11%)
    steel: '#162840', // hsl(213 47% 17%)
    soft: '#1E3A5C', // hsl(212 49% 24%)
  },

  // Background colors - shadcn neutral dark mode
  background: {
    dark: '#09090B', // hsl(240 10% 4%) - matches web --background
    light: '#FFFFFF', // hsl(0 0% 100%)
  },
  card: {
    dark: '#09090B', // hsl(240 10% 4%) - matches web --card (same as bg)
    light: '#FFFFFF', // hsl(0 0% 100%)
  },
  surface: {
    dark: '#18181B', // hsl(240 6% 10%) - matches web --sidebar
    light: '#F4F4F5', // hsl(240 5% 96%)
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
  danger: '#EF4444',
  info: '#3B82F6',

  // Switch/toggle colors
  switch: {
    trackOff: '#27272A', // matches border color
    trackOn: '#0EAFC8', // cyan-deep
    thumbOn: '#18D1E7', // cyan-core
    thumbOff: '#71717A', // zinc-500
  },

  // Text colors - shadcn neutral palette
  text: {
    // --color-foreground / --color-card-foreground
    primary: {
      dark: '#FAFAFA', // hsl(0 0% 98%) - matches web --foreground
      light: '#09090B', // hsl(240 10% 4%)
    },
    // --color-muted-foreground
    secondary: {
      dark: '#A1A1AA', // hsl(240 5% 65%) - matches web --muted-foreground
      light: '#71717A', // hsl(240 4% 46%)
    },
    muted: {
      dark: '#A1A1AA', // alias for secondary
      light: '#71717A',
    },
  },

  // Icon colors
  icon: {
    default: '#A1A1AA', // matches muted-foreground
    active: '#18D1E7', // cyan-core
    danger: '#EF4444', // matches destructive
  },

  // Border colors - shadcn neutral
  border: {
    dark: '#27272A', // hsl(240 4% 16%) - matches web --border
    light: '#E4E4E7', // hsl(240 6% 90%)
  },

  // Chart colors (matches web --chart-1 through --chart-5)
  chart: ['#18D1E7', '#0EAFC8', '#71717A', '#F59E0B', '#EF4444', '#22C55E'],
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

/**
 * Responsive breakpoints - matches global.css and optimized for mobile devices
 *
 * Device coverage:
 * - Base (0px):   Phone portrait - iPhone SE to iPhone 16 Pro Max (375-440px)
 * - sm (480px):   Phone landscape, large phones
 * - md (768px):   Tablet portrait - iPad Mini (744px), iPad (820px)
 * - lg (1024px):  Tablet landscape, iPad Pro, large tablets
 * - xl (1280px):  Extra large tablets in landscape
 */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;
export type DeviceSize = 'phone' | 'phoneLandscape' | 'tablet' | 'tabletLandscape' | 'desktop';

// Helper function to get theme-aware colors
export function getThemeColor(
  colorKey: 'background' | 'card' | 'surface' | 'border',
  isDark: boolean
): string {
  return colors[colorKey][isDark ? 'dark' : 'light'];
}

export function getTextColor(variant: 'primary' | 'secondary' | 'muted', isDark: boolean): string {
  return colors.text[variant][isDark ? 'dark' : 'light'];
}
