import { View } from 'react-native';
import { XCircle, Check, User, Bot } from 'lucide-react-native';
import type { TerminationLogWithDetails } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { api, type UserDetailScope } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ServerTag } from '@/components/server/ServerTag';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { safeFormatDistanceToNow } from '@/lib/formatters';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { UserSection, SectionRow, SectionEmptyText } from './UserSection';
import { LoadMoreButton } from './LoadMoreButton';
import { useMoreRows, SECTION_PAGE_SIZE } from './useMoreRows';
import { mediaTypeLabelKey } from './mediaTypeLabel';

function TerminationRow({
  termination,
  isFirst,
  showServer,
}: {
  termination: TerminationLogWithDetails;
  isFirst: boolean;
  showServer: boolean;
}) {
  const { t } = useTranslation(['common', 'pages', 'mobile']);
  const { serverColor } = useMediaServer();
  const unknown = t('common:labels.unknown');
  const isManual = termination.trigger === 'manual';
  const TriggerIcon = isManual ? User : Bot;

  return (
    <SectionRow isFirst={isFirst}>
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <View className="bg-surface h-7 w-7 items-center justify-center rounded-md">
            <TriggerIcon size={14} color={ACCENT_COLOR} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium" numberOfLines={1}>
              {termination.mediaTitle ?? unknown}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {t(mediaTypeLabelKey(termination.mediaType))} ·{' '}
              {safeFormatDistanceToNow(termination.createdAt, unknown)}
            </Text>
          </View>
        </View>
        <Badge variant={isManual ? 'default' : 'secondary'}>
          {isManual ? t('pages:userDetail.manual') : t('common:labels.rule')}
        </Badge>
      </View>
      <View className="ml-9 gap-1">
        <Text className="text-muted-foreground text-xs">
          {isManual
            ? t('mobile:userDetail.terminatedBy', {
                username: termination.triggeredByUsername ?? unknown,
                defaultValue: 'By @{{username}}',
              })
            : (termination.ruleName ?? t('pages:userDetail.unknownRule'))}
        </Text>
        {termination.reason && (
          <Text className="text-muted-foreground text-xs" numberOfLines={2}>
            {t('common:labels.reason')}: {termination.reason}
          </Text>
        )}
        <View className="flex-row items-center gap-3">
          <View className="flex-row items-center gap-1">
            {termination.success ? (
              <>
                <Check size={12} color={colors.success} />
                <Text className="text-success text-xs">{t('common:states.success')}</Text>
              </>
            ) : (
              <>
                <XCircle size={12} color={colors.danger} />
                <Text className="text-danger text-xs">{t('common:states.failed')}</Text>
              </>
            )}
          </View>
          {showServer && (
            <ServerTag name={termination.serverName} color={serverColor(termination.serverId)} />
          )}
        </View>
      </View>
    </SectionRow>
  );
}

interface UserTerminationsCardProps {
  userId: string;
  first: { data: TerminationLogWithDetails[]; total: number; hasMore: boolean };
  scope: UserDetailScope;
  showServer: boolean;
}

export function UserTerminationsCard({
  userId,
  first,
  scope,
  showServer,
}: UserTerminationsCardProps) {
  const { t } = useTranslation(['common', 'pages', 'mobile']);
  const { rows, canLoadMore, isLoadingMore, loadMore } = useMoreRows({
    queryKey: queryKeys.users.terminations(userId, scope),
    first,
    fetchPage: (page, signal) =>
      api.users.terminations(
        userId,
        { page, pageSize: SECTION_PAGE_SIZE, scope: scope === 'identity' ? scope : undefined },
        signal
      ),
  });

  return (
    <UserSection
      icon={XCircle}
      title={t('pages:userDetail.terminationHistory')}
      meta={`${first.total} ${t('common:labels.total')}`}
      className="mb-4"
    >
      {rows.length === 0 && (
        <SectionEmptyText>{t('mobile:userDetail.noTerminations')}</SectionEmptyText>
      )}
      {rows.map((termination, index) => (
        <TerminationRow
          key={termination.id}
          termination={termination}
          isFirst={index === 0}
          showServer={showServer}
        />
      ))}
      {canLoadMore && <LoadMoreButton onPress={loadMore} isLoading={isLoadingMore} />}
    </UserSection>
  );
}
