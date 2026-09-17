/**
 * History filters component - compact filter bar with bottom sheet trigger
 * Mobile-optimized design with time range picker, search, and filter button
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, TextInput } from 'react-native';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { colors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { useTranslation } from '@tracearr/translations/mobile';

// Web's TimeRangePicker presets, and the values /stats takes as `period`.
export type TimePeriod = 'week' | 'month' | 'year' | 'all';

interface HistoryFiltersProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  search: string;
  onSearchChange: (search: string) => void;
  activeFilterCount: number;
  onFilterPress: () => void;
}

export function TimeRangePicker({
  value,
  onChange,
}: {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
}) {
  const { t } = useTranslation(['common']);

  return (
    <SegmentedControl
      accessibilityLabel={t('common:periods.timeRange', { defaultValue: 'Time range' })}
      value={value}
      onChange={(next) => {
        if (next === value) return;
        haptics.selection();
        onChange(next);
      }}
      options={[
        {
          value: 'week',
          label: t('common:periods.short7Days', { defaultValue: '7d' }),
          accessibilityLabel: t('common:periods.last7Days'),
        },
        {
          value: 'month',
          label: t('common:periods.short30Days', { defaultValue: '30d' }),
          accessibilityLabel: t('common:periods.last30Days'),
        },
        {
          value: 'year',
          label: t('common:periods.shortYear', { defaultValue: '1y' }),
          accessibilityLabel: t('common:periods.lastYear'),
        },
        {
          value: 'all',
          label: t('common:periods.shortAll', { defaultValue: 'All' }),
          accessibilityLabel: t('common:time.allTime'),
        },
      ]}
    />
  );
}

export function HistoryFilters({
  period,
  onPeriodChange,
  search,
  onSearchChange,
  activeFilterCount,
  onFilterPress,
}: HistoryFiltersProps) {
  const { t } = useTranslation(['common', 'mobile']);
  const [localSearch, setLocalSearch] = useState(search);

  // Sync with external search value
  const [prevSearch, setPrevSearch] = useState(search);
  if (search !== prevSearch) {
    setPrevSearch(search);
    setLocalSearch(search);
  }

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [localSearch, search, onSearchChange]);

  const handleClearSearch = useCallback(() => {
    setLocalSearch('');
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <View className="mb-4 gap-2">
      <TimeRangePicker value={period} onChange={onPeriodChange} />

      <View className="flex-row gap-2">
        <View className="border-border bg-card h-11 flex-1 flex-row items-center rounded-lg border px-2">
          <Search size={16} color={colors.text.muted.dark} className="mr-1" />
          <TextInput
            className="text-foreground flex-1 py-0 text-sm"
            placeholder={t('common:search.searchTitles')}
            placeholderTextColor={colors.text.muted.dark}
            accessibilityLabel={t('common:actions.search')}
            value={localSearch}
            onChangeText={setLocalSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {localSearch.length > 0 && (
            <Pressable
              onPress={handleClearSearch}
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
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel={
            activeFilterCount > 0
              ? t('mobile:a11y.filtersActive', {
                  count: activeFilterCount,
                  defaultValue: 'Filters, {{count}} active',
                })
              : t('common:labels.filters')
          }
          className="border-border bg-card h-11 w-11 items-center justify-center rounded-lg border"
        >
          <SlidersHorizontal size={18} color={colors.text.primary.dark} />
          {activeFilterCount > 0 && (
            <View className="bg-primary absolute top-1 right-1 min-w-4 items-center justify-center rounded-full px-1">
              <Text className="text-primary-foreground text-[10px] font-bold">
                {activeFilterCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
