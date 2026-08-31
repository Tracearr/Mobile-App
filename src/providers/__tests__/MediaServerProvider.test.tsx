/* eslint-env jest */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { MediaServerProvider, useMediaServer } from '../MediaServerProvider';

const SCOPE_KEY = 'tracearr_server_scope';
const LEGACY_ARRAY_KEY = 'tracearr_selected_media_servers';
const LEGACY_SINGLE_KEY = 'tracearr_selected_media_server';

let mockStored: Record<string, string> = {};
let mockServers: { id: string; name: string }[] = [];
let mockAuth: { server: { id: string } | null; tokenStatus: string } = {
  server: { id: 'backend-1' },
  tokenStatus: 'valid',
};

jest.mock('../../lib/resilientStorage', () => ({
  getItemAsync: jest.fn(async (k: string) => mockStored[k] ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    mockStored[k] = v;
    return true;
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    delete mockStored[k];
    return true;
  }),
}));

jest.mock('../../lib/api', () => ({
  api: { servers: { list: jest.fn(async () => mockServers) } },
}));

jest.mock('../../lib/authStateStore', () => ({
  useAuthStateStore: (selector: (s: typeof mockAuth) => unknown) => selector(mockAuth),
}));

function Probe() {
  const { scope, selectedServerIds, isAllServersSelected } = useMediaServer();
  return (
    <>
      <Text testID="mode">{scope.mode}</Text>
      <Text testID="ids">{selectedServerIds.join(',')}</Text>
      <Text testID="all">{String(isAllServersSelected)}</Text>
    </>
  );
}

function tree() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <MediaServerProvider>
        <Probe />
      </MediaServerProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockStored = {};
  mockServers = [
    { id: 's1', name: 'One' },
    { id: 's2', name: 'Two' },
    { id: 's3', name: 'Three' },
  ];
  mockAuth = { server: { id: 'backend-1' }, tokenStatus: 'valid' };
});

describe('MediaServerProvider scope', () => {
  it('defaults to all-mode when nothing is persisted', async () => {
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('all'));
    expect(screen.getByTestId('ids')).toHaveTextContent('s1,s2,s3');
    expect(screen.getByTestId('all')).toHaveTextContent('true');
  });

  it('restores a persisted subset', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['s1', 's2'] });
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('subset'));
    expect(screen.getByTestId('ids')).toHaveTextContent('s1,s2');
  });

  it('drops subset ids that are missing from the server list', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['s1', 'gone'] });
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('ids')).toHaveTextContent('s1'));
    expect(screen.getByTestId('mode')).toHaveTextContent('subset');
  });

  it('collapses a subset covering every server into all-mode', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['s1', 's2', 's3'] });
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('all'));
    expect(screen.getByTestId('all')).toHaveTextContent('true');
  });

  it('falls back to all-mode when no persisted id is still valid', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['gone-1', 'gone-2'] });
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('all'));
  });

  it('migrates the legacy array format into a persisted scope', async () => {
    mockStored[LEGACY_ARRAY_KEY] = JSON.stringify(['s1', 's2']);
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('subset'));
    expect(screen.getByTestId('ids')).toHaveTextContent('s1,s2');
    await waitFor(() => expect(mockStored[LEGACY_ARRAY_KEY]).toBeUndefined());
    expect(mockStored[SCOPE_KEY]).toBe(JSON.stringify({ mode: 'subset', serverIds: ['s1', 's2'] }));
  });

  it('migrates the single-server legacy key into a persisted scope', async () => {
    mockStored[LEGACY_SINGLE_KEY] = 's2';
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('subset'));
    expect(screen.getByTestId('ids')).toHaveTextContent('s2');
    await waitFor(() => expect(mockStored[LEGACY_SINGLE_KEY]).toBeUndefined());
    expect(mockStored[SCOPE_KEY]).toBe(JSON.stringify({ mode: 'subset', serverIds: ['s2'] }));
  });

  it('reads as all-mode once logged out', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['s1'] });
    const { rerender } = await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('subset'));

    mockAuth = { server: null, tokenStatus: 'revoked' };
    await rerender(tree());

    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('all'));
  });

  it('starts clean when re-paired after an unpair', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['s1'] });
    const first = await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('subset'));

    mockAuth = { server: null, tokenStatus: 'revoked' };
    await first.rerender(tree());
    await waitFor(() => expect(mockStored[SCOPE_KEY]).toBeUndefined());
    await first.unmount();

    mockAuth = { server: { id: 'backend-1' }, tokenStatus: 'valid' };
    await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('all'));
    expect(screen.getByTestId('ids')).toHaveTextContent('s1,s2,s3');
  });

  it('does not leave a subset persisted after logout', async () => {
    mockStored[SCOPE_KEY] = JSON.stringify({ mode: 'subset', serverIds: ['s1'] });
    mockStored[LEGACY_ARRAY_KEY] = JSON.stringify(['s1']);
    const { rerender } = await render(tree());
    await waitFor(() => expect(screen.getByTestId('mode')).toHaveTextContent('subset'));

    mockAuth = { server: null, tokenStatus: 'revoked' };
    await rerender(tree());

    await waitFor(() => expect(mockStored[LEGACY_ARRAY_KEY]).toBeUndefined());
    expect(mockStored[SCOPE_KEY]).toBeUndefined();
  });
});
