import { io, Socket } from 'socket.io-client';
import { create } from 'zustand';

interface WebSocketStore {
  socket: Socket | null;
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = create<WebSocketStore>((set) => ({
  socket: null,
  connected: false,
  connect: () => {
    const socket = io('http://localhost:4000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      set({ connected: true });
    });

    socket.on('disconnect', () => {
      set({ connected: false });
    });

    socket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    set({ socket });
  },
  disconnect: () => {
    set((state) => {
      state.socket?.disconnect();
      return { socket: null, connected: false };
    });
  },
})); 