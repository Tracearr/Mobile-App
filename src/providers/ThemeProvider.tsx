/**
 * Theme provider with hue-based accent colors (matching web app)
 * Uses Colors API for dynamic Material 3 / iOS adaptive colors
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// Default accent hue (cyan = 187) - matches web app
const DEFAULT_ACCENT_HUE = 187;
const ACCENT_STORAGE_KEY = 'tracearr-accent-hue';

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

interface ThemeContextValue {
  isDark: boolean;
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme !== 'light'; // Default to dark
  const [accentHue, setAccentHueState] = useState(DEFAULT_ACCENT_HUE);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved accent hue on mount
  useEffect(() => {
    SecureStore.getItemAsync(ACCENT_STORAGE_KEY).then((stored) => {
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < 360) {
          setAccentHueState(parsed);
        }
      }
      setIsLoaded(true);
    });
  }, []);

  const setAccentHue = (hue: number) => {
    const normalizedHue = ((hue % 360) + 360) % 360;
    setAccentHueState(normalizedHue);
    SecureStore.setItemAsync(ACCENT_STORAGE_KEY, String(normalizedHue));
  };

  const accent = getAccentFromHue(accentHue);

  const value: ThemeContextValue = {
    isDark,
    accentHue,
    setAccentHue,
    accentColor: accent.core,
    accentColorDeep: accent.deep,
  };

  // Don't render until we've loaded the stored hue to prevent flash
  if (!isLoaded) return null;

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
