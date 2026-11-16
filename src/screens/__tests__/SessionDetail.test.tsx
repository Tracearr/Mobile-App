/* eslint-env jest */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';

import { SessionDetail } from '../SessionDetail';

const mockSession = {
  id: 'sess-1',
  serverId: 's-1',
  serverUserId: 'su-1',
  server: { id: 's-1', name: 'Home', type: 'plex' },
  user: { id: 'su-1', username: 'alice_plex', identityName: 'alice', thumbUrl: null },
  state: 'playing',
  mediaType: 'movie',
  mediaTitle: 'Heat',
  year: 1995,
  thumbPath: null,
  startedAt: new Date().toISOString(),
  stoppedAt: null,
  durationMs: 60_000,
  totalDurationMs: 6_000_000,
  progressMs: 60_000,
  isTranscode: false,
  videoDecision: 'directplay',
  audioDecision: 'directplay',
  transcodeInfo: null,
  geoCity: null,
  geoRegion: null,
  geoCountry: null,
};

jest.mock('../../lib/api', () => ({
  getServerUrl: () => null,
  api: { sessions: { get: jest.fn(async () => mockSession) } },
}));
jest.mock('../../lib/authStateStore', () => ({
  useAuthStateStore: (select: (s: { connectionState: string }) => unknown) =>
    select({ connectionState: 'connected' }),
}));
jest.mock('../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({ selectedServerId: 's-1', serverColor: () => null }),
}));
jest.mock('../../lib/reviewPrompt', () => ({ maybeRequestReview: async () => {} }));
jest.mock('../../hooks/useOpenInTabs', () => ({
  useStackRoutes: () => ({ user: (id: string) => `/user/${id}` }),
}));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));

async function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(
    <QueryClientProvider client={client}>
      <SessionDetail id="sess-1" mem="m" onBack={() => {}} />
    </QueryClientProvider>
  );
}

test('names the person without their account username', async () => {
  await renderDetail();
  expect(await screen.findByText('alice')).toBeTruthy();
  expect(screen.queryByText(/alice_plex/)).toBeNull();
  expect(screen.queryByText(/@/)).toBeNull();
  expect(screen.getByText('View Profile')).toBeTruthy();
});
