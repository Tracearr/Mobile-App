/**
 * Bottom sheet modal for mobile-optimized filtering
 * Uses @gorhom/bottom-sheet for native-feeling filter interface
 */
import React, { useCallback, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, Pressable, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  MonitorPlay,
  Zap,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import { useResponsive } from '@/hooks/useResponsive';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { cn } from '@/lib/utils';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { haptics } from '@/lib/haptics';
import { PLAYBACK_DECISION_LABEL_KEYS, type PlaybackDecision } from '@/lib/playbackDecision';
import type { HistoryFilterOptions } from '@tracearr/shared';

export type MediaType = 'movie' | 'episode' | 'track' | 'live';
export type TranscodeDecision = PlaybackDecision;

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

type ListSection = 'users' | 'platforms' | 'countries';
type FilterSection = 'main' | ListSection;

const SECTION_FILTER_KEY = {
  users: 'serverUserIds',
  platforms: 'platforms',
  countries: 'geoCountries',
} as const satisfies Record<ListSection, keyof FilterState>;

const EMPTY_FILTERS: FilterState = {
  serverUserIds: [],
  platforms: [],
  geoCountries: [],
  mediaTypes: [],
  transcodeDecisions: [],
};

const MEDIA_TYPES = [
  { value: 'movie', labelKey: 'common:media.movie_plural', icon: Film },
  { value: 'episode', labelKey: 'common:media.tvShows', icon: Tv },
  { value: 'track', labelKey: 'common:media.music', icon: Music },
  { value: 'live', labelKey: 'common:media.liveTV', icon: Radio },
] as const satisfies readonly { value: MediaType; labelKey: string; icon: LucideIcon }[];

const TRANSCODE_OPTIONS = [
  { value: 'directplay', icon: MonitorPlay },
  { value: 'copy', icon: MonitorPlay },
  { value: 'transcode', icon: Zap },
] as const satisfies readonly { value: TranscodeDecision; icon: LucideIcon }[];

// Selecting any of `values` selects all of them, and deselecting removes all of them.
function toggleValues<T>(current: readonly T[], values: readonly T[]): T[] {
  return values.some((value) => current.includes(value))
    ? current.filter((value) => !values.includes(value))
    : [...new Set([...current, ...values])];
}

function GroupLabel({ children }: { children: string }) {
  return (
    <Text
      accessibilityRole="header"
      className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wide uppercase"
    >
      {children}
    </Text>
  );
}

function OptionRow({
  label,
  isSelected,
  onPress,
  leading,
  count,
}: {
  label: string;
  isSelected: boolean;
  onPress: () => void;
  leading?: React.ReactNode;
  count?: number;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      className={cn(
        'border-border min-h-11 flex-row items-center gap-3 border-b px-4 py-3.5',
        isSelected && 'bg-primary/10'
      )}
    >
      {leading}
      <Text
        numberOfLines={1}
        className={cn('flex-1 text-[15px]', isSelected && 'text-primary font-medium')}
      >
        {label}
      </Text>
      {count !== undefined && (
        <View className="bg-surface rounded-full px-2 py-0.5">
          <Text className="text-muted-foreground text-xs font-medium">{count}</Text>
        </View>
      )}
      {isSelected && <Check size={20} color={ACCENT_COLOR} />}
    </Pressable>
  );
}

function ChipOption({
  label,
  icon: Icon,
  isSelected,
  onPress,
  stacked,
}: {
  label: string;
  icon: LucideIcon;
  isSelected: boolean;
  onPress: () => void;
  stacked?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: isSelected }}
      className={cn(
        'min-h-11 items-center rounded-lg border',
        stacked ? 'flex-1 gap-1.5 px-2 py-3' : 'min-w-[47%] flex-row gap-2 px-3.5 py-2.5',
        isSelected ? 'border-primary bg-primary/15' : 'border-border bg-surface'
      )}
    >
      <Icon size={stacked ? 20 : 18} color={isSelected ? ACCENT_COLOR : colors.text.muted.dark} />
      <Text
        numberOfLines={1}
        className={cn(
          'font-medium',
          stacked ? 'text-center text-xs' : 'text-sm',
          isSelected && 'text-primary'
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export const FilterBottomSheet = forwardRef<FilterBottomSheetRef, FilterBottomSheetProps>(
  ({ filterOptions, filters, onFiltersChange }, ref) => {
    const { t } = useTranslation(['common', 'mobile', 'nav']);
    const insets = useSafeAreaInsets();
    const { isCompactHeight } = useResponsive();
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

    const handleDone = useCallback(() => {
      bottomSheetRef.current?.close();
    }, []);

    const toggle = <K extends keyof FilterState>(key: K, values: FilterState[K]) => {
      haptics.selection();
      onFiltersChange({ ...filters, [key]: toggleValues<string>(filters[key], values) });
    };

    const clear = (next: FilterState) => {
      haptics.selection();
      onFiltersChange(next);
    };

    const activeFilterCount = Object.values(filters).reduce(
      (total, values: string[]) => total + values.length,
      0
    );

    const users = filterOptions?.users;
    const sortedUsers = useMemo(() => {
      if (!users) return [];
      return [...users].sort((a, b) => {
        const nameA = (a.identityName || a.username || '').toLowerCase();
        const nameB = (b.identityName || b.username || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
    }, [users]);

    const sectionTitles: Record<ListSection, string> = {
      users: t('nav:users'),
      platforms: t('mobile:activity.platforms'),
      countries: t('mobile:history.filters.countries', { defaultValue: 'Countries' }),
    };

    const doneFooter = (
      <View
        className="border-border bg-card border-t px-4 pt-3"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 12 }}
      >
        <Button size="lg" className="min-h-12 rounded-xl" onPress={handleDone}>
          {t('common:filters.done')}
        </Button>
      </View>
    );

    const renderNavRow = (section: ListSection, Icon: LucideIcon) => {
      const count = filters[SECTION_FILTER_KEY[section]].length;
      return (
        <Pressable
          onPress={() => setActiveSection(section)}
          accessibilityRole="button"
          accessibilityLabel={
            count > 0
              ? t('mobile:history.filters.sectionSelected', {
                  section: sectionTitles[section],
                  count,
                  defaultValue: '{{section}}, {{count}} selected',
                })
              : sectionTitles[section]
          }
          className="border-border min-h-11 flex-row items-center border-b py-3.5"
        >
          <Icon size={20} color={colors.icon.default} />
          <Text className="ml-3 flex-1 text-[15px]">{sectionTitles[section]}</Text>
          <View className="flex-row items-center gap-2">
            {count > 0 && (
              <View className="bg-primary min-w-[22px] items-center rounded-full px-2 py-0.5">
                <Text className="text-primary-foreground text-xs font-semibold">{count}</Text>
              </View>
            )}
            <ChevronRight size={18} color={colors.icon.default} />
          </View>
        </Pressable>
      );
    };

    const renderMainMenu = () => (
      <View className="flex-1">
        <BottomSheetScrollView contentContainerStyle={scrollContent}>
          <View className="border-border flex-row items-center justify-between border-b px-4 pt-2 pb-4">
            <Text accessibilityRole="header" className="text-lg font-semibold">
              {t('common:labels.filters')}
            </Text>
            {activeFilterCount > 0 && (
              <Pressable
                onPress={() => clear(EMPTY_FILTERS)}
                accessibilityRole="button"
                hitSlop={12}
                className="flex-row items-center gap-1 p-1"
              >
                <X size={14} color={colors.text.muted.dark} />
                <Text className="text-muted-foreground text-[13px]">
                  {t('common:filters.clearAll')}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="px-4 pt-4">
            <GroupLabel>
              {t('mobile:history.filters.filterBy', { defaultValue: 'Filter by' })}
            </GroupLabel>
            {renderNavRow('users', User)}
            {renderNavRow('platforms', Monitor)}
            {renderNavRow('countries', Globe)}
          </View>

          <View className="px-4 pt-5">
            <GroupLabel>
              {t('mobile:history.filters.mediaType', { defaultValue: 'Media Type' })}
            </GroupLabel>
            <View className="flex-row flex-wrap gap-2">
              {MEDIA_TYPES.map(({ value, labelKey, icon }) => (
                <ChipOption
                  key={value}
                  label={t(labelKey)}
                  icon={icon}
                  isSelected={filters.mediaTypes.includes(value)}
                  onPress={() => toggle('mediaTypes', [value])}
                />
              ))}
            </View>
          </View>

          <View className="px-4 pt-5">
            <GroupLabel>{t('mobile:activity.playbackQuality')}</GroupLabel>
            <View className="flex-row gap-2">
              {TRANSCODE_OPTIONS.map(({ value, icon }) => (
                <ChipOption
                  key={value}
                  stacked
                  label={t(PLAYBACK_DECISION_LABEL_KEYS[value])}
                  icon={icon}
                  isSelected={filters.transcodeDecisions.includes(value)}
                  onPress={() => toggle('transcodeDecisions', [value])}
                />
              ))}
            </View>
          </View>
          {isCompactHeight && doneFooter}
        </BottomSheetScrollView>

        {!isCompactHeight && doneFooter}
      </View>
    );

    const renderSectionRows = (section: ListSection) => {
      if (section === 'users') {
        return sortedUsers.map((user) => {
          const displayName = user.identityName || user.username || t('common:labels.unknown');
          return (
            <OptionRow
              key={user.id}
              label={displayName}
              isSelected={user.serverUserIds.some((id) => filters.serverUserIds.includes(id))}
              onPress={() => toggle('serverUserIds', user.serverUserIds)}
              leading={
                <UserAvatar
                  thumbUrl={user.thumbUrl}
                  serverId={user.serverId}
                  username={displayName}
                  size={36}
                />
              }
            />
          );
        });
      }

      const key = SECTION_FILTER_KEY[section];
      return filterOptions?.[section]?.map((item) => (
        <OptionRow
          key={item.value}
          label={item.value}
          count={item.count}
          isSelected={filters[key].includes(item.value)}
          onPress={() => toggle(key, [item.value])}
        />
      ));
    };

    const emptyLabels: Record<ListSection, string> = {
      users: t('mobile:history.filters.noUsers', { defaultValue: 'No users available' }),
      platforms: t('mobile:history.filters.noPlatforms', {
        defaultValue: 'No platforms available',
      }),
      countries: t('mobile:history.filters.noCountries', {
        defaultValue: 'No countries available',
      }),
    };

    const renderListSection = (section: ListSection) => {
      const key = SECTION_FILTER_KEY[section];
      const count = filters[key].length;
      const isEmpty =
        section === 'users' ? sortedUsers.length === 0 : !filterOptions?.[section]?.length;

      return (
        <View className="flex-1">
          <View className="border-border bg-card flex-row items-center border-b px-2 py-2">
            <View className="min-w-24 items-start">
              <Pressable
                onPress={() => setActiveSection('main')}
                accessibilityRole="button"
                accessibilityLabel={t('common:actions.back')}
                className="min-h-11 flex-row items-center pr-2"
              >
                <ChevronLeft size={20} color={ACCENT_COLOR} />
                <Text className="text-primary ml-1 text-[15px]">{t('common:actions.back')}</Text>
              </Pressable>
            </View>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              className="flex-1 text-center text-lg font-semibold"
            >
              {sectionTitles[section]}
            </Text>
            <View className="min-w-24 items-end">
              {count > 0 && (
                <Pressable
                  onPress={() => clear({ ...filters, [key]: [] })}
                  accessibilityRole="button"
                  className="min-h-11 justify-center px-2"
                >
                  <Text className="text-primary text-[13px]">
                    {t('mobile:history.filters.clearCount', {
                      count,
                      defaultValue: 'Clear ({{count}})',
                    })}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
          <BottomSheetScrollView contentContainerStyle={scrollContent} style={{ flex: 1 }}>
            {renderSectionRows(section)}
            {isEmpty && (
              <Text className="text-muted-foreground py-8 text-center text-sm">
                {emptyLabels[section]}
              </Text>
            )}
            {isCompactHeight && doneFooter}
          </BottomSheetScrollView>
          {!isCompactHeight && doneFooter}
        </View>
      );
    };

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
        {activeSection === 'main' ? renderMainMenu() : renderListSection(activeSection)}
      </BottomSheet>
    );
  }
);

FilterBottomSheet.displayName = 'FilterBottomSheet';

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

const scrollContent = {
  paddingBottom: 48,
} satisfies ViewStyle;
