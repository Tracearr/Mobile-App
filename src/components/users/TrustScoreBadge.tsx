import { useTranslation } from '@tracearr/translations/mobile';
import { Badge, badgeTextVariants } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const TRUST_LEVELS = [
  { min: 80, variant: 'success', labelKey: 'common:trust.trusted' },
  { min: 50, variant: 'warning', labelKey: 'common:trust.caution' },
  { min: -Infinity, variant: 'danger', labelKey: 'common:trust.untrusted' },
] as const;

interface TrustScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function TrustScoreBadge({ score, showLabel = false, className }: TrustScoreBadgeProps) {
  const { t } = useTranslation(['common', 'mobile']);
  const level = TRUST_LEVELS.find((l) => score >= l.min) ?? TRUST_LEVELS[2];
  const label = t(level.labelKey);

  return (
    <Badge
      accessible
      accessibilityLabel={`${t('mobile:a11y.trustScore', { score })}, ${label}`}
      variant={level.variant}
      className={cn('gap-1', className)}
    >
      <Text className={badgeTextVariants({ variant: level.variant })}>{score}</Text>
      {showLabel && (
        <Text className={badgeTextVariants({ variant: level.variant })}>· {label}</Text>
      )}
    </Badge>
  );
}
