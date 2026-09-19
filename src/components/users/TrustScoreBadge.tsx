import { TRUST_LEVEL_LABEL_KEYS, trustLevel, type TrustLevel } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge, badgeTextVariants } from '@/components/ui/badge';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

const TRUST_VARIANTS = {
  trusted: 'success',
  caution: 'warning',
  untrusted: 'danger',
} as const satisfies Record<TrustLevel, string>;

interface TrustScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  className?: string;
}

export function TrustScoreBadge({ score, showLabel = false, className }: TrustScoreBadgeProps) {
  const { t } = useTranslation(['common', 'mobile']);
  const level = trustLevel(score);
  const variant = TRUST_VARIANTS[level];
  const label = t(TRUST_LEVEL_LABEL_KEYS[level], { ns: 'common' });

  return (
    <Badge
      accessible
      accessibilityLabel={`${t('mobile:a11y.trustScore', { score })}, ${label}`}
      variant={variant}
      className={cn('gap-1', className)}
    >
      <Text className={badgeTextVariants({ variant })}>{score}</Text>
      {showLabel && <Text className={badgeTextVariants({ variant })}>· {label}</Text>}
    </Badge>
  );
}
