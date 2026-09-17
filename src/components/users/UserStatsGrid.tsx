import { View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { colors } from '@/lib/theme';

export interface UserStat {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

function StatCard({ icon: Icon, label, value }: UserStat) {
  return (
    <Card padding="compact" className="flex-1">
      <View className="mb-1 flex-row items-center gap-2">
        <Icon size={14} color={colors.text.muted.dark} />
        <Text className="text-muted-foreground text-xs" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Text className="text-xl font-bold" numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </Card>
  );
}

/** Four stats: one row on a tablet, two rows of two on a phone. */
export function UserStatsGrid({ stats, isTablet }: { stats: UserStat[]; isTablet: boolean }) {
  const rows = isTablet ? [stats] : [stats.slice(0, 2), stats.slice(2)];
  return (
    <View className="mb-4 gap-3">
      {rows.map((row) => (
        <View key={row[0]?.label} className="flex-row gap-3">
          {row.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </View>
      ))}
    </View>
  );
}
