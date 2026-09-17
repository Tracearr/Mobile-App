import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, type RunFilters } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { nextPageOf } from '@/lib/listPage';
import { SERVER_2_2, useServerVersion } from './useServerVersion';

const PAGE_SIZE = 50;

export function useRuns(filters: RunFilters = {}) {
  const { supports } = useServerVersion();
  return useInfiniteQuery({
    queryKey: queryKeys.runs.list(filters),
    queryFn: ({ pageParam, signal }) =>
      api.runs.list({ ...filters, page: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => nextPageOf(lastPage),
    enabled: supports(SERVER_2_2),
  });
}

export function useRunCounts(filters: RunFilters = {}) {
  const { supports } = useServerVersion();
  return useQuery({
    queryKey: queryKeys.runs.counts(filters),
    queryFn: ({ signal }) => api.runs.counts(filters, signal),
    enabled: supports(SERVER_2_2),
  });
}
