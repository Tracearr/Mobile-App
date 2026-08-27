import { View } from 'react-native';
import type { GroupEvidence, ConditionEvidence } from '@tracearr/shared';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';

// Field and operator identifiers print raw: the web's label maps live in
// apps/web/src/lib/automations/conditionFields.ts, not in @tracearr/shared.
function valueText(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.map(valueText).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function ConditionLine({ condition }: { condition: ConditionEvidence }) {
  return (
    <View className="flex-row items-start justify-between gap-2 py-1">
      <Text className="flex-1 text-sm">
        {condition.field.replace(/_/g, ' ')} {condition.operator.replace(/_/g, ' ')}{' '}
        {valueText(condition.threshold)}
      </Text>
      <Text className="text-muted-foreground text-xs">{valueText(condition.actual)}</Text>
      <Badge variant={condition.matched ? 'destructive' : 'secondary'}>
        {condition.matched ? 'matched' : 'not matched'}
      </Badge>
    </View>
  );
}

export function EvidenceList({ groups }: { groups: GroupEvidence[] }) {
  return (
    <View className="gap-3">
      {groups.map((group) => (
        <View key={group.groupIndex} className="gap-1">
          <Text className="text-muted-foreground text-xs uppercase">
            Group {group.groupIndex + 1} · {group.match === 'any' ? 'any of' : 'all of'}
          </Text>
          {group.conditions.map((condition, i) => (
            <ConditionLine key={`${group.groupIndex}-${i}`} condition={condition} />
          ))}
        </View>
      ))}
    </View>
  );
}
