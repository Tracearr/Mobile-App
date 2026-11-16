/* eslint-env jest */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { TerminationLogWithDetails } from '@tracearr/shared';

import { UserTerminationsCard } from '../UserTerminationsCard';

jest.mock('../../../lib/api', () => ({ getServerUrl: () => null, api: {} }));
jest.mock('../../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({ serverColor: () => null }),
}));

const termination = {
  id: 't-1',
  serverId: 's-1',
  serverName: 'Home',
  trigger: 'manual',
  triggeredByUsername: 'bob',
  mediaTitle: 'Heat',
  mediaType: 'movie',
  reason: null,
  success: true,
  createdAt: new Date().toISOString(),
} as unknown as TerminationLogWithDetails;

test('names who stopped the stream without an @', async () => {
  await render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}
    >
      <UserTerminationsCard
        userId="su-1"
        first={{ data: [termination], hasMore: false, total: 1 }}
        scope="identity"
        showServer={false}
      />
    </QueryClientProvider>
  );
  expect(screen.getByText('By bob')).toBeTruthy();
  expect(screen.queryByText(/@/)).toBeNull();
});
