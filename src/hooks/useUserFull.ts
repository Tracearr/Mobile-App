import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type UserDetailScope } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useUserFull(id: string, scope: UserDetailScope) {
  return useQuery({
    queryKey: queryKeys.users.full(id, scope),
    queryFn: ({ signal }) => api.users.full(id, scope, signal),
    enabled: !!id,
    staleTime: 1000 * 60,
  });
}

export function useUpdateTrustScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, trustScore }: { id: string; trustScore: number }) =>
      api.users.updateTrustScore(id, trustScore),
    // Every full view goes stale, not only this id's: the identity aggregate also
    // shows from a sibling account's view.
    onSuccess: (_data, { id }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.users.one(id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.fullPrefix() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users.listPrefix() }),
      ]),
  });
}
