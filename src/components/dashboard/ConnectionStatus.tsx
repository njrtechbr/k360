"use client";

import { ConnectionStatus as ConnectionStatusType } from "@/types/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";

interface ConnectionStatusProps {
  status: ConnectionStatusType;
  onReconnect?: () => void;
}

export function ConnectionStatus({
  status,
  onReconnect,
}: ConnectionStatusProps) {
  const { connected, lastConnected, reconnectAttempts, error } = status;

  return (
    <div className="flex items-center gap-2">
      {connected ? (
        <>
          <Wifi className="h-4 w-4 text-green-500" />
          <Badge variant="outline" className="text-green-700 border-green-200">
            Conectado
          </Badge>
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-red-500" />
          <Badge variant="outline" className="text-red-700 border-red-200">
            Desconectado
          </Badge>

          {reconnectAttempts > 0 && (
            <span className="text-sm text-muted-foreground">
              Tentativas: {reconnectAttempts}
            </span>
          )}

          {onReconnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Reconectar
            </Button>
          )}
        </>
      )}

      {lastConnected && (
        <span className="text-xs text-muted-foreground">
          Última conexão: {lastConnected.toLocaleTimeString()}
        </span>
      )}

      {error && (
        <span className="text-xs text-red-500" title={error}>
          Erro de conexão
        </span>
      )}
    </div>
  );
}
