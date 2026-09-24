/**
 * Hook to load fonts for chart axis labels
 * Uses @shopify/react-native-skia's useFont with Inter font
 */
import { useFont } from '@shopify/react-native-skia';

const InterMedium = require('../../../assets/fonts/Inter_500Medium.ttf') as number;

export function useChartFont(size: number = 10) {
  const font = useFont(InterMedium, size);
  return font;
}
