import type { ViolationSeverity } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge } from '@/components/ui/badge';

const SEVERITY = {
  low: { variant: 'success', labelKey: 'common:severity.low' },
  warning: { variant: 'warning', labelKey: 'common:severity.warning' },
  high: { variant: 'danger', labelKey: 'common:severity.high' },
} as const satisfies Record<ViolationSeverity, unknown>;

export function SeverityBadge({
  severity,
  className,
}: {
  severity: ViolationSeverity;
  className?: string;
}) {
  const { t } = useTranslation(['common']);
  const { variant, labelKey } = SEVERITY[severity];

  return (
    <Badge variant={variant} className={className}>
      {t(labelKey)}
    </Badge>
  );
}
