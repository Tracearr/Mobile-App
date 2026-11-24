import { useState } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { nextPageOf, pageMetaOf, type AnyPage } from '@/lib/listPage';

/** Row count of each list embedded in /users/:id/full. */
export const SECTION_PAGE_SIZE = 10;

interface FirstPage<TRow> {
  data: TRow[];
  total: number;
  hasMore: boolean;
}

/**
 * Extends the first page embedded in /users/:id/full with a paged endpoint.
 * Paging starts at page 2 and only after the first "load more", so opening the
 * screen costs one request. `fetchPage` must ask for SECTION_PAGE_SIZE rows or the
 * pages will not line up. Without a first page (a filter /full did not apply) it
 * fetches from page 1 straight away.
 */
export function useMoreRows<TRow>({
  queryKey,
  first,
  fetchPage,
}: {
  queryKey: QueryKey;
  first: FirstPage<TRow> | undefined;
  fetchPage: (page: number, signal: AbortSignal) => Promise<AnyPage & { data: TRow[] }>;
}) {
  const [requested, setRequested] = useState(false);

  const more = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: first ? 2 : 1,
    getNextPageParam: (lastPage) => nextPageOf(lastPage),
    enabled: requested || !first,
  });

  const fetched = more.data?.pages.flatMap((page) => page.data) ?? [];
  const rows = first ? [...first.data, ...fetched] : fetched;

  const firstFetched = more.data?.pages[0];
  return {
    rows,
    total: first?.total ?? (firstFetched ? pageMetaOf(firstFetched).total : undefined),
    isLoading: more.isPending && !first,
    /** Only a list without a first page can fail with nothing to show */
    error: first ? null : more.error,
    retry: () => void more.refetch(),
    canLoadMore: more.data ? more.hasNextPage : (first?.hasMore ?? false),
    isLoadingMore: more.isFetching,
    loadMore: () => {
      if (requested || !first) void more.fetchNextPage();
      else setRequested(true);
    },
  };
}
