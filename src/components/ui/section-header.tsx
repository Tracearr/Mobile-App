import * as React from 'react';
import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { cn } from '@/lib/utils';
import { ACCENT_COLOR } from '@/lib/theme';
import { Text } from './text';

export interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  right?: React.ReactNode;
  className?: string;
}

export function SectionHeader({ title, icon: Icon, right, className }: SectionHeaderProps) {
  return (
    <View className={cn('mb-3 flex-row items-center justify-between gap-2', className)}>
      <View className="flex-1 flex-row items-center gap-2">
        {Icon ? <Icon size={18} color={ACCENT_COLOR} /> : null}
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="text-muted-foreground flex-shrink text-sm font-semibold tracking-wide uppercase"
        >
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}
