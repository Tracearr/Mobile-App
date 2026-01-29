/**
 * Accent color picker matching web app's theme customization
 */
import { View, Pressable } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { Text } from '@/components/ui/text';
import { useTheme, ACCENT_PRESETS } from '@/providers/ThemeProvider';
import { colors } from '@/lib/theme';

export function AccentColorPicker() {
  const { accentHue, setAccentHue } = useTheme();

  return (
    <View style={{ gap: 12 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.primary.dark }}>
        Accent Color
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {ACCENT_PRESETS.map((preset) => {
          const isSelected = Math.abs(accentHue - preset.hue) < 10;
          return (
            <Pressable
              key={preset.name}
              onPress={() => setAccentHue(preset.hue)}
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: preset.hex,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: isSelected ? 3 : 0,
                borderColor: colors.text.primary.dark,
              }}
            >
              {isSelected && (
                <SymbolView name="checkmark" tintColor="white" style={{ width: 20, height: 20 }} />
              )}
            </Pressable>
          );
        })}
      </View>
      <Text style={{ fontSize: 12, color: colors.text.muted.dark }}>
        Changes apply immediately across the app
      </Text>
    </View>
  );
}
