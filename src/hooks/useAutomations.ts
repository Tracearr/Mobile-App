import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Automation, AutomationKind, ListResponse } from '@tracearr/shared';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import { SERVER_2_2, useServerVersion } from './useServerVersion';

export function useAutomations(kind?: AutomationKind) {
  const { supports } = useServerVersion();
  return useQuery({
    queryKey: queryKeys.automations.list(kind),
    queryFn: ({ signal }) => api.automations.list({ kind }, signal),
    enabled: supports(SERVER_2_2),
    staleTime: 1000 * 60 * 5,
  });
}

export function useSetAutomationActive() {
  const queryClient = useQueryClient();
  const lists = { queryKey: queryKeys.automations.listPrefix() };

  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.automations.setActive(id, isActive),
    onMutate: async ({ id, isActive }) => {
      await queryClient.cancelQueries(lists);
      const previous = queryClient.getQueriesData<ListResponse<Automation>>(lists);
      queryClient.setQueriesData<ListResponse<Automation>>(lists, (old) =>
        old
          ? {
              ...old,
              data: old.data.map((automation) =>
                automation.id === id ? { ...automation, isActive } : automation
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_error, _variables, onMutateResult) => {
      for (const [key, data] of onMutateResult?.previous ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.automations.all() }),
  });
}
