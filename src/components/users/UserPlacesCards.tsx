import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { MapPin, Smartphone, type LucideIcon } from 'lucide-react-native';
import type { UserLocation, UserDevice } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { safeFormatDistanceToNow } from '@/lib/formatters';
import { ACCENT_COLOR } from '@/lib/theme';
import { UserSection, SectionRow, SectionEmptyText } from './UserSection';

const INITIAL_DISPLAY_COUNT = 5;

function PlaceRow({
  icon: Icon,
  isFirst,
  title,
  lines,
}: {
  icon: LucideIcon;
  isFirst: boolean;
  title: string;
  lines: string[];
}) {
  return (
    <SectionRow isFirst={isFirst} className="flex-row items-center gap-3">
      <View className="bg-primary/10 h-8 w-8 items-center justify-center rounded-full">
        <Icon size={16} color={ACCENT_COLOR} />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-medium">{title}</Text>
        {lines.map((line) => (
          <Text key={line} className="text-muted-foreground text-xs">
            {line}
          </Text>
        ))}
      </View>
    </SectionRow>
  );
}

function ExpandToggle({
  expanded,
  moreLabel,
  onPress,
}: {
  expanded: boolean;
  moreLabel: string;
  onPress: () => void;
}) {
  const { t } = useTranslation(['common']);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={onPress}
      className="min-h-11 items-center justify-center active:opacity-70"
    >
      <Text className="text-primary text-xs font-medium">
        {expanded ? t('common:actions.showLess') : moreLabel}
      </Text>
    </Pressable>
  );
}

export function UserLocationsCard({
  locations,
  ...props
}: { locations: UserLocation[] } & React.ComponentProps<typeof View>) {
  const { t } = useTranslation(['common', 'mobile', 'pages']);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? locations : locations.slice(0, INITIAL_DISPLAY_COUNT);
  const unknown = t('common:labels.unknown');

  return (
    <UserSection
      icon={MapPin}
      title={t('pages:userDetail.locations', { defaultValue: 'Locations' })}
      meta={t('common:count.location', { count: locations.length })}
      {...props}
    >
      {locations.length === 0 && (
        <SectionEmptyText>{t('mobile:userDetail.noLocationsRecorded')}</SectionEmptyText>
      )}
      {shown.map((location, index) => (
        <PlaceRow
          key={`${location.city}-${location.region}-${location.country}-${location.lat}-${location.lon}`}
          icon={MapPin}
          isFirst={index === 0}
          title={
            [location.city, location.region, location.country].filter(Boolean).join(', ') || unknown
          }
          lines={[
            `${t('common:count.session', { count: location.sessionCount })} · ${safeFormatDistanceToNow(location.lastSeenAt, unknown)}`,
          ]}
        />
      ))}
      {locations.length > INITIAL_DISPLAY_COUNT && (
        <ExpandToggle
          expanded={expanded}
          moreLabel={t('mobile:userDetail.moreLocations', {
            count: locations.length - INITIAL_DISPLAY_COUNT,
          })}
          onPress={() => setExpanded((value) => !value)}
        />
      )}
    </UserSection>
  );
}

export function UserDevicesCard({
  devices,
  ...props
}: { devices: UserDevice[] } & React.ComponentProps<typeof View>) {
  const { t } = useTranslation(['common', 'mobile', 'nav']);
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? devices : devices.slice(0, INITIAL_DISPLAY_COUNT);
  const unknown = t('common:labels.unknown');

  return (
    <UserSection
      icon={Smartphone}
      title={t('nav:devices')}
      meta={t('common:count.device', { count: devices.length })}
      {...props}
    >
      {devices.length === 0 && (
        <SectionEmptyText>{t('mobile:userDetail.noDevicesRecorded')}</SectionEmptyText>
      )}
      {shown.map((device, index) => (
        <PlaceRow
          key={
            device.deviceId ?? `${device.playerName}-${device.product}-${device.platform}-${index}`
          }
          icon={Smartphone}
          isFirst={index === 0}
          title={device.playerName || device.device || device.product || unknown}
          lines={[
            `${device.platform || unknown} · ${t('common:count.session', { count: device.sessionCount })}`,
            t('mobile:userDetail.lastSeen', {
              relative: safeFormatDistanceToNow(device.lastSeenAt, unknown),
              defaultValue: 'Last seen {{relative}}',
            }),
          ]}
        />
      ))}
      {devices.length > INITIAL_DISPLAY_COUNT && (
        <ExpandToggle
          expanded={expanded}
          moreLabel={t('mobile:userDetail.moreDevices', {
            count: devices.length - INITIAL_DISPLAY_COUNT,
          })}
          onPress={() => setExpanded((value) => !value)}
        />
      )}
    </UserSection>
  );
}
