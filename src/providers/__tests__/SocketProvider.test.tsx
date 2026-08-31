/* eslint-env jest */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SocketProvider, useSocket } from '../SocketProvider';

type Handler = (...args: unknown[]) => void;

class MockSocket {
  handlers: Record<string, Handler[]> = {};
  connected = false;
  on = jest.fn((event: string, cb: Handler) => {
    (this.handlers[event] ??= []).push(cb);
    return this;
  });
  emit = jest.fn();
  disconnect = jest.fn(() => {
    if (!this.connected) return;
    this.connected = false;
    this.fire('disconnect', 'io client disconnect');
  });
  fire(event: string, ...args: unknown[]) {
    for (const cb of this.handlers[event] ?? []) cb(...args);
  }
  fireConnect() {
    this.connected = true;
    this.fire('connect');
  }
}

let mockSockets: MockSocket[] = [];
const mockIo = jest.fn((..._args: unknown[]) => {
  const s = new MockSocket();
  mockSockets.push(s);
  return s;
});

interface MockAuthState {
  server: { id: string; url: string } | null;
  tokenStatus: string;
  connectionState: string;
  isInitializing: boolean;
  setConnectionState: (s: string) => void;
}

let mockAuthState: MockAuthState;
const mockGetAccessToken = jest.fn(async () => 'token-abc');

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args),
}));

jest.mock('../../lib/authStateStore', () => {
  const useAuthStateStore = (selector: (s: MockAuthState) => unknown) => selector(mockAuthState);
  useAuthStateStore.getState = () => mockAuthState;
  return {
    useAuthStateStore,
    getAccessToken: () => mockGetAccessToken(),
  };
});

jest.mock('../../lib/api', () => ({
  api: {
    violations: {
      list: jest.fn(async () => ({ items: [], meta: { total: 0, page: 1, pageSize: 1 } })),
    },
  },
  refreshAccessToken: jest.fn(async () => undefined),
}));

jest.mock('expo-notifications', () => ({
  setBadgeCountAsync: jest.fn(async () => undefined),
}));

function Probe() {
  const { socket, isConnected } = useSocket();
  return (
    <>
      <Text testID="connected">{String(isConnected)}</Text>
      <Text testID="has-socket">{String(socket !== null)}</Text>
    </>
  );
}

function tree() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return (
    <QueryClientProvider client={client}>
      <SocketProvider>
        <Probe />
      </SocketProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockSockets = [];
  mockIo.mockClear();
  mockGetAccessToken.mockClear();
  mockAuthState = {
    server: { id: 'backend-1', url: 'https://tracearr.example' },
    tokenStatus: 'valid',
    connectionState: 'connected',
    isInitializing: false,
    setConnectionState: jest.fn(),
  };
});

describe('SocketProvider lifecycle', () => {
  it('connects with the auth token and subscribes to sessions', async () => {
    await render(tree());

    await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));
    expect(mockIo).toHaveBeenCalledWith('https://tracearr.example', {
      auth: { token: 'token-abc' },
      transports: ['polling', 'websocket'],
    });

    const sock = mockSockets[0]!;
    await act(() => sock.fireConnect());

    expect(screen.getByTestId('connected')).toHaveTextContent('true');
    expect(screen.getByTestId('has-socket')).toHaveTextContent('true');
    expect(sock.emit).toHaveBeenCalledWith('subscribe:sessions');
  });

  it('does not connect while unauthenticated', async () => {
    mockAuthState = {
      server: null,
      tokenStatus: 'revoked',
      connectionState: 'unauthenticated',
      isInitializing: false,
      setConnectionState: jest.fn(),
    };
    await render(tree());

    await act(async () => {});
    expect(mockIo).not.toHaveBeenCalled();
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    expect(screen.getByTestId('has-socket')).toHaveTextContent('false');
  });

  it('does not connect while auth is still initializing', async () => {
    mockAuthState = { ...mockAuthState, isInitializing: true };
    await render(tree());

    await act(async () => {});
    expect(mockIo).not.toHaveBeenCalled();
  });

  it('disconnects and reads as offline once auth is revoked', async () => {
    const { rerender } = await render(tree());
    await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));
    const sock = mockSockets[0]!;
    await act(() => sock.fireConnect());
    await waitFor(() => expect(screen.getByTestId('connected')).toHaveTextContent('true'));

    mockAuthState = {
      server: null,
      tokenStatus: 'revoked',
      connectionState: 'unauthenticated',
      isInitializing: false,
      setConnectionState: jest.fn(),
    };
    await rerender(tree());

    await waitFor(() => expect(sock.disconnect).toHaveBeenCalled());
    expect(screen.getByTestId('connected')).toHaveTextContent('false');
    expect(screen.getByTestId('has-socket')).toHaveTextContent('false');
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it('tears the socket down on unmount', async () => {
    const { unmount } = await render(tree());
    await waitFor(() => expect(mockIo).toHaveBeenCalledTimes(1));
    const sock = mockSockets[0]!;
    await act(() => sock.fireConnect());

    await unmount();
    expect(sock.disconnect).toHaveBeenCalledTimes(1);
  });
});
