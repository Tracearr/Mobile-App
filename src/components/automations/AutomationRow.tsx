import { View, Switch } from 'react-native';
import type { Automation, AutomationRunSummary } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { useSetAutomationActive } from '@/hooks';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { SeverityBadge } from '@/components/violations/SeverityBadge';
import { actionLabel, actionTypes, conditionCount, triggerSummary } from '@/lib/automations';
import { safeFormatDistanceToNow } from '@/lib/formatters';
import { haptics } from '@/lib/haptics';
import { colors } from '@/lib/theme';
import { AutomationKindBadge } from './AutomationKindBadge';
import { RunOutcome } from './RunOutcome';
import { useTranslate } from './useTranslate';

interface AutomationRowProps {
  automation: Automation;
  /** Newest run among the ones the feed has loaded; absent when none of them is this row's. */
  lastRun?: AutomationRunSummary;
}

export function AutomationRow({ automation, lastRun }: AutomationRowProps) {
  const { t } = useTranslation(['pages', 'mobile', 'common']);
  const translate = useTranslate();
  const toggle = useSetAutomationActive();
  // FlashList recycles this component, so a failure only counts for the row that caused it.
  const failed = toggle.isError && toggle.variables.id === automation.id;

  const conditions = conditionCount(automation);
  const actions = actionTypes(automation);
  const details = [
    ...(conditions > 0
      ? [
          t('mobile:automations.conditions', {
            count: conditions,
            defaultValue: '{{count}} conditions',
            defaultValue_one: '{{count}} condition',
            defaultValue_other: '{{count}} conditions',
          }),
        ]
      : []),
    ...(actions.length > 0
      ? actions.map((type) => actionLabel(type, translate))
      : [t('pages:automations.recordsOnly')]),
    ...(automation.enforceAcrossServers ? [t('pages:automations.scope.crossServer')] : []),
  ];

  const handleToggle = (isActive: boolean) => {
    haptics.selection();
    toggle.mutate({ id: automation.id, isActive }, { onError: () => haptics.error() });
  };

  return (
    <Card className="mb-3">
      <View className="flex-row items-start gap-3">
        <View className="flex-1 gap-1.5">
          <Text className="font-semibold" numberOfLines={2}>
            {automation.name}
          </Text>
          <View className="flex-row flex-wrap items-center gap-1.5">
            <AutomationKindBadge kind={automation.kind} />
            {automation.kind === 'policy' && automation.severity ? (
              <SeverityBadge severity={automation.severity} />
            ) : null}
          </View>
        </View>
        <Switch
          value={automation.isActive}
          onValueChange={handleToggle}
          disabled={toggle.isPending}
          hitSlop={8}
          accessibilityLabel={t('pages:automations.toggleAutomation', { name: automation.name })}
          trackColor={{ false: colors.switch.trackOff, true: colors.switch.trackOn }}
          thumbColor={automation.isActive ? colors.switch.thumbOn : colors.switch.thumbOff}
        />
      </View>

      <Text className="mt-3 text-sm">{triggerSummary(automation.triggers, translate)}</Text>
      <Text className="text-muted-foreground mt-1 text-xs">{details.join(' · ')}</Text>
      {automation.scopeRef ? (
        <Text className="text-muted-foreground mt-1 text-xs" numberOfLines={1}>
          {t('pages:automations.describe.appliesTo', { name: automation.scopeRef.name })}
        </Text>
      ) : null}

      {lastRun ? (
        <View className="border-border mt-3 flex-row items-center justify-between gap-2 border-t pt-3">
          <Text className="text-muted-foreground flex-shrink text-xs" numberOfLines={1}>
            {t('mobile:automations.lastRun', {
              when: safeFormatDistanceToNow(lastRun.startedAt, t('common:labels.unknown')),
              defaultValue: 'Last run {{when}}',
            })}
          </Text>
          <RunOutcome outcome={lastRun.outcome} />
        </View>
      ) : null}

      {failed ? (
        <Text
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          className="text-danger mt-3 text-xs font-medium"
        >
          {toggle.variables.isActive
            ? t('mobile:automations.turnOnFailed', {
                defaultValue: 'Could not turn this on. It is still off.',
              })
            : t('mobile:automations.turnOffFailed', {
                defaultValue: 'Could not turn this off. It is still on.',
              })}
        </Text>
      ) : null}
    </Card>
  );
}
