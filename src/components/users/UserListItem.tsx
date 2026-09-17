import { View, Pressable } from 'react-native';
import { Crown } from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns';
import type { ServerUserWithIdentity } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { UserAvatar } from '@/components/ui/user-avatar';
import { colors } from '@/lib/theme';
import { TrustScoreBadge } from './TrustScoreBadge';
import { ServerPills } from './ServerPills';
import { getIdentityServers, parseServerTimestamp } from './identity';

interface UserListItemProps {
  user: ServerUserWithIdentity;
  onPress: () => void;
  isTablet: boolean;
  showServers: boolean;
}

export function UserListItem({ user, onPress, isTablet, showServers }: UserListItemProps) {
  const { t } = useTranslation(['common', 'pages', 'mobile']);
  const displayName = user.identityName ?? user.username;
  const joinedAt = parseServerTimestamp(user.identityJoinedAt ?? user.joinedAt);
  const lastActivityAt = parseServerTimestamp(user.identityLastActivityAt ?? user.lastActivityAt);

  const activity = lastActivityAt
    ? t('pages:users.mergeLastActive', {
        relative: formatDistanceToNow(lastActivityAt, { addSuffix: true }),
      })
    : t('pages:users.mergeNeverActive');
  const joined =
    isTablet && joinedAt
      ? t('mobile:users.joinedRelative', {
          relative: formatDistanceToNow(joinedAt, { addSuffix: true }),
          defaultValue: 'Joined {{relative}}',
        })
      : null;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" className="active:opacity-70">
      <Card padding="compact" className="mb-2 flex-row items-center gap-3">
        <UserAvatar
          thumbUrl={user.thumbUrl}
          serverId={user.serverId}
          username={user.username}
          size={isTablet ? 56 : 48}
        />
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <Text className="flex-shrink text-base font-semibold" numberOfLines={1}>
              {displayName}
            </Text>
            {user.role === 'owner' && (
              <View accessible accessibilityLabel={t('common:labels.serverOwner')}>
                <Crown size={14} color={colors.warning} />
              </View>
            )}
          </View>
          {user.identityName && user.identityName !== user.username && (
            <Text className="text-muted-foreground text-xs" numberOfLines={1}>
              @{user.username}
            </Text>
          )}
          <Text className="text-muted-foreground text-xs" numberOfLines={1}>
            {joined ? `${activity} · ${joined}` : activity}
          </Text>
          {showServers && (
            <ServerPills
              className="mt-0.5"
              servers={getIdentityServers(user.identityServers, {
                id: user.serverId,
                name: user.serverName,
              })}
            />
          )}
        </View>
        <TrustScoreBadge score={user.identityTrustScore ?? user.trustScore} />
      </Card>
    </Pressable>
  );
}
