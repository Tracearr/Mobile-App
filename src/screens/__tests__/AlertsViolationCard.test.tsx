/* eslint-env jest */
import { render, screen } from '@testing-library/react-native';
import type { ViolationWithDetails } from '@tracearr/shared';

import { ViolationCard } from '../../../app/alerts';

jest.mock('../../lib/api', () => ({ getServerUrl: () => null, api: {} }));
jest.mock('../../lib/authStateStore', () => ({ useAuthStateStore: () => null }));
jest.mock('../../hooks', () => ({}));
jest.mock('expo-notifications', () => ({}));
jest.mock('../ViolationDetail', () => ({ ViolationDetail: () => null }));

const violation = {
  id: 'v-1',
  severity: 'warning',
  createdAt: new Date().toISOString(),
  acknowledgedAt: null,
  data: {},
  rule: { id: 'r-1', type: 'concurrent_streams', name: 'Two streams' },
  user: {
    id: 'su-1',
    serverId: 's-1',
    username: 'alice_plex',
    identityName: 'alice',
    thumbUrl: null,
  },
  server: { id: 's-1', name: 'Home', type: 'plex' },
} as unknown as ViolationWithDetails;

test('names the person without their account username', async () => {
  await render(
    <ViolationCard
      violation={violation}
      onAcknowledge={() => {}}
      isAcknowledging={false}
      onPress={() => {}}
      unitSystem="metric"
    />
  );
  expect(screen.getByText('alice')).toBeTruthy();
  expect(screen.queryByText(/alice_plex/)).toBeNull();
  expect(screen.queryByText(/@/)).toBeNull();
});
