/**
 * Exemplo de uso do ApiProvider
 * Demonstra como usar o novo provider baseado em APIs
 */

import React from "react";
import { ApiProvider, useApi } from "../ApiProvider";

// Exemplo de componente que usa dados
const AttendantsList = () => {
  const { attendants, addAttendant } = useApi();

  const handleAddAttendant = async () => {
    try {
      await addAttendant.mutateAsync({
        name: "Novo Atendente",
        email: "novo@example.com",
        funcao: "Atendente",
        setor: "Vendas",
        userId: "user-id",
      });
    } catch (error) {
      console.error("Erro ao adicionar atendente:", error);
    }
  };

  if (attendants.loading) {
    return <div>Carregando atendentes...</div>;
  }

  if (attendants.error) {
    return <div>Erro ao carregar atendentes: {attendants.error}</div>;
  }

  return (
    <div>
      <h2>Atendentes ({attendants.data?.length || 0})</h2>

      <button onClick={handleAddAttendant} disabled={addAttendant.loading}>
        {addAttendant.loading ? "Adicionando..." : "Adicionar Atendente"}
      </button>

      <ul>
        {attendants.data?.map((attendant) => (
          <li key={attendant.id}>
            {attendant.name} - {attendant.email}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Exemplo de componente que usa gamificação
const GamificationDashboard = () => {
  const { activeSeason, xpEvents, achievements, addXpEvent } = useApi();

  const handleAddXpEvent = async () => {
    try {
      await addXpEvent.mutateAsync({
        attendantId: "attendant-id",
        type: "EVALUATION",
        points: 10,
        description: "Avaliação positiva",
        date: new Date().toISOString(),
        seasonId: activeSeason?.id,
      });
    } catch (error) {
      console.error("Erro ao adicionar evento XP:", error);
    }
  };

  return (
    <div>
      <h2>Dashboard de Gamificação</h2>

      {activeSeason && (
        <div>
          <h3>Temporada Ativa: {activeSeason.name}</h3>
          <p>Multiplicador: {activeSeason.xpMultiplier}x</p>
        </div>
      )}

      <div>
        <h3>Eventos XP Recentes</h3>
        {xpEvents.loading && <p>Carregando eventos...</p>}
        {xpEvents.error && <p>Erro: {xpEvents.error}</p>}
        {xpEvents.data && <p>Total de eventos: {xpEvents.data.length}</p>}
      </div>

      <div>
        <h3>Conquistas</h3>
        {achievements.data?.map((achievement) => (
          <div key={achievement.id}>
            {achievement.name} - {achievement.description}
          </div>
        ))}
      </div>

      <button onClick={handleAddXpEvent} disabled={addXpEvent.loading}>
        {addXpEvent.loading ? "Adicionando..." : "Adicionar Evento XP"}
      </button>
    </div>
  );
};

// Exemplo de componente que gerencia estado global
const GlobalStateIndicator = () => {
  const {
    isAnyLoading,
    hasAnyError,
    isAuthenticated,
    fetchAllData,
    retryFailedRequests,
  } = useApi();

  return (
    <div
      style={{
        position: "fixed",
        top: 10,
        right: 10,
        padding: 10,
        background: "#f0f0f0",
        border: "1px solid #ccc",
        borderRadius: 4,
      }}
    >
      <div>
        Status: {isAuthenticated ? "🟢 Autenticado" : "🔴 Não autenticado"}
      </div>
      <div>Loading: {isAnyLoading ? "🔄 Carregando" : "✅ Pronto"}</div>
      <div>Errors: {hasAnyError ? "❌ Com erros" : "✅ Sem erros"}</div>

      <div style={{ marginTop: 10 }}>
        <button onClick={fetchAllData} style={{ marginRight: 5 }}>
          Atualizar Tudo
        </button>
        <button onClick={retryFailedRequests}>Tentar Novamente</button>
      </div>
    </div>
  );
};

// Exemplo de aplicação completa
const ExampleApp = () => {
  return (
    <ApiProvider>
      <div style={{ padding: 20 }}>
        <h1>Exemplo de Uso do ApiProvider</h1>

        <GlobalStateIndicator />

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
        >
          <AttendantsList />
          <GamificationDashboard />
        </div>
      </div>
    </ApiProvider>
  );
};

export default ExampleApp;

// Exemplo de hook customizado usando o ApiProvider
export const useAttendantStats = () => {
  const { attendants, evaluations } = useApi();

  const stats = React.useMemo(() => {
    if (!attendants.data || !evaluations.data) {
      return null;
    }

    const totalAttendants = attendants.data.length;
    const totalEvaluations = evaluations.data.length;
    const avgEvaluationsPerAttendant =
      totalAttendants > 0 ? totalEvaluations / totalAttendants : 0;

    return {
      totalAttendants,
      totalEvaluations,
      avgEvaluationsPerAttendant:
        Math.round(avgEvaluationsPerAttendant * 100) / 100,
    };
  }, [attendants.data, evaluations.data]);

  return {
    stats,
    loading: attendants.loading || evaluations.loading,
    error: attendants.error || evaluations.error,
  };
};

// Exemplo de componente usando hook customizado
export const AttendantStatsWidget = () => {
  const { stats, loading, error } = useAttendantStats();

  if (loading) return <div>Calculando estatísticas...</div>;
  if (error) return <div>Erro ao calcular estatísticas: {error}</div>;
  if (!stats) return <div>Sem dados disponíveis</div>;

  return (
    <div
      style={{
        padding: 15,
        border: "1px solid #ddd",
        borderRadius: 8,
        backgroundColor: "#f9f9f9",
      }}
    >
      <h3>Estatísticas dos Atendentes</h3>
      <div>Total de Atendentes: {stats.totalAttendants}</div>
      <div>Total de Avaliações: {stats.totalEvaluations}</div>
      <div>
        Média de Avaliações por Atendente: {stats.avgEvaluationsPerAttendant}
      </div>
    </div>
  );
};
