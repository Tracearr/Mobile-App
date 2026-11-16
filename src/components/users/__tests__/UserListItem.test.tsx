/* eslint-env jest */
import { render, screen } from '@testing-library/react-native';
import type { ServerUserWithIdentity } from '@tracearr/shared';

import { UserListItem } from '../UserListItem';

jest.mock('../../../lib/api', () => ({ getServerUrl: () => 'https://tracearr.test' }));
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

test("loads a merged person's picture through the server it came from", async () => {
  const merged = { ...user, thumbUrl: '/Users/2/Images/Primary', thumbServerId: 's-2' };
  await render(
    <UserListItem user={merged} onPress={() => {}} isTablet={false} showServers={false} />
  );
  const source = screen.getByLabelText('alice').props.source as { uri: string }[];
  expect(source[0].uri).toContain('server=s-2');
});

test('falls back to the account server when the server sends no thumbServerId', async () => {
  await render(
    <UserListItem
      user={{ ...user, thumbUrl: '/Users/1/Images/Primary' }}
      onPress={() => {}}
      isTablet={false}
      showServers={false}
    />
  );
  const source = screen.getByLabelText('alice').props.source as { uri: string }[];
  expect(source[0].uri).toContain('server=s-1');
});
