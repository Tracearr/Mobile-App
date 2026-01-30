/**
 * Theme provider using NativeWind's VariableContextProvider for runtime theming
 * Supports system/light/dark theme preference and user-configurable accent colors
 */
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { VariableContextProvider, useColorScheme } from 'nativewind';
import * as SecureStore from 'expo-secure-store';

// Default accent hue (cyan = 187) - matches web app
const DEFAULT_ACCENT_HUE = 187;
const ACCENT_STORAGE_KEY = 'tracearr-accent-hue';
const THEME_PREFERENCE_KEY = 'tracearr-theme-preference';

// Theme preference options
export type ThemePreference = 'system' | 'light' | 'dark';

// Preset accent colors with their hue values (matches web app)
export const ACCENT_PRESETS = [
  { name: 'Cyan', hue: 187, hex: '#18D1E7' },
  { name: 'Blue', hue: 220, hex: '#3B82F6' },
  { name: 'Purple', hue: 270, hex: '#8B5CF6' },
  { name: 'Pink', hue: 330, hex: '#EC4899' },
  { name: 'Red', hue: 0, hex: '#EF4444' },
  { name: 'Orange', hue: 24, hex: '#EA580C' },
  { name: 'Green', hue: 150, hex: '#22C55E' },
  { name: 'Teal', hue: 175, hex: '#14B8A6' },
] as const;

// Dark theme colors (shadcn neutral dark mode)
const darkTheme = {
  '--background': '#09090B',
  '--foreground': '#FAFAFA',
  '--card': '#09090B',
  '--card-foreground': '#FAFAFA',
  '--surface': '#18181B',
  '--popover': '#09090B',
  '--popover-foreground': '#FAFAFA',
  '--muted': '#27272A',
  '--muted-foreground': '#A1A1AA',
  '--primary': '#18D1E7',
  '--primary-foreground': '#18181B',
  '--secondary': '#27272A',
  '--secondary-foreground': '#FAFAFA',
  '--accent': '#27272A',
  '--accent-foreground': '#FAFAFA',
  '--input': '#27272A',
  '--ring': '#18D1E7',
  '--border': '#27272A',
  '--destructive': '#DC2626',
  '--destructive-foreground': '#FAFAFA',
  '--success': '#22C55E',
  '--warning': '#F59E0B',
  '--danger': '#DC2626',
  '--icon': '#A1A1AA',
  '--icon-active': '#18D1E7',
  '--icon-danger': '#FF6666',
  '--chart-1': '#18D1E7',
  '--chart-2': '#5DD3E4',
  '--chart-3': '#6B8A99',
  '--chart-4': '#D4A745',
  '--chart-5': '#D95555',
};

// Light theme colors (shadcn neutral light mode)
const lightTheme = {
  '--background': '#FFFFFF',
  '--foreground': '#09090B',
  '--card': '#FFFFFF',
  '--card-foreground': '#09090B',
  '--surface': '#F4F4F5',
  '--popover': '#FFFFFF',
  '--popover-foreground': '#09090B',
  '--muted': '#F4F4F5',
  '--muted-foreground': '#71717A',
  '--primary': '#0891B2',
  '--primary-foreground': '#FFFFFF',
  '--secondary': '#F4F4F5',
  '--secondary-foreground': '#18181B',
  '--accent': '#F4F4F5',
  '--accent-foreground': '#18181B',
  '--input': '#E4E4E7',
  '--ring': '#0891B2',
  '--border': '#E4E4E7',
  '--destructive': '#DC2626',
  '--destructive-foreground': '#FFFFFF',
  '--success': '#22C55E',
  '--warning': '#F59E0B',
  '--danger': '#DC2626',
  '--icon': '#71717A',
  '--icon-active': '#0891B2',
  '--icon-danger': '#DC2626',
  '--chart-1': '#0891B2',
  '--chart-2': '#22D3EE',
  '--chart-3': '#3F3F46',
  '--chart-4': '#CA8A04',
  '--chart-5': '#DC2626',
};

interface ThemeContextValue {
  isDark: boolean;
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  accentHue: number;
  setAccentHue: (hue: number) => void;
  accentColor: string;
  accentColorDeep: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Convert HSL to Hex
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generate accent color from hue (matches web app logic)
 */
function getAccentFromHue(hue: number): { core: string; deep: string } {
  return {
    core: hslToHex(hue, 80, 50), // Vibrant accent
    deep: hslToHex(hue, 86, 42), // Darker for hover/gradients
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  // eslint-disable-next-line @typescript-eslint/no-deprecated -- NativeWind's useColorScheme provides setColorScheme
  const colorSchemeResult = useColorScheme();
  const { colorScheme } = colorSchemeResult;
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>('system');
  const [accentHue, setAccentHueState] = useState(DEFAULT_ACCENT_HUE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Stable wrapper for setColorScheme to avoid unbound-method lint errors
  const applyColorScheme = useCallback(
    (scheme: 'light' | 'dark') => {
      colorSchemeResult.setColorScheme(scheme);
    },
    [colorSchemeResult]
  );

  // Load saved preferences on mount
  useEffect(() => {
    void Promise.all([
      SecureStore.getItemAsync(ACCENT_STORAGE_KEY),
      SecureStore.getItemAsync(THEME_PREFERENCE_KEY),
    ]).then(([storedHue, storedTheme]) => {
      if (storedHue) {
        const parsed = parseInt(storedHue, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < 360) {
          setAccentHueState(parsed);
        }
      }
      if (storedTheme && ['system', 'light', 'dark'].includes(storedTheme)) {
        setThemePreferenceState(storedTheme as ThemePreference);
        // Apply non-system preference immediately
        if (storedTheme === 'light' || storedTheme === 'dark') {
          applyColorScheme(storedTheme);
        }
      }
      setIsLoaded(true);
    });
  }, [applyColorScheme]);

  // Sync explicit theme preference with NativeWind's color scheme
  // When preference is 'system', let NativeWind follow the system setting
  useEffect(() => {
    if (!isLoaded) return;
    if (themePreference !== 'system') {
      applyColorScheme(themePreference);
    }
  }, [themePreference, isLoaded, applyColorScheme]);

  // Determine actual dark mode based on preference and system setting
  const isDark =
    themePreference === 'system'
      ? colorScheme !== 'light' // Default to dark if system preference unclear
      : themePreference === 'dark';

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    void SecureStore.setItemAsync(THEME_PREFERENCE_KEY, preference);
  };

  const setAccentHue = (hue: number) => {
    const normalizedHue = ((hue % 360) + 360) % 360;
    setAccentHueState(normalizedHue);
    void SecureStore.setItemAsync(ACCENT_STORAGE_KEY, String(normalizedHue));
  };

  const accent = getAccentFromHue(accentHue);

  const value: ThemeContextValue = {
    isDark,
    themePreference,
    setThemePreference,
    accentHue,
    setAccentHue,
    accentColor: accent.core,
    accentColorDeep: accent.deep,
  };

  // Don't render until we've loaded the stored preferences to prevent flash
  if (!isLoaded) return null;

  // Select theme based on isDark
  const themeVars = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext value={value}>
      <VariableContextProvider value={themeVars}>{children}</VariableContextProvider>
    </ThemeContext>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
