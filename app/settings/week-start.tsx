/**
 * Week Start Selection Screen
 * Automatic follows the phone's first day of the week. Persisted to device only.
 */
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { weekdayName, type WeekStartPref } from '@/lib/dateFormat';
import { phoneFirstWeekday, useDateConventions, useDateSettings } from '@/lib/dateSettings';

const FIXED_STARTS = [1, 0, 6] as const;

export default function WeekStartScreen() {
  const { t } = useTranslation(['settings']);
  useDateConventions();
  const weekStart = useDateSettings((s) => s.weekStart);
  const setWeekStart = useDateSettings((s) => s.setWeekStart);

  const rows: { value: WeekStartPref; label: string; sample: string | null }[] = [
    {
      value: 'auto',
      label: t('settings:general.automatic'),
      sample: weekdayName(phoneFirstWeekday(), 'long'),
    },
    ...FIXED_STARTS.map((day) => ({ value: day, label: weekdayName(day, 'long'), sample: null })),
  ];

  const handleSelect = (value: WeekStartPref) => {
    if (value === weekStart) return;
    setWeekStart(value);
    haptics.selection();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background.dark }} edges={['bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        <Card padding="none" className="overflow-hidden" accessibilityRole="radiogroup">
          {rows.map((row, index) => (
            <View key={row.value}>
              {index > 0 && <View className="bg-border ml-4 h-px" />}
              <Pressable
                onPress={() => handleSelect(row.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: row.value === weekStart }}
                className="min-h-11 flex-row items-center justify-between px-4 py-3.5"
              >
                <View className="flex-1">
                  <Text className="text-[15px] font-medium">{row.label}</Text>
                  {row.sample && (
                    <Text className="text-muted-foreground mt-0.5 text-xs">{row.sample}</Text>
                  )}
                </View>
                {row.value === weekStart && <Check size={20} color={ACCENT_COLOR} />}
              </Pressable>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
