/**
 * Glass effect wrapper component
 * Uses iOS 26+ liquid glass when available, falls back to semi-transparent bg
 */
import { View, type ViewProps } from 'react-native';
import type { ReactNode, ComponentType } from 'react';

type GlassStyle = 'clear' | 'regular';
type GlassColorScheme = 'auto' | 'light' | 'dark';

type GlassViewNativeProps = {
  glassEffectStyle?: GlassStyle;
  tintColor?: string;
  isInteractive?: boolean;
  colorScheme?: GlassColorScheme;
  children?: ReactNode;
} & ViewProps;

// Conditional import - expo-glass-effect may not be available on all platforms
let GlassViewComponent: ComponentType<GlassViewNativeProps> | null = null;
let isGlassEffectAPIAvailable: (() => boolean) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const glassModule = require('expo-glass-effect');
  GlassViewComponent = glassModule.GlassView;
  isGlassEffectAPIAvailable = glassModule.isGlassEffectAPIAvailable;
} catch {
  // expo-glass-effect not available
}

interface GlassCardProps extends ViewProps {
  /** Glass blur intensity */
  intensity?: 'regular' | 'clear';
  /** Children to render inside the glass card */
  children: ReactNode;
}

/**
 * Card with liquid glass effect on iOS 26+
 * Falls back to semi-transparent background on unsupported platforms
 */
export function GlassCard({
  intensity = 'regular',
  children,
  className,
  ...props
}: GlassCardProps) {
  // Check if glass effect is available at runtime
  const glassAvailable = isGlassEffectAPIAvailable?.() ?? false;

  if (glassAvailable && GlassViewComponent) {
    return (
      <GlassViewComponent
        glassEffectStyle={intensity}
        colorScheme="auto"
        className={className}
        {...props}
      >
        {children}
      </GlassViewComponent>
    );
  }

  // Fallback for unsupported platforms
  return (
    <View className={`bg-card/90 ${className ?? ''}`} {...props}>
      {children}
    </View>
  );
}

/**
 * Check if glass effects are available on this device
 */
export function useGlassAvailable(): boolean {
  return isGlassEffectAPIAvailable?.() ?? false;
}
