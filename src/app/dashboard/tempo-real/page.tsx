"use client";

import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { ConnectionStatus } from "@/components/dashboard/ConnectionStatus";
import { DashboardUpdate } from "@/types/dashboard";

export default function DashboardTempoRealPage() {
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const handleMessage = (update: DashboardUpdate) => {
    console.log("Atualização recebida:", update);
    setLastUpdate(new Date());

    // Aqui processaremos as atualizações específicas nas próximas tarefas
    switch (update.type) {
      case "evaluation":
        console.log("Nova avaliação:", update.data);
        break;
      case "xp":
        console.log("Novo evento XP:", update.data);
        break;
      case "achievement":
        console.log("Nova conquista:", update.data);
        break;
      case "full_refresh":
        console.log("Atualizando todos os dados");
        break;
    }
  };

  const { connectionStatus, forceReconnect } = useWebSocket({
    url: "ws://localhost:8080",
    onMessage: handleMessage,
    onConnect: () => console.log("Dashboard conectado ao WebSocket"),
    onDisconnect: () => console.log("Dashboard desconectado do WebSocket"),
    onError: (error) => console.error("Erro WebSocket no dashboard:", error),
  });

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Tempo Real</h1>
            <p className="text-muted-foreground">
              Acompanhe métricas de gamificação e satisfação em tempo real
            </p>
          </div>

          <ConnectionStatus
            status={connectionStatus}
            onReconnect={forceReconnect}
          />
        </div>

        {lastUpdate && (
          <p className="text-sm text-muted-foreground mt-2">
            Última atualização: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widgets serão implementados nas próximas tarefas */}
        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">XP Total</h3>
          <p className="text-2xl font-bold">Carregando...</p>
          <p className="text-xs text-muted-foreground">
            Status: {connectionStatus.connected ? "Conectado" : "Desconectado"}
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Usuários Ativos</h3>
          <p className="text-2xl font-bold">Carregando...</p>
          <p className="text-xs text-muted-foreground">
            Aguardando dados em tempo real...
          </p>
        </div>

        <div className="p-4 border rounded-lg">
          <h3 className="font-semibold mb-2">Satisfação Média</h3>
          <p className="text-2xl font-bold">Carregando...</p>
          <p className="text-xs text-muted-foreground">
            WebSocket: {connectionStatus.connected ? "🟢" : "🔴"}
          </p>
        </div>
      </div>
    </div>
  );
}
