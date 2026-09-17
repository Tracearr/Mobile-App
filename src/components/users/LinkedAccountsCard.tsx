import { View } from 'react-native';
import { Link2, Pencil } from 'lucide-react-native';
import { useTranslation } from '@tracearr/translations/mobile';
import type { UserFullDetail } from '@/lib/api';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ServerTag } from '@/components/server/ServerTag';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { UserSection, SectionRow } from './UserSection';
import { TrustScoreBadge } from './TrustScoreBadge';
import { RemovedBadge } from './RemovedBadge';
import { TrustScoreEditor, type TrustEditTarget } from './TrustScoreEditor';

interface LinkedAccountsCardProps {
  accounts: UserFullDetail['identity']['serverUsers'];
  canEditTrust: boolean;
  editTarget: TrustEditTarget | null;
  onEditTrust: (target: TrustEditTarget | null) => void;
}

export function LinkedAccountsCard({
  accounts,
  canEditTrust,
  editTarget,
  onEditTrust,
}: LinkedAccountsCardProps) {
  const { t } = useTranslation(['pages', 'common']);
  const { servers } = useMediaServer();
  const editingId = editTarget?.origin === 'linkedAccount' ? editTarget.id : null;

  return (
    <UserSection icon={Link2} title={t('pages:userDetail.linkedAccounts')} className="mb-4">
      {accounts.map((account, index) => (
        <SectionRow key={account.id} isFirst={index === 0}>
          <View className="flex-row items-center gap-3">
            <View className="flex-1 gap-0.5">
              <View className="flex-row flex-wrap items-center gap-2">
                <Text
                  numberOfLines={1}
                  className={cn(
                    'flex-shrink text-sm font-medium',
                    account.removedAt && 'text-muted-foreground line-through'
                  )}
                >
                  {account.username}
                </Text>
                {account.removedAt && <RemovedBadge />}
              </View>
              <ServerTag
                size="md"
                name={account.serverName}
                color={servers.find((server) => server.id === account.serverId)?.color}
              />
              <Text className="text-muted-foreground text-xs">
                {t('common:count.session', { count: account.sessionCount })}
              </Text>
            </View>
            <TrustScoreBadge score={account.trustScore} />
            {canEditTrust && (
              <Button
                variant="outline"
                size="icon"
                className="min-h-11 min-w-11"
                accessibilityLabel={`${t('pages:userDetail.adjustTrustScore')}, @${account.username}`}
                accessibilityState={{ expanded: editingId === account.id }}
                onPress={() =>
                  onEditTrust(
                    editingId === account.id
                      ? null
                      : {
                          origin: 'linkedAccount',
                          id: account.id,
                          username: account.username,
                          score: account.trustScore,
                        }
                  )
                }
              >
                <Pencil size={16} color={colors.text.primary.dark} />
              </Button>
            )}
          </View>
          {editTarget && editingId === account.id && (
            <TrustScoreEditor
              key={account.id}
              target={editTarget}
              onClose={() => onEditTrust(null)}
            />
          )}
        </SectionRow>
      ))}
    </UserSection>
  );
}
