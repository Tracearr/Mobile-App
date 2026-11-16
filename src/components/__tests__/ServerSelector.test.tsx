/* eslint-env jest */
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { ServerSelector } from '../ServerSelector.android';

const mockToggle = jest.fn();

jest.mock('@expo/ui/jetpack-compose', () => {
  const { createElement: h } = require('react');
  const { Pressable, Text, View } = require('react-native');
  const Slot = ({ children }: { children?: ReactNode }) => h(View, null, children);
  const ListItem = ({
    modifiers,
    children,
  }: {
    modifiers: { value: boolean; handler: () => void; enabled: boolean }[];
    children?: ReactNode;
  }) => {
    const [row] = modifiers;
    return h(
      Pressable,
      {
        accessibilityRole: 'checkbox',
        accessibilityState: { checked: row.value, disabled: !row.enabled },
        onPress: row.handler,
      },
      children
    );
  };
  Object.assign(ListItem, {
    LeadingContent: Slot,
    HeadlineContent: Slot,
    SupportingContent: Slot,
    TrailingContent: Slot,
  });
  return {
    Box: () => null,
    Host: Slot,
    LazyColumn: Slot,
    ListItem,
    Text,
    TriStateCheckbox: ({ state }: { state: string }) => h(Text, null, state),
  };
});
jest.mock('@expo/ui/jetpack-compose/modifiers', () => ({
  toggleable: (value: boolean, handler: () => void, options: { enabled: boolean }) => ({
    value,
    handler,
    enabled: options.enabled,
  }),
  size: () => ({}),
  clip: () => ({}),
  background: () => ({}),
  Shapes: {},
}));
jest.mock('../../providers/MediaServerProvider', () => ({
  useMediaServer: () => ({
    servers: [
      { id: 's-1', name: 'Home', type: 'plex', color: null, historicalAt: null },
      { id: 's-2', name: 'Cabin', type: 'jellyfin', color: '#f00', historicalAt: null },
    ],
    selectedServerIds: ['s-1'],
    isAllServersSelected: false,
    toggleServer: mockToggle,
    selectAllServers: jest.fn(),
  }),
}));

test('lists the servers as Material checkbox rows under a partly checked All row', async () => {
  await render(<ServerSelector />);
  const [all, home, cabin] = screen.getAllByRole('checkbox');
  expect(all?.props.accessibilityState).toEqual({ checked: false, disabled: false });
  expect(screen.getByText('indeterminate')).toBeTruthy();
  expect(home?.props.accessibilityState).toEqual({ checked: true, disabled: true });
  expect(cabin?.props.accessibilityState).toEqual({ checked: false, disabled: false });
  expect(screen.getByText('Jellyfin')).toBeTruthy();

  await fireEvent.press(screen.getByText('Cabin'));
  expect(mockToggle).toHaveBeenCalledWith('s-2');
});
