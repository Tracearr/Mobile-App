/**
 * Design system tokens matching the Tracearr web app's dark mode
 * (tracearr docs/style-guide.md, apps/web/src/styles/globals.css).
 *
 * React Native cannot parse oklch(), and react-native-css drops oklch(var(--x)),
 * so every web value is written here and in global.css as the sRGB hex that
 * react-native-css compiles the literal to, which is also what Chrome renders.
 */

/**
 * Primary accent color - use for native components that need a color prop
 * (ActivityIndicator, charts, etc.) where Tailwind classes don't work.
 * For UI elements, prefer using className="bg-primary" or "text-primary".
 * Matches --color-primary in global.css
 */
export const ACCENT_COLOR = '#16C3DD'; // oklch(0.75 0.128 212)
export const ACCENT_FOREGROUND = '#071417'; // oklch(0.18 0.02 212)

// global.css is canonical for palette values; keep these in sync with it.
export const colors = {
  background: {
    dark: '#09090B', // hsl(240 10% 4%)
  },
  card: {
    dark: '#111113', // hsl(240 6% 7%)
  },
  // web --card-raised: anything nested in a card or sheet
  surface: {
    dark: '#18181B', // hsl(240 5% 10%)
  },

  // Status colors, never chart series
  success: '#61CB7C', // oklch(0.76 0.15 150)
  warning: '#F0B135', // oklch(0.8 0.15 80)
  error: '#F75D59', // oklch(0.68 0.19 25), web --destructive
  danger: '#F75D59',
  info: '#6DB0F4', // oklch(0.74 0.12 250)

  // Switch/toggle colors
  switch: {
    trackOff: '#27272A', // matches muted
    trackOn: '#0891B2',
    thumbOn: ACCENT_COLOR,
    thumbOff: '#71717A', // zinc-500
  },

  text: {
    // --color-foreground / --color-card-foreground
    primary: {
      dark: '#FAFAFA', // hsl(0 0% 98%)
    },
    // --color-muted-foreground
    secondary: {
      dark: '#A1A1AA', // hsl(240 5% 65%)
    },
    muted: {
      dark: '#A1A1AA', // alias for secondary
    },
  },

  icon: {
    default: '#A1A1AA', // matches muted-foreground
    active: ACCENT_COLOR,
    danger: '#F75D59',
  },

  border: {
    dark: '#2C2C30', // hsl(240 4% 18%)
  },

  // Categorical --color-chart-1 through --color-chart-8; one-series charts use ACCENT_COLOR
  chart: [
    '#65A7FA', // oklch(0.72 0.14 255) blue
    '#F99549', // oklch(0.76 0.15 55) orange
    '#E579C4', // oklch(0.72 0.16 340) magenta
    '#3EBFC6', // oklch(0.74 0.11 200) teal
    '#A689F1', // oklch(0.7 0.15 295) violet
    '#CBB94C', // oklch(0.78 0.13 100) olive
    '#5AC576', // oklch(0.74 0.15 150) green
    '#F16F7E', // oklch(0.7 0.16 15) rose
  ],
} as const;

/**
 * Add alpha channel to a hex color
 * @param color - Hex color string (e.g., '#EF4444')
 * @param alpha - Hex alpha value (e.g., '15' for ~8% opacity, '33' for 20%)
 */
export function withAlpha(color: string, alpha: string): string {
  return `${color}${alpha}`;
}

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
  md: 6,
  lg: 8,
  xl: 12,
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
 * Android window size classes, measured on the app window; below medium is compact.
 * https://developer.android.com/develop/ui/compose/layouts/adaptive/window-size-classes
 */
export const breakpoints = {
  medium: 600,
  expanded: 840,
  extraLarge: 1200,
} as const;

export const heightBreakpoints = {
  medium: 480,
} as const;

export const layout = {
  secondaryMaxWidth: 560,
} as const;
