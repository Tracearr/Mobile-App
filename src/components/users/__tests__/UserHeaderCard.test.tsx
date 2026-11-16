/* eslint-env jest */
import { render, screen } from '@testing-library/react-native';
import type { ServerUserFullDetail } from '@tracearr/shared';

import { UserHeaderCard } from '../UserHeaderCard';

jest.mock('../../../lib/api', () => ({ getServerUrl: () => null }));
jest.mock('../../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({ serverColor: () => null }),
}));
jest.mock('../TrustScoreEditor', () => ({ TrustScoreEditor: () => null }));

const user = {
  id: 'su-1',
  serverId: 's-1',
  serverName: 'Home',
  username: 'alice_plex',
  identityName: 'alice',
  email: null,
  thumbUrl: null,
  trustScore: 100,
  role: 'member',
  removedAt: null,
} as unknown as ServerUserFullDetail['user'];

const identity = {
  serverUsers: [{ id: 'su-1', serverId: 's-1', serverName: 'Home', removedAt: null }],
  aggregateTrustScore: 100,
} as unknown as ServerUserFullDetail['identity'];

test('names the person without their account username', async () => {
  await render(
    <UserHeaderCard
      user={user}
      identity={identity}
      isAllScope
      avatarSize={64}
      canEditTrust={false}
      editTarget={null}
      onEditTrust={() => {}}
    />
  );
  expect(screen.getByText('alice')).toBeTruthy();
  expect(screen.queryByText(/alice_plex/)).toBeNull();
  expect(screen.queryByText(/@/)).toBeNull();
});
