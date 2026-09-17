import { View, Pressable, ActivityIndicator } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { ACCENT_COLOR } from '@/lib/theme';

interface LoadMoreButtonProps {
  onPress: () => void;
  isLoading: boolean;
}

export function LoadMoreButton({ onPress, isLoading }: LoadMoreButtonProps) {
  const { t } = useTranslation(['common']);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, disabled: isLoading }}
      className="min-h-11 items-center justify-center active:opacity-70"
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={ACCENT_COLOR} />
      ) : (
        <View className="flex-row items-center gap-1">
          <Text className="text-primary text-sm font-medium">{t('common:labels.loadMore')}</Text>
          <ChevronRight size={16} color={ACCENT_COLOR} />
        </View>
      )}
    </Pressable>
  );
}
