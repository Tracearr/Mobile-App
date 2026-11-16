/* eslint-env jest */
import { render, screen } from '@testing-library/react-native';

import { UserAvatar } from '../user-avatar';

jest.mock('../../../lib/api', () => ({ getServerUrl: () => 'https://tracearr.test' }));

async function avatarUri(thumbUrl: string) {
  await render(<UserAvatar thumbUrl={thumbUrl} serverId="s-1" name="alice" />);
  const source = screen.getByLabelText('alice').props.source as { uri: string }[] | undefined;
  return source?.[0]?.uri;
}

test('loads plex.tv avatars directly', async () => {
  expect(await avatarUri('https://plex.tv/users/1/avatar')).toBe('https://plex.tv/users/1/avatar');
});

test('sends tofa avatars through the image proxy', async () => {
  const uri = await avatarUri('https://api.tofa.tv/avatars/1.png');
  expect(uri).toMatch(/^https:\/\/tracearr\.test\/api\/v1\/images\/proxy\?server=s-1&url=/);
});

test('drops avatars from any other host', async () => {
  expect(await avatarUri('https://tracker.example/pixel.png')).toBeUndefined();
  expect(screen.getByText('AL')).toBeTruthy();
});
