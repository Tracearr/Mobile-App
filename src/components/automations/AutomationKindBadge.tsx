import type { AutomationKind } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge } from '@/components/ui/badge';

const KIND_VARIANT = {
  policy: 'default',
  notification: 'outline',
} as const satisfies Record<AutomationKind, unknown>;

export function AutomationKindBadge({ kind }: { kind: AutomationKind }) {
  const { t } = useTranslation(['pages']);

  return <Badge variant={KIND_VARIANT[kind]}>{t(`pages:automations.kind.${kind}`)}</Badge>;
}
