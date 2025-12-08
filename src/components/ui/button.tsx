import * as React from 'react';
import { Pressable, type PressableProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
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
      default: 'h-10 px-4 py-2',
      sm: 'h-9 px-3',
      lg: 'h-11 px-8',
      icon: 'h-10 w-10',
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

const Button = React.forwardRef<React.ComponentRef<typeof Pressable>, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => (
    <Pressable ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props}>
      {typeof children === 'string' ? (
        <Text className={cn(buttonTextVariants({ variant, size }))}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  )
);
Button.displayName = 'Button';

export { Button, buttonVariants, buttonTextVariants };
