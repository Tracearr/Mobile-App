import { View, Pressable } from 'react-native';
import { useRecyclingState } from '@shopify/flash-list';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { Automation, AutomationRunSummary } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { SeverityBadge } from '@/components/violations/SeverityBadge';
import { runSummary, runWhere, runWho, triggerSummary } from '@/lib/automations';
import { safeFormatDate, safeFormatDistanceToNow } from '@/lib/formatters';
import { colors } from '@/lib/theme';
import { AutomationKindBadge } from './AutomationKindBadge';
import { RunOutcome } from './RunOutcome';
import { useTranslate } from './useTranslate';

interface RunRowProps {
  run: AutomationRunSummary;
  /** The automation as it stands now, when the list has it; a deleted one leaves only its name. */
  automation?: Automation;
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-3">
      <Text className="text-muted-foreground w-24 text-xs">{label}</Text>
      <Text className="flex-1 text-xs">{value}</Text>
    </View>
  );
}

export function RunRow({ run, automation }: RunRowProps) {
  const { t } = useTranslation(['pages', 'common']);
  const translate = useTranslate();
  const [expanded, setExpanded] = useRecyclingState(false, [run.id]);

  const unknown = t('common:labels.unknown');
  const summary = runSummary(run, translate);
  const who = runWho(run.subject);
  const where = runWhere(run.subject);
  const when = safeFormatDistanceToNow(run.startedAt, unknown);
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      accessibilityLabel={[
        run.automationName,
        t(`pages:automations.activity.outcomes.${run.outcome}`),
        when,
        summary,
      ].join(', ')}
      className="active:opacity-80"
    >
      <Card className="mb-3">
        <View className="flex-row items-center justify-between gap-2">
          <RunOutcome outcome={run.outcome} />
          <View className="flex-row items-center gap-1.5">
            <Text className="text-muted-foreground text-xs">{when}</Text>
            <Chevron size={16} color={colors.icon.default} />
          </View>
        </View>

        <Text className="mt-2 font-semibold" numberOfLines={expanded ? undefined : 1}>
          {run.automationName}
        </Text>
        <Text
          className="text-muted-foreground mt-0.5 text-sm"
          numberOfLines={expanded ? undefined : 1}
        >
          {summary}
        </Text>
        {!expanded && (who || where) ? (
          <Text className="text-muted-foreground mt-1 text-xs" numberOfLines={1}>
            {[who, where].filter(Boolean).join(' · ')}
          </Text>
        ) : null}

        {expanded ? (
          <View className="border-border mt-3 gap-2 border-t pt-3">
            <View className="flex-row flex-wrap items-center gap-1.5">
              <AutomationKindBadge kind={run.kind} />
              {run.severity ? <SeverityBadge severity={run.severity} /> : null}
            </View>
            {automation ? (
              <DetailLine
                label={t('pages:automations.filters.trigger')}
                value={triggerSummary(automation.triggers, translate)}
              />
            ) : null}
            {who ? <DetailLine label={t('pages:automations.activity.who')} value={who} /> : null}
            {where ? (
              <DetailLine label={t('pages:automations.activity.where')} value={where} />
            ) : null}
            <DetailLine
              label={t('pages:automations.activity.started')}
              value={safeFormatDate(run.startedAt, 'PPpp', unknown)}
            />
            {run.finishedAt ? (
              <DetailLine
                label={t('pages:automations.activity.finished')}
                value={safeFormatDate(run.finishedAt, 'PPpp', unknown)}
              />
            ) : null}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}
