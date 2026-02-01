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
import { useAuthStateStore, getAccessToken } from '../lib/authStateStore';
import { api } from '../lib/api';
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

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
});

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

    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      auth: { token: accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      // Subscribe to session updates
      newSocket.emit('subscribe:sessions');
    });

    newSocket.on('disconnect', (_reason) => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);

      // Check if this is an authentication failure
      if (error.message === 'Authentication failed' || error.message === 'Invalid token') {
        // Stop reconnection attempts immediately
        newSocket.disconnect();
        socketRef.current = null;
        setSocket(null);
        connectedServerIdRef.current = null;

        // Use unified auth failure handler (synchronous, prevents duplicate handling)
        useAuthStateStore.getState().handleAuthFailure();
      }
    });

    // Handle real-time events
    // Use partial query keys to invalidate ALL cached data regardless of selected media server
    // This matches the web app pattern where socket events invalidate all server-filtered caches
    newSocket.on('session:started', (_session: ActiveSession) => {
      // Invalidate all active sessions caches (any server filter)
      void queryClient.invalidateQueries({ queryKey: ['sessions', 'active'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    newSocket.on('session:stopped', (_sessionId: string) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', 'active'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    newSocket.on('session:updated', (_session: ActiveSession) => {
      void queryClient.invalidateQueries({ queryKey: ['sessions', 'active'] });
    });

    newSocket.on('violation:new', (_violation: ViolationWithDetails) => {
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    newSocket.on('stats:updated', (_stats: DashboardStats) => {
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
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

    // Don't try to connect if we're in unauthenticated state (token was revoked)
    if (connectionState === 'unauthenticated') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        connectedServerIdRef.current = null;
      }
      return;
    }

    if (isAuthenticated && serverUrl && serverId) {
      void connectSocket();
    } else if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      connectedServerIdRef.current = null;
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        connectedServerIdRef.current = null;
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
            const response = await api.violations.list({
              acknowledged: false,
              pageSize: 1,
            });
            await Notifications.setBadgeCountAsync(response.total);
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
