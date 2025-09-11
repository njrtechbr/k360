/**
 * Exemplo de uso do hook useGamificationData
 * Demonstra como usar o hook para gerenciar dados de gamificação via API
 */

import React from "react";
import {
  useGamificationData,
  useGamificationReadOnly,
} from "../useGamificationData";

// Exemplo 1: Hook completo com funcionalidades de gerenciamento
export function GamificationDashboard() {
  const {
    config,
    achievements,
    xpEvents,
    seasons,
    leaderboard,
    isLoading,
    hasError,
    refreshAll,
    getLevelFromXp,
  } = useGamificationData();

  if (isLoading) {
    return <div>Carregando dados de gamificação...</div>;
  }

  if (hasError) {
    return <div>Erro ao carregar dados de gamificação</div>;
  }

  return (
    <div className="gamification-dashboard">
      <h1>Dashboard de Gamificação</h1>

      {/* Configuração atual */}
      <section>
        <h2>Configuração</h2>
        <p>Multiplicador global: {config.data?.globalXpMultiplier}</p>
        <p>Temporada ativa: {seasons.activeSeason?.name || "Nenhuma"}</p>
      </section>

      {/* Conquistas */}
      <section>
        <h2>Conquistas ({achievements.data?.length || 0})</h2>
        {achievements.data?.map((achievement) => (
          <div key={achievement.id} className="achievement-card">
            <h3>{achievement.title}</h3>
            <p>{achievement.description}</p>
            <p>XP: {achievement.xp}</p>
            <button
              onClick={() =>
                achievements.updateAchievement(achievement.id, {
                  active: !achievement.active,
                })
              }
            >
              {achievement.active ? "Desativar" : "Ativar"}
            </button>
          </div>
        ))}
      </section>

      {/* Leaderboard */}
      <section>
        <h2>Leaderboard</h2>
        {leaderboard.data?.map((entry) => (
          <div key={entry.attendantId} className="leaderboard-entry">
            <span>#{entry.position}</span>
            <span>{entry.attendantName}</span>
            <span>{entry.totalXp} XP</span>
            <span>Nível {entry.level}</span>
          </div>
        ))}
      </section>

      {/* Ações */}
      <section>
        <button onClick={refreshAll}>Atualizar Dados</button>

        <button
          onClick={() => {
            const newSeason = {
              name: "Nova Temporada",
              startDate: new Date().toISOString(),
              endDate: new Date(
                Date.now() + 90 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              active: true,
              xpMultiplier: 1.5,
            };
            seasons.createSeason(newSeason);
          }}
        >
          Criar Nova Temporada
        </button>
      </section>
    </div>
  );
}

// Exemplo 2: Hook somente leitura para componentes simples
export function AttendantProfile({ attendantId }: { attendantId: string }) {
  const {
    xpEvents,
    unlockedAchievements,
    leaderboard,
    activeSeason,
    isLoading,
    getLevelFromXp,
    getTotalXp,
    getLeaderboardPosition,
  } = useGamificationReadOnly({ attendantId });

  if (isLoading) {
    return <div>Carregando perfil...</div>;
  }

  const totalXp = getTotalXp(attendantId);
  const level = getLevelFromXp(totalXp);
  const position = getLeaderboardPosition(attendantId);
  const attendantAchievements =
    unlockedAchievements?.filter((ua) => ua.attendantId === attendantId) || [];

  return (
    <div className="attendant-profile">
      <h2>Perfil do Atendente</h2>

      <div className="stats">
        <div>XP Total: {totalXp}</div>
        <div>Nível: {level}</div>
        <div>Posição: #{position?.position || "N/A"}</div>
        <div>Conquistas: {attendantAchievements.length}</div>
      </div>

      {activeSeason && (
        <div className="season-info">
          <h3>Temporada Atual</h3>
          <p>{activeSeason.name}</p>
          <p>Multiplicador: {activeSeason.xpMultiplier}x</p>
        </div>
      )}

      <div className="recent-xp">
        <h3>Eventos de XP Recentes</h3>
        {xpEvents?.slice(0, 5).map((event) => (
          <div key={event.id} className="xp-event">
            <span>{event.reason}</span>
            <span>+{event.points} XP</span>
            <span>{new Date(event.date).toLocaleDateString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Exemplo 3: Hook com filtros específicos
export function SeasonLeaderboard({ seasonId }: { seasonId?: string }) {
  const { leaderboard, seasons, isLoading } = useGamificationData({ seasonId });

  const currentSeason = seasons.data?.find((s) => s.id === seasonId);

  if (isLoading) {
    return <div>Carregando leaderboard...</div>;
  }

  return (
    <div className="season-leaderboard">
      <h2>Leaderboard - {currentSeason?.name || "Geral"}</h2>

      {leaderboard.data?.map((entry, index) => (
        <div key={entry.attendantId} className="leaderboard-row">
          <div className="position">#{entry.position}</div>
          <div className="name">{entry.attendantName}</div>
          <div className="xp">{entry.totalXp} XP</div>
          <div className="level">Nível {entry.level}</div>
          <div className="achievements">
            {entry.unlockedAchievements} conquistas
          </div>
        </div>
      ))}
    </div>
  );
}

// Exemplo 4: Uso com estados de loading e erro
export function GamificationStats() {
  const { config, achievements, xpEvents, isLoading, hasError } =
    useGamificationData();

  // Estados de loading
  if (isLoading) {
    return (
      <div className="loading-state">
        <div>Carregando estatísticas...</div>
        <div className="spinner" />
      </div>
    );
  }

  // Estados de erro
  if (hasError) {
    return (
      <div className="error-state">
        <h3>Erro ao carregar dados</h3>
        <p>Não foi possível carregar as estatísticas de gamificação.</p>
        <button onClick={() => window.location.reload()}>
          Tentar Novamente
        </button>
      </div>
    );
  }

  // Cálculos de estatísticas
  const totalXpDistributed =
    xpEvents.data?.reduce((sum, event) => sum + event.points, 0) || 0;
  const activeAchievements =
    achievements.data?.filter((a) => a.active).length || 0;
  const totalAchievements = achievements.data?.length || 0;

  return (
    <div className="gamification-stats">
      <h2>Estatísticas de Gamificação</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>XP Total Distribuído</h3>
          <p className="stat-value">{totalXpDistributed.toLocaleString()}</p>
        </div>

        <div className="stat-card">
          <h3>Conquistas Ativas</h3>
          <p className="stat-value">
            {activeAchievements}/{totalAchievements}
          </p>
        </div>

        <div className="stat-card">
          <h3>Multiplicador Global</h3>
          <p className="stat-value">{config.data?.globalXpMultiplier}x</p>
        </div>
      </div>
    </div>
  );
}
