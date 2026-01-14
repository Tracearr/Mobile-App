/**
 * Bottom sheet modal for mobile-optimized filtering
 * Uses @gorhom/bottom-sheet for native-feeling filter interface
 */
import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Pressable, ScrollView, StyleSheet, Image } from 'react-native';
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  X,
  Check,
  User,
  Monitor,
  Globe,
  Film,
  Tv,
  Music,
  Radio,
  Play,
  Zap,
  ChevronRight,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { colors, spacing, borderRadius } from '@/lib/theme';
import type { HistoryFilterOptions, UserFilterOption, FilterOptionItem } from '@tracearr/shared';

export type MediaType = 'movie' | 'episode' | 'track' | 'live';
export type TranscodeDecision = 'directplay' | 'copy' | 'transcode';

export interface FilterState {
  serverUserIds: string[];
  platforms: string[];
  geoCountries: string[];
  mediaTypes: MediaType[];
  transcodeDecisions: TranscodeDecision[];
}

interface FilterBottomSheetProps {
  filterOptions?: HistoryFilterOptions;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
}

export interface FilterBottomSheetRef {
  open: () => void;
  close: () => void;
}

type FilterSection = 'main' | 'users' | 'platforms' | 'countries';

const MEDIA_TYPES: { value: MediaType; label: string; icon: React.ElementType }[] = [
  { value: 'movie', label: 'Movies', icon: Film },
  { value: 'episode', label: 'TV Shows', icon: Tv },
  { value: 'track', label: 'Music', icon: Music },
  { value: 'live', label: 'Live TV', icon: Radio },
];

const TRANSCODE_OPTIONS: { value: TranscodeDecision; label: string; icon: React.ElementType }[] = [
  { value: 'directplay', label: 'Direct Play', icon: Play },
  { value: 'copy', label: 'Direct Stream', icon: Play },
  { value: 'transcode', label: 'Transcode', icon: Zap },
];

export const FilterBottomSheet = forwardRef<FilterBottomSheetRef, FilterBottomSheetProps>(
  ({ filterOptions, filters, onFiltersChange }, ref) => {
    const bottomSheetRef = useRef<BottomSheet>(null);
    const [activeSection, setActiveSection] = React.useState<FilterSection>('main');

    const snapPoints = useMemo(() => ['60%', '90%'], []);

    useImperativeHandle(ref, () => ({
      open: () => bottomSheetRef.current?.expand(),
      close: () => {
        setActiveSection('main');
        bottomSheetRef.current?.close();
      },
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />
      ),
      []
    );

    const handleSheetChange = useCallback((index: number) => {
      if (index === -1) {
        setActiveSection('main');
      }
    }, []);

    // Toggle functions
    const toggleUser = useCallback(
      (userId: string) => {
        const current = filters.serverUserIds;
        const updated = current.includes(userId)
          ? current.filter((id) => id !== userId)
          : [...current, userId];
        onFiltersChange({ ...filters, serverUserIds: updated });
      },
      [filters, onFiltersChange]
    );

    const toggleMediaType = useCallback(
      (type: MediaType) => {
        const current = filters.mediaTypes;
        const updated = current.includes(type)
          ? current.filter((t) => t !== type)
          : [...current, type];
        onFiltersChange({ ...filters, mediaTypes: updated });
      },
      [filters, onFiltersChange]
    );

    const toggleTranscode = useCallback(
      (decision: TranscodeDecision) => {
        const current = filters.transcodeDecisions;
        const updated = current.includes(decision)
          ? current.filter((d) => d !== decision)
          : [...current, decision];
        onFiltersChange({ ...filters, transcodeDecisions: updated });
      },
      [filters, onFiltersChange]
    );

    const togglePlatform = useCallback(
      (platform: string) => {
        const current = filters.platforms;
        const updated = current.includes(platform)
          ? current.filter((p) => p !== platform)
          : [...current, platform];
        onFiltersChange({ ...filters, platforms: updated });
      },
      [filters, onFiltersChange]
    );

    const toggleCountry = useCallback(
      (country: string) => {
        const current = filters.geoCountries;
        const updated = current.includes(country)
          ? current.filter((c) => c !== country)
          : [...current, country];
        onFiltersChange({ ...filters, geoCountries: updated });
      },
      [filters, onFiltersChange]
    );

    const clearAllFilters = useCallback(() => {
      onFiltersChange({
        serverUserIds: [],
        platforms: [],
        geoCountries: [],
        mediaTypes: [],
        transcodeDecisions: [],
      });
    }, [onFiltersChange]);

    const clearSection = useCallback(
      (section: 'users' | 'platforms' | 'countries') => {
        switch (section) {
          case 'users':
            onFiltersChange({ ...filters, serverUserIds: [] });
            break;
          case 'platforms':
            onFiltersChange({ ...filters, platforms: [] });
            break;
          case 'countries':
            onFiltersChange({ ...filters, geoCountries: [] });
            break;
        }
      },
      [filters, onFiltersChange]
    );

    const activeFilterCount = useMemo(() => {
      return (
        filters.serverUserIds.length +
        filters.platforms.length +
        filters.geoCountries.length +
        filters.mediaTypes.length +
        filters.transcodeDecisions.length
      );
    }, [filters]);

    // Sorted users alphabetically
    const sortedUsers = useMemo(() => {
      if (!filterOptions?.users) return [];
      return [...filterOptions.users].sort((a, b) => {
        const nameA = (a.identityName || a.username || '').toLowerCase();
        const nameB = (b.identityName || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }, [filterOptions?.users]);

    // Section list header with back button
    const renderSectionHeader = (title: string, section: 'users' | 'platforms' | 'countries') => {
      let count = 0;
      switch (section) {
        case 'users':
          count = filters.serverUserIds.length;
          break;
        case 'platforms':
          count = filters.platforms.length;
          break;
        case 'countries':
          count = filters.geoCountries.length;
          break;
      }

      return (
        <View style={styles.sectionHeader}>
          <Pressable onPress={() => setActiveSection('main')} style={styles.backButton}>
            <ChevronRight
              size={20}
              color={colors.text.primary.dark}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
          <Text style={styles.sectionTitle}>{title}</Text>
          {count > 0 && (
            <Pressable onPress={() => clearSection(section)} style={styles.clearSectionButton}>
              <Text style={styles.clearSectionText}>Clear ({count})</Text>
            </Pressable>
          )}
        </View>
      );
    };

    // User list item
    const renderUserItem = (user: UserFilterOption) => {
      const isSelected = filters.serverUserIds.includes(user.id);
      const displayName = user.identityName || user.username || 'Unknown';

      return (
        <Pressable
          key={user.id}
          onPress={() => toggleUser(user.id)}
          style={[styles.listItem, isSelected && styles.listItemSelected]}
        >
          <View style={styles.userAvatar}>
            {user.thumbUrl ? (
              <Image source={{ uri: user.thumbUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
          </View>
          <Text
            style={[styles.listItemText, isSelected && styles.listItemTextSelected]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isSelected && <Check size={18} color={colors.cyan.core} />}
        </Pressable>
      );
    };

    // Filter option item (platforms, countries)
    const renderFilterItem = (
      item: FilterOptionItem,
      isSelected: boolean,
      onToggle: () => void
    ) => (
      <Pressable
        key={item.value}
        onPress={onToggle}
        style={[styles.listItem, isSelected && styles.listItemSelected]}
      >
        <Text
          style={[styles.listItemText, isSelected && styles.listItemTextSelected]}
          numberOfLines={1}
        >
          {item.value}
        </Text>
        <View style={styles.listItemRight}>
          <Text style={styles.countBadge}>{item.count}</Text>
          {isSelected && <Check size={18} color={colors.cyan.core} />}
        </View>
      </Pressable>
    );

    // Main filter menu
    const renderMainMenu = () => (
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearAllFilters} style={styles.clearAllButton}>
              <X size={14} color={colors.text.muted.dark} />
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
          )}
        </View>

        {/* Sub-menu navigation items */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Filter by</Text>

          {/* Users */}
          <Pressable onPress={() => setActiveSection('users')} style={styles.menuItem}>
            <User size={18} color={colors.text.muted.dark} />
            <Text style={styles.menuItemText}>Users</Text>
            <View style={styles.menuItemRight}>
              {filters.serverUserIds.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{filters.serverUserIds.length}</Text>
                </View>
              )}
              <ChevronRight size={18} color={colors.text.muted.dark} />
            </View>
          </Pressable>

          {/* Platforms */}
          <Pressable onPress={() => setActiveSection('platforms')} style={styles.menuItem}>
            <Monitor size={18} color={colors.text.muted.dark} />
            <Text style={styles.menuItemText}>Platforms</Text>
            <View style={styles.menuItemRight}>
              {filters.platforms.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{filters.platforms.length}</Text>
                </View>
              )}
              <ChevronRight size={18} color={colors.text.muted.dark} />
            </View>
          </Pressable>

          {/* Countries */}
          <Pressable onPress={() => setActiveSection('countries')} style={styles.menuItem}>
            <Globe size={18} color={colors.text.muted.dark} />
            <Text style={styles.menuItemText}>Countries</Text>
            <View style={styles.menuItemRight}>
              {filters.geoCountries.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{filters.geoCountries.length}</Text>
                </View>
              )}
              <ChevronRight size={18} color={colors.text.muted.dark} />
            </View>
          </Pressable>
        </View>

        {/* Media Types - inline checkboxes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Media Type</Text>
          <View style={styles.checkboxGrid}>
            {MEDIA_TYPES.map(({ value, label, icon: Icon }) => {
              const isSelected = filters.mediaTypes.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() => toggleMediaType(value)}
                  style={[styles.checkboxItem, isSelected && styles.checkboxItemSelected]}
                >
                  <Icon size={16} color={isSelected ? colors.cyan.core : colors.text.muted.dark} />
                  <Text style={[styles.checkboxText, isSelected && styles.checkboxTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quality/Transcode - inline checkboxes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Quality</Text>
          <View style={styles.checkboxGrid}>
            {TRANSCODE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const isSelected = filters.transcodeDecisions.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() => toggleTranscode(value)}
                  style={[styles.checkboxItem, isSelected && styles.checkboxItemSelected]}
                >
                  <Icon size={16} color={isSelected ? colors.cyan.core : colors.text.muted.dark} />
                  <Text style={[styles.checkboxText, isSelected && styles.checkboxTextSelected]}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </BottomSheetScrollView>
    );

    // Users sub-menu
    const renderUsersSection = () => (
      <View style={styles.subSection}>
        {renderSectionHeader('Users', 'users')}
        <ScrollView contentContainerStyle={styles.listContent}>
          {sortedUsers.map(renderUserItem)}
          {sortedUsers.length === 0 && <Text style={styles.emptyText}>No users available</Text>}
        </ScrollView>
      </View>
    );

    // Platforms sub-menu
    const renderPlatformsSection = () => (
      <View style={styles.subSection}>
        {renderSectionHeader('Platforms', 'platforms')}
        <ScrollView contentContainerStyle={styles.listContent}>
          {filterOptions?.platforms?.map((item) =>
            renderFilterItem(item, filters.platforms.includes(item.value), () =>
              togglePlatform(item.value)
            )
          )}
          {(!filterOptions?.platforms || filterOptions.platforms.length === 0) && (
            <Text style={styles.emptyText}>No platforms available</Text>
          )}
        </ScrollView>
      </View>
    );

    // Countries sub-menu
    const renderCountriesSection = () => (
      <View style={styles.subSection}>
        {renderSectionHeader('Countries', 'countries')}
        <ScrollView contentContainerStyle={styles.listContent}>
          {filterOptions?.countries?.map((item) =>
            renderFilterItem(item, filters.geoCountries.includes(item.value), () =>
              toggleCountry(item.value)
            )
          )}
          {(!filterOptions?.countries || filterOptions.countries.length === 0) && (
            <Text style={styles.emptyText}>No countries available</Text>
          )}
        </ScrollView>
      </View>
    );

    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onChange={handleSheetChange}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        {activeSection === 'main' && renderMainMenu()}
        {activeSection === 'users' && renderUsersSection()}
        {activeSection === 'platforms' && renderPlatformsSection()}
        {activeSection === 'countries' && renderCountriesSection()}
      </BottomSheet>
    );
  }
);

FilterBottomSheet.displayName = 'FilterBottomSheet';

const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.surface.dark,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
  },
  handleIndicator: {
    backgroundColor: colors.border.dark,
    width: 40,
  },
  scrollContent: {
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearAllText: {
    fontSize: 13,
    color: colors.text.muted.dark,
  },
  section: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.muted.dark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary.dark,
    marginLeft: spacing.sm,
  },
  menuItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  badge: {
    backgroundColor: colors.cyan.core,
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.background.dark,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background.dark,
    borderWidth: 1,
    borderColor: colors.border.dark,
    gap: 6,
  },
  checkboxItemSelected: {
    borderColor: colors.cyan.core,
    backgroundColor: `${colors.cyan.core}15`,
  },
  checkboxText: {
    fontSize: 13,
    color: colors.text.muted.dark,
  },
  checkboxTextSelected: {
    color: colors.cyan.core,
  },
  // Sub-section styles
  subSection: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  backButton: {
    padding: spacing.xs,
    marginRight: spacing.xs,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary.dark,
  },
  clearSectionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  clearSectionText: {
    fontSize: 13,
    color: colors.cyan.core,
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.dark,
  },
  listItemSelected: {
    backgroundColor: `${colors.cyan.core}10`,
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text.primary.dark,
  },
  listItemTextSelected: {
    color: colors.cyan.core,
    fontWeight: '500',
  },
  listItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  countBadge: {
    fontSize: 12,
    color: colors.text.muted.dark,
    backgroundColor: colors.background.dark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  userAvatar: {
    marginRight: spacing.sm,
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.background.dark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.muted.dark,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.muted.dark,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
});
