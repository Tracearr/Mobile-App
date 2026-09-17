import * as React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme';
import { Text } from './text';
import { Button } from './button';

export type EmptyStateTone = 'default' | 'success' | 'danger';

const TONES: Record<EmptyStateTone, { circle: string; icon: string }> = {
  default: { circle: 'bg-surface', icon: colors.icon.default },
  success: { circle: 'bg-success/15', icon: colors.success },
  danger: { circle: 'bg-danger/15', icon: colors.danger },
};

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onPress: () => void };
  tone?: EmptyStateTone;
  /** Sized for the inside of a Card instead of a whole screen or list. */
  compact?: boolean;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'default',
  compact = false,
  className,
}: EmptyStateProps) {
  const { circle, icon } = TONES[tone];

  return (
    <View className={cn('items-center px-6', compact ? 'py-6' : 'py-12', className)}>
      <View
        className={cn(
          'items-center justify-center rounded-full',
          compact ? 'mb-3 h-12 w-12' : 'mb-4 h-16 w-16',
          circle
        )}
      >
        <Icon size={compact ? 22 : 28} color={icon} />
      </View>
      <Text className={cn('text-center font-semibold', compact ? 'text-base' : 'text-lg')}>
        {title}
      </Text>
      {description ? (
        <Text className="text-muted-foreground mt-1 max-w-[280px] text-center text-sm">
          {description}
        </Text>
      ) : null}
      {action ? (
        <Button
          variant="outline"
          size={compact ? 'default' : 'lg'}
          hitSlop={compact ? 4 : undefined}
          className={compact ? 'mt-4' : 'mt-6'}
          onPress={action.onPress}
        >
          {action.label}
        </Button>
      ) : null}
    </View>
  );
}
