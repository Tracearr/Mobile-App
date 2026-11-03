import * as React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { useFocusRing } from '@/hooks/useFocusRing';
import { FocusRing } from './focus-ring';
import { Text } from './text';

const buttonVariants = cva('flex-row items-center justify-center rounded-md', {
  variants: {
    variant: {
      default: 'bg-primary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-transparent',
      secondary: 'bg-secondary',
      ghost: 'bg-transparent',
      link: 'bg-transparent',
    },
    size: {
      default: 'min-h-10 px-4 py-2',
      sm: 'min-h-9 px-3',
      lg: 'min-h-11 px-8',
      icon: 'min-h-10 min-w-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

const buttonTextVariants = cva('font-medium', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      secondary: 'text-secondary-foreground',
      ghost: 'text-foreground',
      link: 'text-primary underline',
    },
    size: {
      default: 'text-sm',
      sm: 'text-xs',
      lg: 'text-base',
      icon: 'text-sm',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

interface ButtonProps extends PressableProps, VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

// react-native-css inlines rem as 14 (global.css sets no root font size), so
// every Tailwind size step is 3.5 dp and these sizes render at 35, 31.5, 38.5
// and 35 dp. Each slop was checked at every integer dpi from 240 to 640, with
// the height floored or rounded to a pixel and the slop truncated per side as
// Android does, and reaches 48 dp at all of them. Other sites that size for
// 48 dp refer here.
const DEFAULT_HIT_SLOP = {
  default: { top: 8, bottom: 8 },
  sm: { top: 10, bottom: 10 },
  lg: { top: 6, bottom: 6 },
  icon: { top: 8, bottom: 8, left: 8, right: 8 },
} as const;

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  ({ className, variant, size, children, onFocus, onBlur, hitSlop, ...props }, ref) => {
    const ring = useFocusRing();
    return (
      <Pressable
        ref={ref}
        accessibilityRole="button"
        accessibilityState={{ disabled: props.disabled === true }}
        className={cn(buttonVariants({ variant, size, className }))}
        hitSlop={hitSlop ?? DEFAULT_HIT_SLOP[size ?? 'default']}
        {...props}
        onFocus={(event) => {
          ring.onFocus();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          ring.onBlur();
          onBlur?.(event);
        }}
      >
        {typeof children === 'string' ? (
          <Text className={cn(buttonTextVariants({ variant, size }))}>{children}</Text>
        ) : (
          children
        )}
        {ring.focused && <FocusRing radius={6} />}
      </Pressable>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants };
