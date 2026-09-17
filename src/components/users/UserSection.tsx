import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react-native';
import { View, type ViewProps } from 'react-native';
import { Card } from '@/components/ui/card';
import { SectionHeader } from '@/components/ui/section-header';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface UserSectionProps extends ViewProps {
  icon: LucideIcon;
  title: string;
  /** Muted text on the right of the header, usually a count. */
  meta?: string;
  children: ReactNode;
}

export function UserSection({ icon, title, meta, children, ...props }: UserSectionProps) {
  return (
    <Card {...props}>
      <SectionHeader
        icon={icon}
        title={title}
        className="mb-1"
        right={meta ? <Text className="text-muted-foreground text-xs">{meta}</Text> : undefined}
      />
      {children}
    </Card>
  );
}

/** One row of a section list, with a divider above every row but the first. */
export function SectionRow({ isFirst, className, ...props }: ViewProps & { isFirst: boolean }) {
  return (
    <View className={cn('py-3', !isFirst && 'border-border border-t', className)} {...props} />
  );
}

export function SectionEmptyText({ children }: { children: string }) {
  return <Text className="text-muted-foreground py-4 text-center text-sm">{children}</Text>;
}

/** Shown in place of "load more" when no paged endpoint covers the rows on screen. */
export function SectionNote({ children }: { children: string }) {
  return <Text className="text-muted-foreground pt-3 text-center text-xs">{children}</Text>;
}
