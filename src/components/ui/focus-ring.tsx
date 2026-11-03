import { View } from 'react-native';
import { ACCENT_COLOR } from '@/lib/theme';

export function FocusRing({ radius = 0 }: { radius?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        borderRadius: radius,
        borderWidth: 2,
        borderColor: ACCENT_COLOR,
      }}
    />
  );
}
