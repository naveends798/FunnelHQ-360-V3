import { useEffect, useRef, useCallback } from "react";
import { Notification } from "@shared/schema";

interface UseWebSocketOptions {
  userId: number;
  onNotification?: (notification: Notification) => void;
  onMessage?: (message: any) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  reconnectInterval?: number;
}

export function useWebSocket({
  userId,
  onNotification,
  onMessage,
  onConnect,
  onDisconnect,
  reconnectInterval = 5000
}: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);

  const connect = useCallback(() => {
    try {
      // Clean up existing connection
      if (wsRef.current) {
        wsRef.current.close();
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      // In development, connect to the backend server directly
      const isDev = import.meta.env.DEV;
      const host = isDev ? 'localhost:3002' : window.location.host;
      const wsUrl = `${protocol}//${host}/api/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        isConnectedRef.current = true;
        
        // Authenticate with user ID
        ws.send(JSON.stringify({
          type: 'auth',
          userId: userId
        }));

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'auth_success':
              console.log('WebSocket authenticated for user:', message.userId);
              break;
              
            case 'notification':
              console.log('Received notification:', message.data);
              onNotification?.(message.data);
              break;
              
            case 'message:new':
            case 'message:read':
            case 'typing':
              console.log('Received real-time message:', message.type, message.data);
              onMessage?.(message);
              break;
              
            case 'pong':
              // Keep-alive response
              break;
              
            case 'error':
              console.error('WebSocket server error:', message.message);
              break;
              
            default:
              console.log('Unknown WebSocket message:', message);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        isConnectedRef.current = false;
        wsRef.current = null;
        onDisconnect?.();

        // Attempt to reconnect if not manually closed
        if (event.code !== 1000 && reconnectInterval > 0) {
          console.log(`Attempting to reconnect in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      
      // Retry connection
      if (reconnectInterval > 0) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      }
    }
  }, [userId, onNotification, onMessage, onConnect, onDisconnect, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }

    isConnectedRef.current = false;
  }, []);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, []);

  // Connect on mount and when userId changes
  useEffect(() => {
    if (userId) {
      // Small delay to ensure server is ready
      const timer = setTimeout(() => {
        connect();
      }, 1000);

      return () => {
        clearTimeout(timer);
        disconnect();
      };
    }

    return () => {
      disconnect();
    };
  }, [userId, connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    isConnected: isConnectedRef.current
  };
}