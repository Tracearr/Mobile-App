import * as React from 'react';
import { View, type ViewProps, type Text as RNText, type TextProps } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Text } from './text';

const cardVariants = cva('border-border bg-card rounded-xl border', {
  variants: {
    padding: {
      default: 'p-4',
      compact: 'p-3',
      chart: 'p-2',
      none: 'p-0',
    },
  },
  defaultVariants: {
    padding: 'default',
  },
});

interface CardProps extends ViewProps, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<React.ComponentRef<typeof View>, CardProps>(
  ({ className, padding, ...props }, ref) => (
    <View ref={ref} className={cn(cardVariants({ padding }), className)} {...props} />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => <View ref={ref} className={cn('pb-2', className)} {...props} />
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<React.ComponentRef<typeof RNText>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} className={cn('text-lg font-semibold', className)} {...props} />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<React.ComponentRef<typeof RNText>, TextProps>(
  ({ className, ...props }, ref) => (
    <Text ref={ref} className={cn('text-muted-foreground text-sm', className)} {...props} />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => <View ref={ref} className={cn('pt-2', className)} {...props} />
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<React.ComponentRef<typeof View>, ViewProps>(
  ({ className, ...props }, ref) => (
    <View ref={ref} className={cn('flex-row items-center pt-4', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, cardVariants, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
