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
import { useTheme } from '@/providers/ThemeProvider';
import { colors } from '@/lib/theme';
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
    const { accentColor } = useTheme();
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
        <View className="border-border flex-row items-center border-b px-4 py-4">
          <Pressable onPress={() => setActiveSection('main')} className="mr-1 p-1">
            <ChevronRight
              size={20}
              className="text-foreground"
              style={{ transform: [{ rotate: '180deg' }] }}
            />
          </Pressable>
          <Text className="flex-1 text-lg font-semibold">{title}</Text>
          {count > 0 && (
            <Pressable onPress={() => clearSection(section)} className="px-2 py-1">
              <Text className="text-[13px]" style={{ color: accentColor }}>
                Clear ({count})
              </Text>
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
          className={`border-border flex-row items-center border-b py-3 ${isSelected ? '' : ''}`}
          style={isSelected ? { backgroundColor: `${accentColor}10` } : undefined}
        >
          <View className="mr-2">
            {user.thumbUrl ? (
              <Image source={{ uri: user.thumbUrl }} className="h-8 w-8 rounded-full" />
            ) : (
              <View className="bg-background h-8 w-8 items-center justify-center rounded-full">
                <Text className="text-muted-foreground text-sm font-semibold">
                  {displayName[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </View>
          <Text
            className={`flex-1 text-[15px] ${isSelected ? 'font-medium' : ''}`}
            style={isSelected ? { color: accentColor } : undefined}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {isSelected && <Check size={18} color={accentColor} />}
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
        className="border-border flex-row items-center border-b py-3"
        style={isSelected ? { backgroundColor: `${accentColor}10` } : undefined}
      >
        <Text
          className={`flex-1 text-[15px] ${isSelected ? 'font-medium' : ''}`}
          style={isSelected ? { color: accentColor } : undefined}
          numberOfLines={1}
        >
          {item.value}
        </Text>
        <View className="flex-row items-center gap-2">
          <Text className="bg-background text-muted-foreground rounded-full px-2 py-0.5 text-xs">
            {item.count}
          </Text>
          {isSelected && <Check size={18} color={accentColor} />}
        </View>
      </Pressable>
    );

    // Main filter menu
    const renderMainMenu = () => (
      <BottomSheetScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View className="border-border flex-row items-center justify-between border-b px-4 pt-2 pb-4">
          <Text className="text-lg font-semibold">Filters</Text>
          {activeFilterCount > 0 && (
            <Pressable onPress={clearAllFilters} className="flex-row items-center gap-1 px-2 py-1">
              <X size={14} className="text-muted-foreground" />
              <Text className="text-muted-foreground text-[13px]">Clear all</Text>
            </Pressable>
          )}
        </View>

        {/* Sub-menu navigation items */}
        <View className="px-4 pt-4">
          <Text className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Filter by
          </Text>

          {/* Users */}
          <Pressable
            onPress={() => setActiveSection('users')}
            className="border-border flex-row items-center border-b py-3.5"
          >
            <User size={18} className="text-muted-foreground" />
            <Text className="ml-2 flex-1 text-[15px]">Users</Text>
            <View className="flex-row items-center gap-2">
              {filters.serverUserIds.length > 0 && (
                <View
                  className="min-w-[22px] items-center rounded-full px-2 py-0.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Text className="text-background text-xs font-semibold">
                    {filters.serverUserIds.length}
                  </Text>
                </View>
              )}
              <ChevronRight size={18} className="text-muted-foreground" />
            </View>
          </Pressable>

          {/* Platforms */}
          <Pressable
            onPress={() => setActiveSection('platforms')}
            className="border-border flex-row items-center border-b py-3.5"
          >
            <Monitor size={18} className="text-muted-foreground" />
            <Text className="ml-2 flex-1 text-[15px]">Platforms</Text>
            <View className="flex-row items-center gap-2">
              {filters.platforms.length > 0 && (
                <View
                  className="min-w-[22px] items-center rounded-full px-2 py-0.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Text className="text-background text-xs font-semibold">
                    {filters.platforms.length}
                  </Text>
                </View>
              )}
              <ChevronRight size={18} className="text-muted-foreground" />
            </View>
          </Pressable>

          {/* Countries */}
          <Pressable
            onPress={() => setActiveSection('countries')}
            className="border-border flex-row items-center border-b py-3.5"
          >
            <Globe size={18} className="text-muted-foreground" />
            <Text className="ml-2 flex-1 text-[15px]">Countries</Text>
            <View className="flex-row items-center gap-2">
              {filters.geoCountries.length > 0 && (
                <View
                  className="min-w-[22px] items-center rounded-full px-2 py-0.5"
                  style={{ backgroundColor: accentColor }}
                >
                  <Text className="text-background text-xs font-semibold">
                    {filters.geoCountries.length}
                  </Text>
                </View>
              )}
              <ChevronRight size={18} className="text-muted-foreground" />
            </View>
          </Pressable>
        </View>

        {/* Media Types - inline checkboxes */}
        <View className="px-4 pt-4">
          <Text className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Media Type
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {MEDIA_TYPES.map(({ value, label, icon: Icon }) => {
              const isSelected = filters.mediaTypes.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() => toggleMediaType(value)}
                  className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${isSelected ? '' : 'border-border bg-background'}`}
                  style={
                    isSelected
                      ? { borderColor: accentColor, backgroundColor: `${accentColor}15` }
                      : undefined
                  }
                >
                  <Icon size={16} color={isSelected ? accentColor : colors.text.muted.dark} />
                  <Text
                    className={`text-[13px] ${isSelected ? '' : 'text-muted-foreground'}`}
                    style={isSelected ? { color: accentColor } : undefined}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Quality/Transcode - inline checkboxes */}
        <View className="px-4 pt-4">
          <Text className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Quality
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {TRANSCODE_OPTIONS.map(({ value, label, icon: Icon }) => {
              const isSelected = filters.transcodeDecisions.includes(value);
              return (
                <Pressable
                  key={value}
                  onPress={() => toggleTranscode(value)}
                  className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${isSelected ? '' : 'border-border bg-background'}`}
                  style={
                    isSelected
                      ? { borderColor: accentColor, backgroundColor: `${accentColor}15` }
                      : undefined
                  }
                >
                  <Icon size={16} color={isSelected ? accentColor : colors.text.muted.dark} />
                  <Text
                    className={`text-[13px] ${isSelected ? '' : 'text-muted-foreground'}`}
                    style={isSelected ? { color: accentColor } : undefined}
                  >
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
      <View className="flex-1">
        {renderSectionHeader('Users', 'users')}
        <ScrollView contentContainerStyle={styles.listContent}>
          {sortedUsers.map(renderUserItem)}
          {sortedUsers.length === 0 && (
            <Text className="text-muted-foreground py-8 text-center text-sm">
              No users available
            </Text>
          )}
        </ScrollView>
      </View>
    );

    // Platforms sub-menu
    const renderPlatformsSection = () => (
      <View className="flex-1">
        {renderSectionHeader('Platforms', 'platforms')}
        <ScrollView contentContainerStyle={styles.listContent}>
          {filterOptions?.platforms?.map((item) =>
            renderFilterItem(item, filters.platforms.includes(item.value), () =>
              togglePlatform(item.value)
            )
          )}
          {(!filterOptions?.platforms || filterOptions.platforms.length === 0) && (
            <Text className="text-muted-foreground py-8 text-center text-sm">
              No platforms available
            </Text>
          )}
        </ScrollView>
      </View>
    );

    // Countries sub-menu
    const renderCountriesSection = () => (
      <View className="flex-1">
        {renderSectionHeader('Countries', 'countries')}
        <ScrollView contentContainerStyle={styles.listContent}>
          {filterOptions?.countries?.map((item) =>
            renderFilterItem(item, filters.geoCountries.includes(item.value), () =>
              toggleCountry(item.value)
            )
          )}
          {(!filterOptions?.countries || filterOptions.countries.length === 0) && (
            <Text className="text-muted-foreground py-8 text-center text-sm">
              No countries available
            </Text>
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

// Keep StyleSheet for bottom sheet specific styling
const styles = StyleSheet.create({
  bottomSheetBackground: {
    backgroundColor: colors.surface.dark,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  handleIndicator: {
    backgroundColor: colors.border.dark,
    width: 40,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 48,
  },
});
