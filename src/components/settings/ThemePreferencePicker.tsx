/**
 * Theme preference picker (System/Light/Dark)
 */
import { View, Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme, type ThemePreference } from '@/providers/ThemeProvider';
import { colors } from '@/lib/theme';

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemePreferencePicker() {
  const { themePreference, setThemePreference, accentColor } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.border.dark,
          borderRadius: 10,
          padding: 4,
        }}
      >
        {THEME_OPTIONS.map((option) => {
          const isSelected = themePreference === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setThemePreference(option.value)}
              style={{
                flex: 1,
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 8,
                alignItems: 'center',
                backgroundColor: isSelected ? accentColor : 'transparent',
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: isSelected ? '#0d1117' : colors.text.primary.dark,
                }}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontSize: 12, color: colors.text.muted.dark }}>
        System follows your device settings
      </Text>
    </View>
  );
}
