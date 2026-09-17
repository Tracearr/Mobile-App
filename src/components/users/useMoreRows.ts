import { useState } from 'react';
import { useInfiniteQuery, type QueryKey } from '@tanstack/react-query';
import { nextPageOf, type AnyPage } from '@/lib/listPage';

/** Row count of each list embedded in /users/:id/full. */
export const SECTION_PAGE_SIZE = 10;

interface FirstPage<TRow> {
  data: TRow[];
  hasMore: boolean;
}

/**
 * Extends the first page embedded in /users/:id/full with a paged endpoint.
 * Paging starts at page 2 and only after the first "load more", so opening the
 * screen costs one request. `fetchPage` must ask for SECTION_PAGE_SIZE rows or the
 * pages will not line up.
 */
export function useMoreRows<TRow>({
  queryKey,
  first,
  fetchPage,
  enabled,
}: {
  queryKey: QueryKey;
  first: FirstPage<TRow>;
  fetchPage: (page: number, signal: AbortSignal) => Promise<AnyPage & { data: TRow[] }>;
  enabled: boolean;
}) {
  const [requested, setRequested] = useState(false);

  const more = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, signal),
    initialPageParam: 2,
    getNextPageParam: (lastPage) => nextPageOf(lastPage),
    enabled: enabled && requested,
  });

  const rows = more.data
    ? [...first.data, ...more.data.pages.flatMap((page) => page.data)]
    : first.data;

  return {
    rows,
    canLoadMore: enabled && (more.data ? more.hasNextPage : first.hasMore),
    isLoadingMore: more.isFetching,
    loadMore: () => {
      if (requested) void more.fetchNextPage();
      else setRequested(true);
    },
  };
}
