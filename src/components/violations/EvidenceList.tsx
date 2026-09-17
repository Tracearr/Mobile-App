import { View } from 'react-native';
import { CheckCircle2, XCircle } from 'lucide-react-native';
import {
  CONDITION_FIELD_LABELS,
  OPERATOR_LABELS,
  formatConditionFieldValue,
  formatUserList,
} from '@tracearr/shared';
import type { GroupEvidence, ConditionEvidence, UnitSystem } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { colors } from '@/lib/theme';

interface EvidenceListProps {
  groups: GroupEvidence[];
  unitSystem: UnitSystem;
  /** Display names keyed by server-user id, for user_id conditions. */
  userNames: Record<string, string>;
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  return JSON.stringify(value);
}

function ConditionRow({
  condition,
  unitSystem,
  userNames,
}: {
  condition: ConditionEvidence;
  unitSystem: UnitSystem;
  userNames: Record<string, string>;
}) {
  const { t } = useTranslation(['pages', 'common']);
  const { field, operator, threshold, actual, matched, relatedSessionIds } = condition;
  const isUser = field === 'user_id';

  // A server newer than the installed translations can send a field or operator with no key.
  const label =
    field in CONDITION_FIELD_LABELS ? t(`pages:automations.fields.${field}.label`) : field;
  const operatorText =
    operator in OPERATOR_LABELS ? t(`pages:automations.operators.${operator}`) : operator;

  const { unit } = formatConditionFieldValue(Number(threshold), field, unitSystem);
  const display = (value: unknown) => {
    if (isUser && Array.isArray(value)) {
      return formatUserList(value.map(String), userNames);
    }
    if (isUser) return userNames[String(value)] ?? valueText(value);
    if (unit)
      return String(formatConditionFieldValue(Number(value), field, unitSystem).displayValue);
    return valueText(value);
  };
  const unitSuffix = unit ? ` ${unit}` : '';
  const actualText =
    actual === null || actual === undefined
      ? t('common:labels.unknown').toLowerCase()
      : `${display(actual)}${unitSuffix}`;

  return (
    <View className="flex-row items-start gap-3 py-2">
      <View className="mt-0.5">
        {matched ? (
          <CheckCircle2 size={16} color={colors.danger} />
        ) : (
          <XCircle size={16} color={colors.icon.default} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium">
          {label}{' '}
          <Text className="text-muted-foreground text-xs font-normal">
            {operatorText} {display(threshold)}
            {unitSuffix}
          </Text>
        </Text>
        <Text
          className={cn(
            'mt-0.5 text-sm',
            matched ? 'text-danger font-semibold' : 'text-muted-foreground'
          )}
        >
          {t('pages:violations.detail.actual')}: {actualText}
          {relatedSessionIds && relatedSessionIds.length > 0 ? (
            <Text className="text-muted-foreground text-xs font-normal">
              {' '}
              ({t('pages:violations.detail.relatedSessions', { count: relatedSessionIds.length })})
            </Text>
          ) : null}
        </Text>
      </View>
    </View>
  );
}

export function EvidenceList({ groups, unitSystem, userNames }: EvidenceListProps) {
  const { t } = useTranslation(['pages']);

  return (
    <View className="gap-3">
      {groups.map((group) => (
        <Card key={group.groupIndex}>
          <View className="mb-1 flex-row items-center justify-between gap-2">
            <Text className="flex-shrink text-sm font-semibold">
              {t('pages:violations.detail.conditionGroup', { index: group.groupIndex + 1 })}
            </Text>
            <Badge variant={group.matched ? 'destructive' : 'secondary'}>
              {t('pages:violations.detail.matched', {
                matched: group.conditions.filter((c) => c.matched).length,
                total: group.conditions.length,
              })}
            </Badge>
          </View>
          {group.conditions.map((condition, index) => (
            <View
              key={`${condition.field}-${index}`}
              className={index > 0 ? 'border-border border-t' : undefined}
            >
              <ConditionRow condition={condition} unitSystem={unitSystem} userNames={userNames} />
            </View>
          ))}
        </Card>
      ))}
    </View>
  );
}
