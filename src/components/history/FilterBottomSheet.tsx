/**
 * Bottom sheet modal for mobile-optimized filtering
 * Uses @gorhom/bottom-sheet for native-feeling filter interface
 */
import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Pressable, ScrollView, Image, type ViewStyle } from 'react-native';
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
import { ACCENT_COLOR, colors } from '@/lib/theme';
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
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.dark,
            backgroundColor: colors.card.dark,
          }}
        >
          <Pressable
            onPress={() => setActiveSection('main')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 4,
              paddingRight: 8,
            }}
          >
            <ChevronRight
              size={20}
              color={ACCENT_COLOR}
              style={{ transform: [{ rotate: '180deg' }] }}
            />
            <Text style={{ color: ACCENT_COLOR, fontSize: 15, marginLeft: 4 }}>Back</Text>
          </Pressable>
          <Text
            style={{
              flex: 1,
              fontSize: 18,
              fontWeight: '600',
              color: colors.text.primary.dark,
              textAlign: 'center',
              marginRight: 60,
            }}
          >
            {title}
          </Text>
          {count > 0 && (
            <Pressable
              onPress={() => clearSection(section)}
              style={{ paddingHorizontal: 8, paddingVertical: 4 }}
            >
              <Text style={{ color: ACCENT_COLOR, fontSize: 13 }}>Clear ({count})</Text>
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
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            paddingHorizontal: 16,
            backgroundColor: isSelected ? `${ACCENT_COLOR}10` : 'transparent',
            borderBottomWidth: 1,
            borderBottomColor: colors.border.dark,
          }}
        >
          {user.thumbUrl ? (
            <Image
              source={{ uri: user.thumbUrl }}
              style={{ width: 36, height: 36, borderRadius: 18, marginRight: 12 }}
            />
          ) : (
            <View
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                marginRight: 12,
                backgroundColor: colors.surface.dark,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: colors.text.muted.dark, fontSize: 14, fontWeight: '600' }}>
                {displayName[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 15,
              color: isSelected ? ACCENT_COLOR : colors.text.primary.dark,
              fontWeight: isSelected ? '500' : '400',
            }}
          >
            {displayName}
          </Text>
          {isSelected && <Check size={20} color={ACCENT_COLOR} />}
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
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: 16,
          backgroundColor: isSelected ? `${ACCENT_COLOR}10` : 'transparent',
          borderBottomWidth: 1,
          borderBottomColor: colors.border.dark,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            flex: 1,
            fontSize: 15,
            color: isSelected ? ACCENT_COLOR : colors.text.primary.dark,
            fontWeight: isSelected ? '500' : '400',
          }}
        >
          {item.value}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View
            style={{
              backgroundColor: colors.surface.dark,
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: colors.text.muted.dark, fontSize: 12, fontWeight: '500' }}>
              {item.count}
            </Text>
          </View>
          {isSelected && <Check size={20} color={ACCENT_COLOR} />}
        </View>
      </Pressable>
    );

    // Close the bottom sheet
    const handleDone = useCallback(() => {
      bottomSheetRef.current?.close();
    }, []);

    // Navigation row component
    const renderNavRow = (
      icon: React.ElementType,
      label: string,
      count: number,
      onPress: () => void
    ) => {
      const Icon = icon;
      return (
        <Pressable
          onPress={onPress}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 14,
            borderBottomWidth: 1,
            borderBottomColor: colors.border.dark,
          }}
        >
          <Icon size={20} color={colors.icon.default} />
          <Text style={{ flex: 1, fontSize: 15, color: colors.text.primary.dark, marginLeft: 12 }}>
            {label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {count > 0 && (
              <View
                style={{
                  minWidth: 22,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 11,
                  backgroundColor: ACCENT_COLOR,
                  alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{count}</Text>
              </View>
            )}
            <ChevronRight size={18} color={colors.icon.default} />
          </View>
        </Pressable>
      );
    };

    // Main filter menu
    const renderMainMenu = () => (
      <View style={{ flex: 1 }}>
        <BottomSheetScrollView contentContainerStyle={scrollContent}>
          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: colors.border.dark,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary.dark }}>
              Filters
            </Text>
            {activeFilterCount > 0 && (
              <Pressable
                onPress={clearAllFilters}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 }}
              >
                <X size={14} color={colors.text.muted.dark} />
                <Text style={{ color: colors.text.muted.dark, fontSize: 13 }}>Clear all</Text>
              </Pressable>
            )}
          </View>

          {/* Sub-menu navigation items */}
          <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
            <Text
              style={{
                color: colors.text.muted.dark,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Filter by
            </Text>

            {renderNavRow(User, 'Users', filters.serverUserIds.length, () =>
              setActiveSection('users')
            )}
            {renderNavRow(Monitor, 'Platforms', filters.platforms.length, () =>
              setActiveSection('platforms')
            )}
            {renderNavRow(Globe, 'Countries', filters.geoCountries.length, () =>
              setActiveSection('countries')
            )}
          </View>

          {/* Media Types - 2x2 grid */}
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text
              style={{
                color: colors.text.muted.dark,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Media Type
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {MEDIA_TYPES.map(({ value, label, icon: Icon }) => {
                const isSelected = filters.mediaTypes.includes(value);
                return (
                  <Pressable
                    key={value}
                    onPress={() => toggleMediaType(value)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isSelected ? ACCENT_COLOR : colors.border.dark,
                      backgroundColor: isSelected ? `${ACCENT_COLOR}15` : colors.surface.dark,
                      minWidth: '47%',
                    }}
                  >
                    <Icon size={18} color={isSelected ? ACCENT_COLOR : colors.text.muted.dark} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '500',
                        color: isSelected ? ACCENT_COLOR : colors.text.primary.dark,
                      }}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Quality/Transcode - row of 3 */}
          <View style={{ paddingHorizontal: 16, paddingTop: 20 }}>
            <Text
              style={{
                color: colors.text.muted.dark,
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Playback Quality
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {TRANSCODE_OPTIONS.map(({ value, label, icon: Icon }) => {
                const isSelected = filters.transcodeDecisions.includes(value);
                return (
                  <Pressable
                    key={value}
                    onPress={() => toggleTranscode(value)}
                    style={{
                      flex: 1,
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 6,
                      paddingVertical: 12,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: isSelected ? ACCENT_COLOR : colors.border.dark,
                      backgroundColor: isSelected ? `${ACCENT_COLOR}15` : colors.surface.dark,
                    }}
                  >
                    <Icon size={20} color={isSelected ? ACCENT_COLOR : colors.text.muted.dark} />
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '500',
                        color: isSelected ? ACCENT_COLOR : colors.text.primary.dark,
                        textAlign: 'center',
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </BottomSheetScrollView>

        {/* Done button - sticky footer */}
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            paddingBottom: 24,
            borderTopWidth: 1,
            borderTopColor: colors.border.dark,
            backgroundColor: colors.card.dark,
          }}
        >
          <Pressable
            onPress={handleDone}
            style={{
              backgroundColor: ACCENT_COLOR,
              paddingVertical: 14,
              borderRadius: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
              {activeFilterCount > 0 ? `Apply ${activeFilterCount} Filters` : 'Done'}
            </Text>
          </Pressable>
        </View>
      </View>
    );

    // Done button for sub-sections
    const renderDoneButton = () => (
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          paddingBottom: 24,
          borderTopWidth: 1,
          borderTopColor: colors.border.dark,
          backgroundColor: colors.card.dark,
        }}
      >
        <Pressable
          onPress={handleDone}
          style={{
            backgroundColor: ACCENT_COLOR,
            paddingVertical: 14,
            borderRadius: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>
            {activeFilterCount > 0 ? `Apply ${activeFilterCount} Filters` : 'Done'}
          </Text>
        </Pressable>
      </View>
    );

    // Users sub-menu
    const renderUsersSection = () => (
      <View style={{ flex: 1 }}>
        {renderSectionHeader('Users', 'users')}
        <ScrollView contentContainerStyle={listContent} style={{ flex: 1 }}>
          {sortedUsers.map(renderUserItem)}
          {sortedUsers.length === 0 && (
            <Text
              style={{
                color: colors.text.muted.dark,
                textAlign: 'center',
                paddingVertical: 32,
                fontSize: 14,
              }}
            >
              No users available
            </Text>
          )}
        </ScrollView>
        {renderDoneButton()}
      </View>
    );

    // Platforms sub-menu
    const renderPlatformsSection = () => (
      <View style={{ flex: 1 }}>
        {renderSectionHeader('Platforms', 'platforms')}
        <ScrollView contentContainerStyle={listContent} style={{ flex: 1 }}>
          {filterOptions?.platforms?.map((item) =>
            renderFilterItem(item, filters.platforms.includes(item.value), () =>
              togglePlatform(item.value)
            )
          )}
          {(!filterOptions?.platforms || filterOptions.platforms.length === 0) && (
            <Text
              style={{
                color: colors.text.muted.dark,
                textAlign: 'center',
                paddingVertical: 32,
                fontSize: 14,
              }}
            >
              No platforms available
            </Text>
          )}
        </ScrollView>
        {renderDoneButton()}
      </View>
    );

    // Countries sub-menu
    const renderCountriesSection = () => (
      <View style={{ flex: 1 }}>
        {renderSectionHeader('Countries', 'countries')}
        <ScrollView contentContainerStyle={listContent} style={{ flex: 1 }}>
          {filterOptions?.countries?.map((item) =>
            renderFilterItem(item, filters.geoCountries.includes(item.value), () =>
              toggleCountry(item.value)
            )
          )}
          {(!filterOptions?.countries || filterOptions.countries.length === 0) && (
            <Text
              style={{
                color: colors.text.muted.dark,
                textAlign: 'center',
                paddingVertical: 32,
                fontSize: 14,
              }}
            >
              No countries available
            </Text>
          )}
        </ScrollView>
        {renderDoneButton()}
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
        backgroundStyle={bottomSheetBackground}
        handleIndicatorStyle={handleIndicator}
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

// Style constants for BottomSheet component props
const bottomSheetBackground: ViewStyle = {
  backgroundColor: colors.card.dark,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  borderTopWidth: 1,
  borderLeftWidth: 1,
  borderRightWidth: 1,
  borderColor: colors.border.dark,
};

const handleIndicator: ViewStyle = {
  backgroundColor: colors.border.dark,
  width: 40,
};

const scrollContent: ViewStyle = {
  paddingBottom: 48,
};

const listContent: ViewStyle = {
  paddingHorizontal: 16,
  paddingBottom: 48,
};
