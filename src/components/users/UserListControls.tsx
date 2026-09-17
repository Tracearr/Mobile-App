import { View, Pressable, TextInput } from 'react-native';
import { Search, X, ArrowDownWideNarrow, ArrowUpNarrowWide } from 'lucide-react-native';
import type { UserSortField } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { colors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';

interface UserListControlsProps {
  search: string;
  onSearchChange: (search: string) => void;
  orderBy: UserSortField;
  orderDir: 'asc' | 'desc';
  onOrderByChange: (orderBy: UserSortField) => void;
  onToggleOrderDir: () => void;
}

/** Same rows and sizes as HistoryFilters: a segmented control, then search beside one button. */
export function UserListControls({
  search,
  onSearchChange,
  orderBy,
  orderDir,
  onOrderByChange,
  onToggleOrderDir,
}: UserListControlsProps) {
  const { t } = useTranslation(['common', 'mobile']);
  const DirectionIcon = orderDir === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow;

  return (
    <View className="mb-4 gap-2">
      <SegmentedControl
        accessibilityLabel={t('common:actions.sort')}
        value={orderBy}
        onChange={(next) => {
          if (next === orderBy) return;
          haptics.selection();
          onOrderByChange(next);
        }}
        options={[
          { value: 'username', label: t('common:labels.name') },
          {
            value: 'trustScore',
            label: t('mobile:users.sortTrust', { defaultValue: 'Trust' }),
            accessibilityLabel: t('common:labels.trustScore'),
          },
          { value: 'joinedAt', label: t('common:labels.joined') },
          {
            value: 'lastActivityAt',
            label: t('mobile:users.sortActive', { defaultValue: 'Active' }),
            accessibilityLabel: t('common:labels.lastActivity'),
          },
        ]}
      />

      <View className="flex-row gap-2">
        <View className="border-border bg-card h-11 flex-1 flex-row items-center rounded-lg border px-2">
          <Search size={16} color={colors.text.muted.dark} className="mr-1" />
          <TextInput
            className="text-foreground flex-1 py-0 text-sm"
            placeholder={t('common:search.searchUsers')}
            placeholderTextColor={colors.text.muted.dark}
            accessibilityLabel={t('common:actions.search')}
            value={search}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <Pressable
              onPress={() => onSearchChange('')}
              accessibilityRole="button"
              accessibilityLabel={t('common:filters.clearSearch')}
              hitSlop={11}
              className="p-1"
            >
              <X size={14} color={colors.text.muted.dark} />
            </Pressable>
          )}
        </View>

        <Pressable
          onPress={() => {
            haptics.selection();
            onToggleOrderDir();
          }}
          accessibilityRole="button"
          accessibilityLabel={
            orderDir === 'asc'
              ? t('mobile:a11y.sortAscending', { defaultValue: 'Sorted ascending, tap to reverse' })
              : t('mobile:a11y.sortDescending', {
                  defaultValue: 'Sorted descending, tap to reverse',
                })
          }
          className="border-border bg-card h-11 w-11 items-center justify-center rounded-lg border"
        >
          <DirectionIcon size={18} color={colors.text.primary.dark} />
        </Pressable>
      </View>
    </View>
  );
}
