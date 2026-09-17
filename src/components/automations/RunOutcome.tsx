import { View } from 'react-native';
import type { RunOutcome as Outcome } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const OUTCOME = {
  completed: { dot: 'bg-primary', text: 'text-foreground' },
  stopped_by_condition: { dot: 'bg-muted-foreground', text: 'text-muted-foreground' },
  error: { dot: 'bg-danger', text: 'text-danger' },
} as const satisfies Record<Outcome, unknown>;

export function RunOutcome({ outcome, className }: { outcome: Outcome; className?: string }) {
  const { t } = useTranslation(['pages']);
  const { dot, text } = OUTCOME[outcome];

  return (
    <View className={cn('flex-row items-center gap-1.5', className)}>
      <View className={cn('h-2 w-2 rounded-full', dot)} />
      <Text className={cn('text-xs font-semibold', text)}>
        {t(`pages:automations.activity.outcomes.${outcome}`)}
      </Text>
    </View>
  );
}
