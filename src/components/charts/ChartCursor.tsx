import { Circle, Line, vec } from '@shopify/react-native-skia';
import { useAnimatedReaction, useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import type { ChartBounds } from 'victory-native';
import { haptics } from '../../lib/haptics';
import { colors } from '../../lib/theme';

interface ChartCursorProps {
  x: SharedValue<number>;
  y: SharedValue<number>;
  index: SharedValue<number>;
  chartBounds: ChartBounds;
  color: string;
  radius: number;
}

/** Vertical line and dot at the pressed point. Mount it only while the press is active. */
export function ChartCursor({ x, y, index, chartBounds, color, radius }: ChartCursorProps) {
  const top = useDerivedValue(() => vec(x.value, chartBounds.top));
  const bottom = useDerivedValue(() => vec(x.value, chartBounds.bottom));

  useAnimatedReaction(
    () => index.value,
    (current, previous) => {
      if (current >= 0 && current !== previous) {
        scheduleOnRN(haptics.selection);
      }
    }
  );

  return (
    <>
      <Line p1={top} p2={bottom} color={colors.text.muted.dark} opacity={0.6} strokeWidth={1} />
      <Circle cx={x} cy={y} r={radius} color={color} />
    </>
  );
}
