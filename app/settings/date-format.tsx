/**
 * Date Format Selection Screen
 * Automatic follows the phone's region; the other rows are the distinct formats a picked country
 * gives, in the interface language where the phone has data for it. Persisted to device only.
 */
import { View, Pressable, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'lucide-react-native';
import { getCurrentLanguage, useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import {
  checkedDateFormat,
  dateFormatChoices,
  formatSample,
  resolveFormatLocale,
} from '@/lib/dateFormat';
import { phoneRegion, useDateConventions, useDateSettings } from '@/lib/dateSettings';

export default function DateFormatScreen() {
  const { t } = useTranslation(['settings']);
  const { locale } = useDateConventions();
  const dateRegion = useDateSettings((s) => s.dateRegion);
  const setDateRegion = useDateSettings((s) => s.setDateRegion);

  const language = getCurrentLanguage();
  const automaticLocale = resolveFormatLocale(language, null, phoneRegion());
  const choices = dateFormatChoices(language, automaticLocale);
  const selected = checkedDateFormat(choices, automaticLocale, locale);
  const rows = [
    {
      value: 'auto',
      label: t('settings:general.automatic'),
      sample: formatSample(automaticLocale),
    },
    ...choices.map((c) => ({ value: c.region, label: c.sample, sample: null })),
  ];

  const handleSelect = (value: string) => {
    if (value === dateRegion) return;
    setDateRegion(value);
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
                accessibilityState={{ checked: row.value === selected }}
                className="min-h-11 flex-row items-center justify-between px-4 py-3.5"
              >
                <View className="flex-1">
                  <Text className="text-[15px] font-medium">{row.label}</Text>
                  {row.sample && (
                    <Text className="text-muted-foreground mt-0.5 text-xs">{row.sample}</Text>
                  )}
                </View>
                {row.value === selected && <Check size={20} color={ACCENT_COLOR} />}
              </Pressable>
            </View>
          ))}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
