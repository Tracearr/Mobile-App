/**
 * Socket.io provider for real-time updates
 * Connects to Tracearr backend and invalidates queries on events
 */
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import * as Notifications from 'expo-notifications';
import { ALL_SERVERS } from '@tracearr/shared';
import { useAuthStateStore, getAccessToken } from '../lib/authStateStore';
import { api, refreshAccessToken, type UnhealthyServer } from '../lib/api';
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  ActiveSession,
  ViolationWithDetails,
  DashboardStats,
} from '@tracearr/shared';

interface SocketContextValue {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  isConnected: boolean;
}

import { queryKeys } from '@/lib/queryKeys';
const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

// session:updated fires once per active session per poll tick; trailing-edge
// throttle so a busy tick doesn't trigger a refetch per session.
const SESSION_UPDATED_THROTTLE_MS = 2000;
// The web app's windows: a stopped session or a finished run refetches whole
// lists, and both arrive in bursts.
const SESSION_STOPPED_HISTORY_THROTTLE_MS = 5000;
const RUNS_REFRESH_THROTTLE_MS = 2000;

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}

export function SocketProvider({ children }: { children: React.ReactNode }) {
  // Use the single-server auth state store with shallow compare
  const { server, tokenStatus, connectionState, isInitializing } = useAuthStateStore(
    useShallow((s) => ({
      server: s.server,
      tokenStatus: s.tokenStatus,
      connectionState: s.connectionState,
      isInitializing: s.isInitializing,
    }))
  );
  const isAuthenticated = server !== null && tokenStatus !== 'revoked';
  const serverId = server?.id ?? null;
  const serverUrl = server?.url ?? null;

  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  // Track which Tracearr backend we're connected to
  const connectedServerIdRef = useRef<string | null>(null);
  const sessionUpdatedThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runsThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectSocket = useCallback(async () => {
    // Don't try to connect during initialization or if not authenticated
    if (isInitializing || !isAuthenticated || !serverUrl || !serverId) {
      return;
    }

    // Don't connect if already unauthenticated
    if (connectionState === 'unauthenticated') {
      return;
    }

    // If already connected to this backend, skip
    if (connectedServerIdRef.current === serverId && socketRef.current?.connected) {
      return;
    }

    // Disconnect existing socket if connected to different backend
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
    }

    const accessToken = await getAccessToken();
    if (!accessToken) return;

    connectedServerIdRef.current = serverId;

    // Reconnection stays on the library defaults: unlimited attempts with 1s-5s
    // jittered backoff. A cap meant a server restart longer than ~17s left the
    // app without live updates until the next background/foreground cycle.
    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      auth: { token: accessToken },
      transports: ['polling', 'websocket'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Subscribe to session updates
      newSocket.emit('subscribe:sessions');

      // Server-side changes during a dead-socket window (e.g. iOS suspend)
      // are never pushed retroactively, so resync the core live-data caches
      // on every connect (including reconnects) rather than trusting the
      // cache to still be current.
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.activePrefix() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.statsPrefix() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.servers.health(serverId) });
    });

    newSocket.on('disconnect', (_reason) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);

      // Check if this is an authentication failure
      const isAuthError =
        error.message === 'Token expired' ||
        error.message === 'Authentication failed' ||
        error.message === 'Invalid token' ||
        error.message === 'Session has been revoked';

      if (isAuthError) {
        // Stop reconnection attempts with the stale token
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        connectedServerIdRef.current = null;

        // Try refreshing the token before giving up on auth
        void (async () => {
          try {
            await refreshAccessToken();
            // Refresh succeeded, so mark as disconnected to trigger the
            // useEffect that calls connectSocket() with the fresh token.
            useAuthStateStore.getState().setConnectionState('disconnected');
          } catch {
            // If server rejected the refresh token, refreshAccessToken already
            // called handleAuthFailure. If it was a network error, we stay
            // disconnected until the next app resume triggers a reconnect.
          }
        })();
      }
    });

    // Handle real-time events
    // Use partial query keys to invalidate ALL cached data regardless of selected media server
    // This matches the web app pattern where socket events invalidate all server-filtered caches
    newSocket.on('session:started', (_session: ActiveSession) => {
      // Invalidate all active sessions caches (any server filter)
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.activePrefix() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.statsPrefix() });
    });

    newSocket.on('session:stopped', (_sessionId: string) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.activePrefix() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.statsPrefix() });
      if (historyThrottleRef.current) return;
      historyThrottleRef.current = setTimeout(() => {
        historyThrottleRef.current = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.historyPrefix() });
      }, SESSION_STOPPED_HISTORY_THROTTLE_MS);
    });

    newSocket.on('session:updated', (_session: ActiveSession) => {
      if (sessionUpdatedThrottleRef.current) return;
      sessionUpdatedThrottleRef.current = setTimeout(() => {
        sessionUpdatedThrottleRef.current = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.activePrefix() });
      }, SESSION_UPDATED_THROTTLE_MS);
    });

    newSocket.on('violation:new', (_violation: ViolationWithDetails) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.violations.all() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.statsPrefix() });
    });

    newSocket.on('stats:updated', (_stats: DashboardStats) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.statsPrefix() });
    });

    newSocket.on('run:finished', () => {
      if (runsThrottleRef.current) return;
      runsThrottleRef.current = setTimeout(() => {
        runsThrottleRef.current = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.runs.all() });
      }, RUNS_REFRESH_THROTTLE_MS);
    });

    newSocket.on('server:down', (down) => {
      queryClient.setQueryData<UnhealthyServer[]>(queryKeys.servers.health(serverId), (old = []) =>
        old.some((s) => s.serverId === down.serverId) ? old : [...old, down]
      );
    });

    newSocket.on('server:up', (up) => {
      queryClient.setQueryData<UnhealthyServer[]>(queryKeys.servers.health(serverId), (old) =>
        old?.filter((s) => s.serverId !== up.serverId)
      );
    });

    newSocket.on('version:update', () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.versionPrefix() });
    });

    newSocket.on('servers:changed', () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.mediaServersPrefix() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.sessions.filterOptionsPrefix() });
    });

    newSocket.on('requests:changed', () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
    });

    socketRef.current = newSocket;
    setSocket(newSocket);
  }, [isInitializing, isAuthenticated, serverUrl, serverId, queryClient, connectionState]);

  // Connect/disconnect based on auth state and connection state
  useEffect(() => {
    // Don't try to connect during initialization
    if (isInitializing) {
      return;
    }

    // Unguarded on purpose: cleanup nulls socketRef before this body reruns, so
    // anything behind `if (socketRef.current)` never fires on teardown.
    if (connectionState === 'unauthenticated') {
      socketRef.current?.disconnect();
      socketRef.current = null;
      connectedServerIdRef.current = null;
      // oxlint-disable-next-line react/set-state-in-effect -- socket teardown is external-system sync
      setSocket(null);
      setIsConnected(false);
      return;
    }

    if (isAuthenticated && serverUrl && serverId) {
      // False positive: the setState lives after an await in connectSocket and
      // this effect synchronizes with an external system (the socket).
      // oxlint-disable-next-line react/set-state-in-effect
      void connectSocket();
    } else {
      socketRef.current?.disconnect();
      socketRef.current = null;
      connectedServerIdRef.current = null;
      setSocket(null);
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedServerIdRef.current = null;
      }
      for (const ref of [sessionUpdatedThrottleRef, historyThrottleRef, runsThrottleRef]) {
        if (ref.current) {
          clearTimeout(ref.current);
          ref.current = null;
        }
      }
    };
  }, [isInitializing, isAuthenticated, serverUrl, serverId, connectSocket, connectionState]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      const currentConnectionState = useAuthStateStore.getState().connectionState;
      if (
        nextState === 'active' &&
        isAuthenticated &&
        currentConnectionState !== 'unauthenticated'
      ) {
        // Reconnect when app comes to foreground
        if (!isConnected) {
          void connectSocket();
        }

        // Sync iOS app icon badge with actual unacknowledged count
        void (async () => {
          try {
            const count = await api.violations.unacknowledgedCount({ scope: ALL_SERVERS });
            await Notifications.setBadgeCountAsync(count);
          } catch {
            // Fail silently - badge might be slightly off but app shouldn't crash
          }
        })();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, isConnected, connectSocket]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>
  );
}
