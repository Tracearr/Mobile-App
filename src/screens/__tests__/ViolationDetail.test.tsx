/* eslint-env jest */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import { ViolationDetail } from '../ViolationDetail';

const mockViolation = {
  id: 'v-1',
  severity: 'warning',
  createdAt: new Date().toISOString(),
  acknowledgedAt: null,
  data: {},
  userNames: {},
  rule: { id: 'r-1', type: 'concurrent_streams', name: 'Two streams' },
  user: {
    id: 'su-1',
    serverId: 's-1',
    username: 'alice_plex',
    identityName: 'alice',
    thumbUrl: null,
  },
  server: { id: 's-1', name: 'Home', type: 'plex' },
  session: null,
  relatedSessions: [],
  actionResults: [],
};

jest.mock('../../lib/api', () => ({
  getServerUrl: () => null,
  api: {
    settings: { get: jest.fn(async () => ({})) },
    violations: {
      get: jest.fn(async () => mockViolation),
      acknowledge: jest.fn(),
      dismiss: jest.fn(),
    },
  },
}));
jest.mock('../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({ servers: [], selectedServerId: 's-1', serverColor: () => null }),
}));
jest.mock('../../hooks/useOpenInTabs', () => ({
  useStackRoutes: () => ({ user: (id: string) => `/user/${id}` }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

test('names the person without their account username', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(
    <QueryClientProvider client={client}>
      <ViolationDetail id="v-1" mem="m" onBack={() => {}} />
    </QueryClientProvider>
  );
  expect((await screen.findAllByText('alice')).length).toBeGreaterThan(0);
  expect(screen.queryByText(/alice_plex/)).toBeNull();
  expect(screen.queryByText(/@/)).toBeNull();
});
