import { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Film, Tv, Sparkles, ListPlus, Check, CircleDashed, Inbox } from 'lucide-react-native';
import type { MediaRequestStatus, UserRequestEntry, UserRequestsSummary } from '@tracearr/shared';
import { formatPercent, useTranslation } from '@tracearr/translations/mobile';
import { useUserRequests } from '@/hooks';
import type { UserDetailScope } from '@/lib/api';
import { pageMetaOf } from '@/lib/listPage';
import { Text } from '@/components/ui/text';
import { Badge } from '@/components/ui/badge';
import { ErrorState } from '@/components/ui/error-state';
import { formatDuration, safeFormatDate } from '@/lib/formatters';
import { colors } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { UserSection, SectionRow } from './UserSection';
import { LoadMoreButton } from './LoadMoreButton';

const INITIAL_DISPLAY_COUNT = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

const STATUS_VARIANTS = {
  pending: 'warning',
  approved: 'secondary',
  completed: 'success',
  declined: 'danger',
  failed: 'danger',
} as const satisfies Record<MediaRequestStatus, string>;

const STATUS_LABEL_KEYS = {
  pending: 'pages:requests.status.pending',
  approved: 'pages:requests.status.approved',
  completed: 'pages:requests.status.completed',
  declined: 'pages:requests.status.declined',
  failed: 'pages:requests.status.failed',
} as const satisfies Record<MediaRequestStatus, string>;

// Waits run to months, so days lead once there are any.
function formatWaitDuration(ms: number): string {
  if (ms < DAY_MS) return formatDuration(ms);
  const days = Math.floor(ms / DAY_MS);
  const hours = Math.floor((ms % DAY_MS) / HOUR_MS);
  return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="border-border flex-1 rounded-lg border p-3">
      <Text className="text-muted-foreground text-xs" numberOfLines={1}>
        {label}
      </Text>
      <Text className="mt-1 text-xl font-bold">{value}</Text>
      {hint && <Text className="text-muted-foreground mt-0.5 text-[11px]">{hint}</Text>}
    </View>
  );
}

function RequestsSummary({ summary }: { summary: UserRequestsSummary }) {
  const { t } = useTranslation(['pages']);
  return (
    <View className="my-2 flex-row gap-2">
      <SummaryTile
        label={t('pages:requests.userCard.summary.requests')}
        value={String(summary.total)}
        hint={
          summary.medianWaitMs !== null
            ? t('pages:requests.userCard.summary.medianWait', {
                duration: formatWaitDuration(summary.medianWaitMs),
              })
            : undefined
        }
      />
      <SummaryTile
        label={t('pages:requests.userCard.summary.approvalRate')}
        value={summary.approvalRate !== null ? formatPercent(summary.approvalRate, 0) : '-'}
      />
      <SummaryTile
        label={t('pages:requests.userCard.summary.neverWatched')}
        value={String(summary.neverWatched)}
      />
    </View>
  );
}

function RequestRow({ request, isFirst }: { request: UserRequestEntry; isFirst: boolean }) {
  const { t } = useTranslation(['pages']);
  const MediaIcon = request.media.mediaType === 'movie' ? Film : Tv;
  const isDeleted = request.deletedAt !== null;

  const wait =
    request.status === 'declined' || request.status === 'failed'
      ? t('pages:requests.wait.declined')
      : request.waitMs === null
        ? t('pages:requests.wait.pending')
        : formatWaitDuration(request.waitMs);

  const details = [safeFormatDate(request.requestedAt, 'MMM d, yyyy', '-'), wait];
  if (request.seasons) {
    details.push(
      request.seasons.length === 0
        ? t('pages:requests.seasons.all')
        : request.seasons
            .map((season) => season.seasonNumber)
            .sort((a, b) => a - b)
            .map((number) => t('pages:requests.seasons.item', { number }))
            .join(', ')
    );
  }

  const watchedByRequester = request.watchedStateRequester === 'watched';

  return (
    <SectionRow isFirst={isFirst} className="gap-1">
      <View className="flex-row items-center gap-2">
        <MediaIcon size={16} color={colors.text.muted.dark} />
        <Text
          numberOfLines={1}
          className={cn('flex-1 text-sm font-medium', isDeleted && 'line-through')}
        >
          {request.media.title ?? '-'}
        </Text>
        {request.is4k && (
          <View accessible accessibilityLabel={t('pages:requests.flags.fourK')}>
            <Sparkles size={14} color={colors.text.muted.dark} />
          </View>
        )}
        {request.isAutoRequest && (
          <View accessible accessibilityLabel={t('pages:requests.flags.auto')}>
            <ListPlus size={14} color={colors.text.muted.dark} />
          </View>
        )}
        {isDeleted ? (
          <Badge variant="outline">{t('pages:requests.status.deleted')}</Badge>
        ) : (
          <Badge variant={STATUS_VARIANTS[request.status]}>
            {t(STATUS_LABEL_KEYS[request.status])}
          </Badge>
        )}
      </View>
      <View className="ml-6 flex-row items-center gap-2">
        <Text className="text-muted-foreground flex-1 text-xs" numberOfLines={1}>
          {details.join(' · ')}
        </Text>
        {request.watchedState === 'watched' && (
          <View className="flex-row items-center gap-1">
            <Check size={12} color={watchedByRequester ? colors.success : colors.warning} />
            <Text className={cn('text-xs', watchedByRequester ? 'text-success' : 'text-warning')}>
              {watchedByRequester
                ? t('pages:requests.watched.byRequester')
                : t('pages:requests.watched.byOthers')}
            </Text>
          </View>
        )}
        {request.watchedState === 'partial' && (
          <View className="flex-row items-center gap-1">
            <CircleDashed size={12} color={colors.text.muted.dark} />
            <Text className="text-muted-foreground text-xs">
              {t('pages:media.posterCard.watchedState.partial')}
            </Text>
          </View>
        )}
      </View>
    </SectionRow>
  );
}

interface UserRequestsCardProps {
  userId: string;
  scope: UserDetailScope;
}

/** Render only when `useRequestsStatus().configured` is true; the query is disabled otherwise. */
export function UserRequestsCard({ userId, scope }: UserRequestsCardProps) {
  const { t } = useTranslation(['pages']);
  const [expanded, setExpanded] = useState(false);
  const { data, isError, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useUserRequests(userId, scope);

  if (isError && !data) {
    return (
      <UserSection icon={Inbox} title={t('pages:requests.userCard.title')} className="mb-4">
        <ErrorState
          compact
          title={t('pages:requests.userCard.loadError')}
          onRetry={() => void refetch()}
        />
      </UserSection>
    );
  }

  const firstPage = data?.pages[0];
  const total = firstPage ? pageMetaOf(firstPage).total : 0;
  if (!firstPage || total === 0) return null;

  const loaded = data.pages.flatMap((page) => page.data);
  const rows = expanded ? loaded : loaded.slice(0, INITIAL_DISPLAY_COUNT);
  const remaining = total - INITIAL_DISPLAY_COUNT;

  return (
    <UserSection icon={Inbox} title={t('pages:requests.userCard.title')} className="mb-4">
      <RequestsSummary summary={firstPage.summary} />
      {rows.map((request, index) => (
        <RequestRow key={request.id} request={request} isFirst={index === 0} />
      ))}
      {expanded && hasNextPage && (
        <LoadMoreButton onPress={() => void fetchNextPage()} isLoading={isFetchingNextPage} />
      )}
      {remaining > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          className="min-h-11 items-center justify-center active:opacity-70"
        >
          <Text className="text-primary text-xs font-medium">
            {expanded
              ? t('pages:requests.userCard.showLess')
              : t('pages:requests.userCard.viewAll', { count: remaining })}
          </Text>
        </Pressable>
      )}
    </UserSection>
  );
}
