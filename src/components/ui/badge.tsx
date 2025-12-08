import * as React from 'react';
import { View, type ViewProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const badgeVariants = cva('flex-row items-center rounded-full px-2.5 py-0.5', {
  variants: {
    variant: {
      default: 'bg-primary',
      secondary: 'bg-secondary',
      destructive: 'bg-destructive',
      outline: 'border border-border bg-transparent',
      success: 'bg-success/15',
      warning: 'bg-warning/15',
      danger: 'bg-danger/15',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

const badgeTextVariants = cva('text-xs font-semibold', {
  variants: {
    variant: {
      default: 'text-primary-foreground',
      secondary: 'text-secondary-foreground',
      destructive: 'text-destructive-foreground',
      outline: 'text-foreground',
      success: 'text-success',
      warning: 'text-warning',
      danger: 'text-danger',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

interface BadgeProps extends ViewProps, VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ className, variant, children, ...props }) => (
  <View className={cn(badgeVariants({ variant, className }))} {...props}>
    {typeof children === 'string' ? (
      <Text className={badgeTextVariants({ variant })}>{children}</Text>
    ) : (
      children
    )}
  </View>
);

export { Badge, badgeVariants, badgeTextVariants };
