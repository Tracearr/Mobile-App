/* eslint-env jest */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { HeaderLeft, TabToolbar } from '../TabHeaderButtons';

const mockToggle = jest.fn();
let mockServers: { id: string; name: string; type: string; historicalAt: string | null }[] = [];
let mockSelected: string[] = [];

jest.mock('expo-router', () => {
  const { createElement: h } = require('react');
  const { Pressable, Text, View } = require('react-native');
  const Group = ({ children }: { children?: ReactNode }) => h(View, null, children);
  const Toolbar = Object.assign(Group, {
    Menu: Group,
    Button: () => null,
    Badge: () => null,
    MenuAction: ({
      isOn,
      disabled,
      subtitle,
      onPress,
      children,
    }: {
      isOn: boolean;
      disabled?: boolean;
      subtitle?: string;
      onPress: () => void;
      children?: ReactNode;
    }) =>
      h(
        Pressable,
        { accessibilityRole: 'menuitem', accessibilityState: { checked: isOn, disabled }, onPress },
        h(Text, null, children),
        subtitle ? h(Text, null, subtitle) : null
      ),
  });
  return { useRouter: () => ({ push: jest.fn() }), Stack: { Toolbar } };
});
jest.mock('../../../hooks', () => ({
  useUnacknowledgedAlertsCount: () => ({ count: 0, hasAlerts: false, displayCount: '0' }),
}));
jest.mock('../../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({
    servers: mockServers,
    selectedServerIds: mockSelected,
    isAllServersSelected: mockSelected.length === mockServers.length,
    toggleServer: mockToggle,
    selectAllServers: jest.fn(),
  }),
}));

const home = { id: 's-1', name: 'Home', type: 'plex', historicalAt: null };
const cabin = { id: 's-2', name: 'Cabin', type: 'jellyfin', historicalAt: '2026-01-01' };

test('shows the server button only when there is more than one server', async () => {
  mockServers = [home];
  await render(<HeaderLeft />);
  expect(screen.queryByRole('button')).toBeNull();

  mockServers = [home, cabin];
  await render(<HeaderLeft />);
  expect(screen.getByRole('button')).toBeTruthy();
});

test('iOS picks servers from a checkmarked toolbar menu', async () => {
  mockServers = [home, cabin];
  mockSelected = ['s-1'];
  await render(<TabToolbar />);
  const [all, first, second] = screen.getAllByRole('menuitem');
  expect(all?.props.accessibilityState.checked).toBe(false);
  expect(first?.props.accessibilityState).toEqual({ checked: true, disabled: true });
  expect(second?.props.accessibilityState).toEqual({ checked: false, disabled: false });
  expect(screen.getByText(/Jellyfin · /)).toBeTruthy();

  await fireEvent.press(screen.getByText('Cabin'));
  expect(mockToggle).toHaveBeenCalledWith('s-2');
});

test('iOS leaves the menu out with a single server', async () => {
  mockServers = [home];
  mockSelected = ['s-1'];
  await render(<TabToolbar />);
  expect(screen.queryByRole('menuitem')).toBeNull();
});
