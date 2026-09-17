import { View } from 'react-native';
import { Crown, Pencil } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import type { UserFullDetail } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/ui/user-avatar';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { TrustScoreBadge } from './TrustScoreBadge';
import { ServerPills } from './ServerPills';
import { RemovedBadge } from './RemovedBadge';
import { TrustScoreEditor, type TrustEditTarget } from './TrustScoreEditor';
import { getMergedIdentityServers, isPersonRemoved } from './identity';

interface UserHeaderCardProps {
  user: UserFullDetail['user'];
  identity: UserFullDetail['identity'];
  /** True when the screen covers the whole person, false when narrowed to `user`'s account. */
  isAllScope: boolean;
  avatarSize: number;
  canEditTrust: boolean;
  editTarget: TrustEditTarget | null;
  onEditTrust: (target: TrustEditTarget | null) => void;
}

export function UserHeaderCard({
  user,
  identity,
  isAllScope,
  avatarSize,
  canEditTrust,
  editTarget,
  onEditTrust,
}: UserHeaderCardProps) {
  const { t } = useTranslation(['pages', 'common']);
  const isMergedIdentity = identity.serverUsers.length > 1;
  const showsOverallTrust = isAllScope && isMergedIdentity;
  const isRemoved = isAllScope ? isPersonRemoved(identity.serverUsers) : user.removedAt != null;
  const isEditing = editTarget?.origin === 'header';

  const headerServers = isAllScope
    ? getMergedIdentityServers(
        identity.serverUsers.map((account) => ({ id: account.serverId, name: account.serverName }))
      )
    : isMergedIdentity
      ? [{ id: user.serverId, name: user.serverName }]
      : [];

  return (
    <Card className="mb-4">
      <View className="flex-row items-start gap-4">
        <UserAvatar
          thumbUrl={user.thumbUrl}
          serverId={user.serverId}
          username={user.username}
          size={avatarSize}
        />
        <View className="flex-1 gap-1">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              className={cn(
                'flex-shrink text-xl font-bold',
                isRemoved && 'text-muted-foreground line-through'
              )}
            >
              {user.identityName ?? user.username}
            </Text>
            {user.role === 'owner' && (
              <View accessible accessibilityLabel={t('common:labels.serverOwner')}>
                <Crown size={18} color={colors.warning} />
              </View>
            )}
            {isRemoved && <RemovedBadge />}
          </View>
          {user.identityName && user.identityName !== user.username && (
            <Text className="text-muted-foreground text-sm">@{user.username}</Text>
          )}
          {user.email && <Text className="text-muted-foreground text-sm">{user.email}</Text>}
          <ServerPills servers={headerServers} size="md" max={4} />
          <View className="mt-1 flex-row flex-wrap items-center gap-2">
            <TrustScoreBadge
              score={showsOverallTrust ? identity.aggregateTrustScore : user.trustScore}
              showLabel
            />
            {showsOverallTrust && (
              <Text className="text-muted-foreground text-xs">
                {t('pages:userDetail.overallTrust')}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* An overall score belongs to no single account, so it is edited per linked account. */}
      {canEditTrust && !showsOverallTrust && !isEditing && (
        <Button
          variant="outline"
          size="sm"
          className="mt-3 min-h-11 gap-2 self-start"
          onPress={() =>
            onEditTrust({
              origin: 'header',
              id: user.id,
              username: user.username,
              score: user.trustScore,
            })
          }
        >
          <Pencil size={14} color={colors.text.primary.dark} />
          <Text className="text-xs font-medium">{t('pages:userDetail.adjustTrustScore')}</Text>
        </Button>
      )}
      {editTarget && isEditing && (
        <TrustScoreEditor
          key={editTarget.id}
          target={editTarget}
          onClose={() => onEditTrust(null)}
        />
      )}
    </Card>
  );
}
