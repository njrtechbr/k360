import { useEffect, useRef, useState, useCallback } from "react";
import {
  DashboardUpdate,
  ConnectionStatus,
  WebSocketMessage,
} from "@/types/dashboard";

interface UseWebSocketOptions {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  onMessage?: (data: DashboardUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export function useWebSocket({
  url,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
  onMessage,
  onConnect,
  onDisconnect,
  onError,
}: UseWebSocketOptions) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    reconnectAttempts: 0,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    try {
      // Fechar conexão existente se houver
      if (wsRef.current) {
        wsRef.current.close();
      }

      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket conectado");
        reconnectAttemptsRef.current = 0;

        setConnectionStatus({
          connected: true,
          lastConnected: new Date(),
          reconnectAttempts: 0,
        });

        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          // Se for uma atualização do dashboard, chamar callback
          if (message.type === "update" && onMessage) {
            onMessage(message.payload as DashboardUpdate);
          }
        } catch (error) {
          console.error("Erro ao processar mensagem WebSocket:", error);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket desconectado");

        setConnectionStatus((prev) => ({
          ...prev,
          connected: false,
          reconnectAttempts: reconnectAttemptsRef.current,
        }));

        onDisconnect?.();

        // Tentar reconectar se não excedeu o limite
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;

          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `Tentativa de reconexão ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`,
            );
            connect();
          }, reconnectInterval);
        } else {
          console.log("Máximo de tentativas de reconexão atingido");
          setConnectionStatus((prev) => ({
            ...prev,
            error: "Falha ao reconectar após múltiplas tentativas",
          }));
        }
      };

      ws.onerror = (error) => {
        console.error("Erro WebSocket:", error);

        setConnectionStatus((prev) => ({
          ...prev,
          error: "Erro de conexão WebSocket",
        }));

        onError?.(error);
      };
    } catch (error) {
      console.error("Erro ao criar conexão WebSocket:", error);

      setConnectionStatus((prev) => ({
        ...prev,
        error: "Falha ao criar conexão WebSocket",
      }));
    }
  }, [
    url,
    reconnectInterval,
    maxReconnectAttempts,
    onMessage,
    onConnect,
    onDisconnect,
    onError,
  ]);

  const disconnect = useCallback(() => {
    // Limpar timeout de reconexão
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Fechar conexão WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Resetar tentativas de reconexão
    reconnectAttemptsRef.current = maxReconnectAttempts;

    setConnectionStatus({
      connected: false,
      reconnectAttempts: 0,
    });
  }, [maxReconnectAttempts]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
      return true;
    }

    console.warn(
      "WebSocket não está conectado. Mensagem não enviada:",
      message,
    );
    return false;
  }, []);

  const forceReconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    setTimeout(connect, 100);
  }, [connect, disconnect]);

  // Conectar automaticamente quando o hook é montado
  useEffect(() => {
    connect();

    // Cleanup na desmontagem
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Ping periódico para manter conexão viva
  useEffect(() => {
    if (!connectionStatus.connected) return;

    const pingInterval = setInterval(() => {
      sendMessage({ type: "ping", timestamp: new Date() });
    }, 30000); // Ping a cada 30 segundos

    return () => clearInterval(pingInterval);
  }, [connectionStatus.connected, sendMessage]);

  return {
    connectionStatus,
    sendMessage,
    forceReconnect,
    disconnect,
  };
}
