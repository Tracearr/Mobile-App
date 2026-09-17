import { View, Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check } from 'lucide-react-native';
import { ALL_SERVERS, type ViolationSummary, type ViolationWithDetails } from '@tracearr/shared';
import { useTranslation } from '@tracearr/translations/mobile';
import { api } from '@/lib/api';
import { queryKeys, type UserViolationsFilter } from '@/lib/queryKeys';
import { ruleIcon } from '@/lib/violations';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ServerTag } from '@/components/server/ServerTag';
import { SeverityBadge } from '@/components/violations/SeverityBadge';
import { useMediaServer } from '@/providers/MediaServerProvider';
import { safeFormatDistanceToNow } from '@/lib/formatters';
import { haptics } from '@/lib/haptics';
import { ACCENT_COLOR, colors } from '@/lib/theme';
import { UserSection, SectionRow } from './UserSection';
import { LoadMoreButton } from './LoadMoreButton';
import { useMoreRows, SECTION_PAGE_SIZE } from './useMoreRows';

// /users/:id/full embeds ViolationSummary rows; /violations pages ViolationWithDetails.
type ViolationRowData = ViolationSummary | ViolationWithDetails;

// ViolationSummary types severity as a plain string.
function isSeverity(value: string): value is ViolationWithDetails['severity'] {
  return value === 'low' || value === 'warning' || value === 'high';
}

function violationServer(violation: ViolationRowData): { id: string; name: string } | null {
  if ('serverId' in violation) return { id: violation.serverId, name: violation.serverName };
  return violation.server ?? null;
}

function ViolationRow({
  violation,
  isFirst,
  showServer,
  isAcknowledging,
  onAcknowledge,
}: {
  violation: ViolationRowData;
  isFirst: boolean;
  showServer: boolean;
  isAcknowledging: boolean;
  onAcknowledge: () => void;
}) {
  const { t } = useTranslation(['common', 'pages']);
  const { serverColor } = useMediaServer();
  const RuleIcon = ruleIcon(violation.rule.type);
  const server = showServer ? violationServer(violation) : null;

  return (
    <SectionRow isFirst={isFirst}>
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <View className="bg-surface h-7 w-7 items-center justify-center rounded-md">
            <RuleIcon size={14} color={ACCENT_COLOR} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-medium">
              {violation.rule.name || t('pages:userDetail.unknownRule')}
            </Text>
            <Text className="text-muted-foreground text-xs">
              {safeFormatDistanceToNow(violation.createdAt, t('common:labels.unknown'))}
            </Text>
            {server && (
              <ServerTag className="mt-0.5" name={server.name} color={serverColor(server.id)} />
            )}
          </View>
        </View>
        {isSeverity(violation.severity) && <SeverityBadge severity={violation.severity} />}
      </View>
      {violation.acknowledgedAt ? (
        <View className="flex-row items-center gap-1.5">
          <Check size={14} color={colors.success} />
          <Text className="text-success text-xs">{t('common:states.acknowledged')}</Text>
        </View>
      ) : (
        <Button
          variant="outline"
          size="sm"
          className="min-h-11 gap-1.5"
          disabled={isAcknowledging}
          onPress={onAcknowledge}
        >
          <Check size={14} color={ACCENT_COLOR} />
          <Text className="text-primary text-xs font-semibold">
            {isAcknowledging ? t('common:states.acknowledging') : t('common:actions.acknowledge')}
          </Text>
        </Button>
      )}
    </SectionRow>
  );
}

interface UserViolationsCardProps {
  filter: UserViolationsFilter;
  first: { data: ViolationSummary[]; total: number; hasMore: boolean };
  showServer: boolean;
}

export function UserViolationsCard({ filter, first, showServer }: UserViolationsCardProps) {
  const { t } = useTranslation(['common', 'pages', 'mobile']);
  const queryClient = useQueryClient();

  const { rows, canLoadMore, isLoadingMore, loadMore } = useMoreRows<ViolationRowData>({
    queryKey: queryKeys.violations.byUser(filter),
    first,
    fetchPage: (page, signal) =>
      api.violations.list(
        { ...filter, page, pageSize: SECTION_PAGE_SIZE, scope: ALL_SERVERS },
        signal
      ),
  });

  const acknowledge = useMutation({
    mutationFn: api.violations.acknowledge,
    onSuccess: () => {
      haptics.success();
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.fullPrefix() });
      void api.violations
        .unacknowledgedCount({ scope: ALL_SERVERS })
        .then((count) => Notifications.setBadgeCountAsync(count))
        .catch(() => {});
    },
    onError: (error: Error) => {
      haptics.error();
      Alert.alert(t('common:errors.somethingWentWrong'), error.message);
    },
  });
  const acknowledgingId = acknowledge.isPending ? acknowledge.variables : null;

  return (
    <UserSection
      icon={AlertTriangle}
      title={t('pages:userDetail.violations')}
      meta={`${first.total} ${t('common:labels.total')}`}
      className="mb-4"
    >
      {rows.length === 0 && (
        <EmptyState
          compact
          tone="success"
          icon={Check}
          title={t('mobile:userDetail.noViolations')}
        />
      )}
      {rows.map((violation, index) => (
        <ViolationRow
          key={violation.id}
          violation={violation}
          isFirst={index === 0}
          showServer={showServer}
          isAcknowledging={acknowledgingId === violation.id}
          onAcknowledge={() => acknowledge.mutate(violation.id)}
        />
      ))}
      {canLoadMore && <LoadMoreButton onPress={loadMore} isLoading={isLoadingMore} />}
    </UserSection>
  );
}
