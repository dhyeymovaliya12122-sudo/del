/**
 * socket.ts
 * Socket.io real-time connection singleton.
 * Pure WebSocket transport to eliminate HTTP long-polling 400 Bad Request errors.
 * Preserved on window during Vite HMR to prevent orphaned duplicate socket connections.
 */
import { io, Socket } from 'socket.io-client';
import { ENV } from '../../config/env';

declare global {
  interface Window {
    __wa_socket_instance?: Socket | null;
    __wa_subscribed_rooms?: Set<string>;
  }
}

const getSubscribedRooms = (): Set<string> => {
  if (typeof window !== 'undefined') {
    if (!window.__wa_subscribed_rooms) {
      window.__wa_subscribed_rooms = new Set<string>();
    }
    return window.__wa_subscribed_rooms;
  }
  return new Set<string>();
};

export function getSocket(tenantId: string, accountId?: string): Socket {
  const token = typeof window !== 'undefined'
    ? (sessionStorage.getItem('wa_token') || localStorage.getItem('wa_token'))
    : null;

  const subscribedRooms = getSubscribedRooms();
  let socketInstance: Socket | null = typeof window !== 'undefined'
    ? window.__wa_socket_instance || null
    : null;

  if (!socketInstance) {
    socketInstance = io(`${ENV.socketUrl}/realtime`, {
      path: '/socket.io',
      transports: ['websocket'],
      upgrade: false,
      autoConnect: !!token,
      auth: { tenantId, accountId, token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 30000,
    });

    if (typeof window !== 'undefined') {
      window.__wa_socket_instance = socketInstance;
    }

    socketInstance.on('connect', () => {
      console.log('[Socket.io] Connected:', socketInstance!.id);
      for (const accId of subscribedRooms) {
        socketInstance!.emit('subscribe', { tenantId, accountId: accId });
      }
    });

    socketInstance.on('disconnect', (reason: string) => {
      if (reason !== 'io client disconnect') {
        console.warn('[Socket.io] Disconnected:', reason);
      }
    });

    socketInstance.on('connect_error', (err: Error) => {
      if (err.message && !err.message.includes('timeout')) {
        console.warn('[Socket.io] Notice:', err.message);
      }
    });
  } else {
    if (token) {
      socketInstance.auth = { tenantId, accountId, token };
      if (!socketInstance.connected) {
        socketInstance.connect();
      }
    }
  }

  if (accountId && !subscribedRooms.has(accountId)) {
    subscribedRooms.add(accountId);
    if (socketInstance.connected) {
      socketInstance.emit('subscribe', { tenantId, accountId });
    }
    console.log(`[Socket.io] Subscribed to account room: ${accountId}`);
  }

  return socketInstance;
}

export function disconnectSocket(): void {
  if (typeof window !== 'undefined' && window.__wa_socket_instance) {
    window.__wa_socket_instance.removeAllListeners();
    window.__wa_socket_instance.disconnect();
    window.__wa_socket_instance = null;
    window.__wa_subscribed_rooms?.clear();
  }
}
