import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { api, type UserDetailScope } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { nextPageOf } from '@/lib/listPage';
import { SERVER_2_3, useServerVersion } from './useServerVersion';

const PAGE_SIZE = 20;

/** Whether any Seerr service is linked. `configured` stays false on servers before SERVER_2_3. */
export function useRequestsStatus() {
  const { supports } = useServerVersion();
  const supported = supports(SERVER_2_3);
  const { data } = useQuery({
    queryKey: queryKeys.requests.status(),
    queryFn: ({ signal }) => api.requests.status(signal),
    enabled: supported,
    staleTime: 5 * 60 * 1000,
  });
  return { supported, configured: data?.configured ?? false };
}

export function useUserRequests(id: string, scope: UserDetailScope) {
  const { configured } = useRequestsStatus();
  return useInfiniteQuery({
    queryKey: queryKeys.requests.user(id, scope),
    queryFn: ({ pageParam, signal }) =>
      api.users.requests(id, { scope, page: pageParam, pageSize: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => nextPageOf(lastPage),
    enabled: configured && !!id,
    staleTime: 1000 * 60,
  });
}
