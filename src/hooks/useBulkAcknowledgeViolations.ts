import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { ALL_SERVERS } from '@tracearr/shared';
import { api, type BulkAcknowledgeInput } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';

export function useBulkAcknowledgeViolations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BulkAcknowledgeInput) => api.violations.bulkAcknowledge(input),
    // violations.all() is the prefix of every list, the per-user lists and the unacknowledged counts.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
      void api.violations
        .unacknowledgedCount({ scope: ALL_SERVERS })
        .then((count) => Notifications.setBadgeCountAsync(count))
        .catch(() => {});
    },
  });
}
