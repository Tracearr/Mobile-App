import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useTerminateSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      api.sessions.terminate(sessionId, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.sessions.activePrefix() }),
  });
}
