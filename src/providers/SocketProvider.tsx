/**
 * Socket.io provider for real-time updates
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
  const { isAuthenticated, serverUrl } = useAuthStore();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectSocket = useCallback(async () => {
    if (!isAuthenticated || !serverUrl) return;

    const token = await storage.getAccessToken();
    if (!token) return;

    // Disconnect existing socket
    if (socketRef.current) {
      socketRef.current.disconnect();
    }

    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = io(serverUrl, {
      auth: { token },
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
    newSocket.on('session:started', (session: ActiveSession) => {
      queryClient.setQueryData<ActiveSession[]>(['sessions', 'active'], (old) => {
        if (!old) return [session];
        // Avoid duplicates
        const exists = old.some((s) => s.sessionKey === session.sessionKey);
        if (exists) return old;
        return [...old, session];
      });
      // Invalidate dashboard stats
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    newSocket.on('session:stopped', (sessionId: string) => {
      queryClient.setQueryData<ActiveSession[]>(['sessions', 'active'], (old) => {
        if (!old) return [];
        return old.filter((s) => s.sessionKey !== sessionId && s.id !== sessionId);
      });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    newSocket.on('session:updated', (session: ActiveSession) => {
      queryClient.setQueryData<ActiveSession[]>(['sessions', 'active'], (old) => {
        if (!old) return [session];
        return old.map((s) =>
          s.sessionKey === session.sessionKey ? session : s
        );
      });
    });

    newSocket.on('violation:new', (_violation: ViolationWithDetails) => {
      // Invalidate violations list
      void queryClient.invalidateQueries({ queryKey: ['violations'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    });

    newSocket.on('stats:updated', (stats: DashboardStats) => {
      queryClient.setQueryData(['dashboard', 'stats'], stats);
    });

    socketRef.current = newSocket;
  }, [isAuthenticated, serverUrl, queryClient]);

  // Connect/disconnect based on auth state
  useEffect(() => {
    if (isAuthenticated && serverUrl) {
      void connectSocket();
    } else if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isAuthenticated, serverUrl, connectSocket]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active' && isAuthenticated && !isConnected) {
        // Reconnect when app comes to foreground
        void connectSocket();
      } else if (nextState === 'background' && socketRef.current) {
        // Optionally disconnect when backgrounded to save battery
        // socketRef.current.disconnect();
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
