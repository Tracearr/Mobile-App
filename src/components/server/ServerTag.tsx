import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

interface ServerTagProps {
  name?: string | null;
  color?: string | null;
  /** `sm` for list rows and card footers, `md` for a card header. */
  size?: 'sm' | 'md';
  className?: string;
}

export function ServerTag({ name, color, size = 'sm', className }: ServerTagProps) {
  if (!color && !name) return null;

  return (
    <View className={cn('flex-shrink flex-row items-center gap-1.5', className)}>
      {color ? (
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
      ) : null}
      {name ? (
        <Text
          numberOfLines={1}
          className={cn(
            'flex-shrink',
            size === 'md'
              ? 'text-secondary-foreground text-xs font-semibold'
              : 'text-muted-foreground text-[10px]'
          )}
        >
          {name}
        </Text>
      ) : null}
    </View>
  );
}
