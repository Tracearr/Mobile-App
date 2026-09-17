import type { AutomationKind } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Badge } from '@/components/ui/badge';

const KIND_VARIANT = {
  policy: 'default',
  notification: 'outline',
} as const satisfies Record<AutomationKind, unknown>;

export function AutomationKindBadge({ kind }: { kind: AutomationKind }) {
  const { t } = useTranslation(['mobile']);

  // Web labels these Violation and Alert. Here Alerts is also a screen, so the
  // schema's own kind names are used instead.
  const label =
    kind === 'policy'
      ? t('mobile:automations.kind.policy', { defaultValue: 'Policy' })
      : t('mobile:automations.kind.notification', { defaultValue: 'Notification' });

  return <Badge variant={KIND_VARIANT[kind]}>{label}</Badge>;
}
