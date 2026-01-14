/**
 * History filters component - compact filter bar with bottom sheet trigger
 * Mobile-optimized design with time range picker, search, and filter button
 */
import React, { useCallback, useEffect, useState } from 'react';
import { View, Pressable, StyleSheet, TextInput } from 'react-native';
import { Search, X, SlidersHorizontal } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { colors, spacing, borderRadius } from '@/lib/theme';

export type TimePeriod = '7d' | '30d' | '90d' | '1y' | 'all';
export type MediaType = 'movie' | 'episode' | 'track' | 'live';
export type TranscodeDecision = 'directplay' | 'copy' | 'transcode';

interface HistoryFiltersProps {
  period: TimePeriod;
  onPeriodChange: (period: TimePeriod) => void;
  search: string;
  onSearchChange: (search: string) => void;
  activeFilterCount: number;
  onFilterPress: () => void;
}

const PERIODS: { value: TimePeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

function TimeRangePicker({
  value,
  onChange,
}: {
  value: TimePeriod;
  onChange: (value: TimePeriod) => void;
}) {
  return (
    <View style={styles.periodContainer}>
      {PERIODS.map((period) => {
        const isSelected = value === period.value;
        return (
          <Pressable
            key={period.value}
            onPress={() => onChange(period.value)}
            style={[styles.periodButton, isSelected && styles.periodButtonSelected]}
          >
            <Text style={[styles.periodText, isSelected && styles.periodTextSelected]}>
              {period.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
  const [localSearch, setLocalSearch] = useState(search);

  // Sync with external search value
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

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
    <View style={styles.container}>
      {/* Time Range Picker */}
      <TimeRangePicker value={period} onChange={onPeriodChange} />

      {/* Search and Filter Row */}
      <View style={styles.searchRow}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={16} color={colors.text.muted.dark} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search titles, users..."
            placeholderTextColor={colors.text.muted.dark}
            value={localSearch}
            onChangeText={setLocalSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {localSearch.length > 0 && (
            <Pressable onPress={handleClearSearch} style={styles.clearButton}>
              <X size={14} color={colors.text.muted.dark} />
            </Pressable>
          )}
        </View>

        {/* Filter Button */}
        <Pressable onPress={onFilterPress} style={styles.filterButton}>
          <SlidersHorizontal size={18} color={colors.text.primary.dark} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  periodContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.lg,
    padding: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  periodButtonSelected: {
    backgroundColor: colors.card.dark,
  },
  periodText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.muted.dark,
  },
  periodTextSelected: {
    color: colors.text.primary.dark,
  },
  searchRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchIcon: {
    marginRight: spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary.dark,
    paddingVertical: 0,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface.dark,
    borderRadius: borderRadius.md,
    width: 44,
    height: 40,
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: colors.cyan.core,
    borderRadius: borderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.background.dark,
  },
});
