import { useState, useEffect } from 'react';
import io, { Socket } from 'socket.io-client';
import { useToast } from '@chakra-ui/react';

interface UseSocketReturn {
  priceData: string | null;
  socket: Socket | null;
  connected: boolean;
}

export function useSocket(): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [priceData, setPriceData] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const newSocket = io('http://localhost:4000', {
      transports: ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      path: '/socket.io',
      autoConnect: true,
      forceNew: true
    });

    newSocket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      if (!connected) {
        toast({
          title: 'Connection Warning',
          description: 'WebSocket connection issue - some features may be limited',
          status: 'warning',
          duration: 3000,
          isClosable: true,
        });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    newSocket.on('price-update', (data: string) => {
      setPriceData(data);
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.removeAllListeners();
        newSocket.close();
      }
    };
  }, []);

  return { priceData, socket, connected };
} 