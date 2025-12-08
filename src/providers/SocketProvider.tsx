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
import { storage } from '../lib/storage';
import { useAuthStore } from '../lib/authStore';
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
  const { isAuthenticated, activeServerId, serverUrl } = useAuthStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  // Track which Tracearr backend we're connected to
  const connectedServerIdRef = useRef<string | null>(null);

  const connectSocket = useCallback(async () => {
    if (!isAuthenticated || !serverUrl || !activeServerId) return;

    // If already connected to this backend, skip
    if (connectedServerIdRef.current === activeServerId && socketRef.current?.connected) {
      return;
    }

    // Disconnect existing socket if connected to different backend
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    const credentials = await storage.getServerCredentials(activeServerId);
    if (!credentials) return;

    connectedServerIdRef.current = activeServerId;

    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      auth: { token: credentials.accessToken },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      // Subscribe to session updates
      newSocket.emit('subscribe:sessions');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
      setIsConnected(false);
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
  }, [isAuthenticated, serverUrl, activeServerId, queryClient]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated && serverUrl && activeServerId) {
      void connectSocket();
    } else if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
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
  }, [isAuthenticated, serverUrl, activeServerId, connectSocket]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isAuthenticated && !isConnected) {
        // Reconnect when app comes to foreground
        void connectSocket();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isAuthenticated, isConnected, connectSocket]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
