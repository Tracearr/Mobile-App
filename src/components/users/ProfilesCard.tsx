import { View } from 'react-native';
import { UserRound } from 'lucide-react-native';
import type { UserRangeStats } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { useProfileLabels } from '@/hooks/useProfileLabels';
import { formatWatchTime } from '@/lib/dateFormat';
import { UserSection } from './UserSection';

/** Plays and watch time per profile over the last 30 days, as web's Overview shows them */
export function ProfilesCard({ profiles }: { profiles: UserRangeStats['profiles'] }) {
  const { t } = useTranslation(['common']);
  const { profileOptionLabel } = useProfileLabels();
  const topPlays = Math.max(...profiles.map((profile) => profile.plays));

  return (
    <UserSection
      icon={UserRound}
      title={t('common:labels.profiles')}
      meta={t('common:periods.last30Days')}
      className="mb-4"
    >
      <View className="gap-2.5 pt-1">
        {profiles.map((profile) => (
          <View key={profile.profileId} className="gap-1">
            <View className="flex-row items-center gap-2">
              <Text className="flex-1 text-sm" numberOfLines={1}>
                {profileOptionLabel(profile)}
              </Text>
              <Text
                className="text-muted-foreground text-xs"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                {t('common:count.play', { count: profile.plays })}
              </Text>
              <Text
                className="text-muted-foreground text-right text-xs"
                style={{ fontVariant: ['tabular-nums'], minWidth: 56 }}
              >
                {formatWatchTime(profile.watchMs)}
              </Text>
            </View>
            <View className="bg-muted overflow-hidden rounded-full" style={{ height: 4 }}>
              <View
                className="bg-primary h-full"
                style={{ width: `${topPlays > 0 ? (profile.plays / topPlays) * 100 : 0}%` }}
              />
            </View>
          </View>
        ))}
      </View>
    </UserSection>
  );
}
