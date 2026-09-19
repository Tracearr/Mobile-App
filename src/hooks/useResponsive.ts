import { useWindowDimensions } from 'react-native';
import { useMemo } from 'react';
import { breakpoints, heightBreakpoints, spacing } from '@/lib/theme';

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isMedium = width >= breakpoints.medium;
    const isExpanded = width >= breakpoints.expanded;
    const isExtraLarge = width >= breakpoints.extraLarge;

    return {
      isTablet: isMedium,
      isCompactHeight: height < heightBreakpoints.medium,
      horizontalPadding: isExpanded ? spacing.xl : isMedium ? spacing.lg : spacing.md,
      columns: {
        cards: isExpanded ? 3 : isMedium ? 2 : 1,
      },
      select: <T>(options: { compact: T; medium?: T; expanded?: T; extraLarge?: T }): T => {
        if (isExtraLarge && options.extraLarge !== undefined) return options.extraLarge;
        if (isExpanded && options.expanded !== undefined) return options.expanded;
        if (isMedium && options.medium !== undefined) return options.medium;
        return options.compact;
      },
    };
  }, [width, height]);
}
