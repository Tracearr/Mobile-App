import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { breakpoints } from '@/lib/theme';

type Breakpoint = 'sm' | 'md' | 'lg' | 'xl';
type DeviceSize = 'phone' | 'phoneLandscape' | 'tablet' | 'tabletLandscape' | 'desktop';

/**
 * Responsive design utilities for React Native
 *
 * Uses useWindowDimensions for runtime responsiveness (updates on rotation,
 * split-screen, foldables). Complements NativeWind's build-time breakpoints.
 *
 * @example
 * const { isTablet, columns, deviceSize } = useResponsive();
 *
 * return (
 *   <View style={{ flexDirection: isTablet ? 'row' : 'column' }}>
 *     {items.map(item => (
 *       <View style={{ width: `${100 / columns}%` }}>
 *         <Card item={item} />
 *       </View>
 *     ))}
 *   </View>
 * );
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isLandscape = width > height;

    // Breakpoint checks (mobile-first: true if >= breakpoint)
    const isSm = width >= breakpoints.sm;
    const isMd = width >= breakpoints.md;
    const isLg = width >= breakpoints.lg;
    const isXl = width >= breakpoints.xl;

    // Device classification
    const isPhone = width < breakpoints.md;
    const isTablet = width >= breakpoints.md;
    const isLargeTablet = width >= breakpoints.lg;

    // Semantic device size
    let deviceSize: DeviceSize;
    if (width >= breakpoints.xl) {
      deviceSize = 'desktop';
    } else if (width >= breakpoints.lg) {
      deviceSize = 'tabletLandscape';
    } else if (width >= breakpoints.md) {
      deviceSize = 'tablet';
    } else if (width >= breakpoints.sm) {
      deviceSize = 'phoneLandscape';
    } else {
      deviceSize = 'phone';
    }

    // Grid column helpers for common layouts
    const columns = {
      // Stats grid: 2 on phone, 4 on tablet+
      stats: isTablet ? 4 : 2,
      // Card grid: 1 on phone, 2 on tablet, 3 on large tablet
      cards: isLargeTablet ? 3 : isTablet ? 2 : 1,
      // List grid: 1 on phone, 2 on tablet+
      list: isTablet ? 2 : 1,
      // Chart grid: 1 on phone, 2 on tablet+
      charts: isTablet ? 2 : 1,
    };

    // Spacing multipliers for larger screens
    const spacingMultiplier = isLargeTablet ? 1.5 : isTablet ? 1.25 : 1;

    // Font size multipliers for better readability on tablets
    const fontSizeMultiplier = isLargeTablet ? 1.1 : 1;

    return {
      // Raw dimensions
      width,
      height,
      isLandscape,

      // Breakpoint flags (mobile-first)
      isSm,
      isMd,
      isTablet: isMd, // Alias for clarity
      isLg,
      isLargeTablet: isLg, // Alias for clarity
      isXl,

      // Device classification
      isPhone,
      deviceSize,

      // Layout helpers
      columns,
      spacingMultiplier,
      fontSizeMultiplier,

      // Responsive value selector
      select: <T>(options: { base: T; sm?: T; md?: T; lg?: T; xl?: T }): T => {
        if (isXl && options.xl !== undefined) return options.xl;
        if (isLg && options.lg !== undefined) return options.lg;
        if (isMd && options.md !== undefined) return options.md;
        if (isSm && options.sm !== undefined) return options.sm;
        return options.base;
      },
    };
  }, [width, height]);
}

/**
 * Get current breakpoint name
 */
export function useCurrentBreakpoint(): Breakpoint | 'base' {
  const { width } = useWindowDimensions();

  if (width >= breakpoints.xl) return 'xl';
  if (width >= breakpoints.lg) return 'lg';
  if (width >= breakpoints.md) return 'md';
  if (width >= breakpoints.sm) return 'sm';
  return 'base';
}

/**
 * Check if screen width is at or above a specific breakpoint
 */
export function useBreakpoint(breakpoint: Breakpoint): boolean {
  const { width } = useWindowDimensions();
  return width >= breakpoints[breakpoint];
}
