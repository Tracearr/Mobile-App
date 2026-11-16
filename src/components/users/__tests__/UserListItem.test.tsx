/* eslint-env jest */
import { render, screen } from '@testing-library/react-native';
import type { ServerUserWithIdentity } from '@tracearr/shared';

import { UserListItem } from '../UserListItem';

jest.mock('../../../lib/api', () => ({ getServerUrl: () => null }));
jest.mock('../../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({ serverColor: () => null }),
}));

const user = {
  id: 'su-1',
  userId: 'u-1',
  serverId: 's-1',
  serverName: 'Home',
  externalId: 'x',
  username: 'alice_plex',
  identityName: 'alice',
  email: null,
  thumbUrl: null,
  isServerAdmin: false,
  trustScore: 100,
  role: 'member',
  joinedAt: null,
  lastActivityAt: null,
  removedAt: null,
} as unknown as ServerUserWithIdentity;

test('names the person without their account username', async () => {
  await render(
    <UserListItem user={user} onPress={() => {}} isTablet={false} showServers={false} />
  );
  expect(screen.getByText('alice')).toBeTruthy();
  expect(screen.queryByText(/alice_plex/)).toBeNull();
  expect(screen.queryByText(/@/)).toBeNull();
});
