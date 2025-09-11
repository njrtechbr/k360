"use client";

import { useGamificationConfig } from "./useGamificationConfig";
import { useAchievements } from "./useAchievements";
import { useSeasons } from "./useSeasons";
import { useXpAndLevels } from "./useXpAndLevels";
import { useLeaderboard } from "./useLeaderboard";
import type {
  UseGamificationConfigReturn,
  UseAchievementsReturn,
  UseSeasonsReturn,
  UseXpAndLevelsReturn,
  UseLeaderboardReturn,
} from "./index";

export interface UseGamificationReturn {
  // Configurações
  config: UseGamificationConfigReturn;

  // Conquistas
  achievements: UseAchievementsReturn;

  // Temporadas
  seasons: UseSeasonsReturn;

  // XP e Níveis
  xpAndLevels: UseXpAndLevelsReturn;

  // Leaderboard
  leaderboard: UseLeaderboardReturn;

  // Estado global
  isLoading: boolean;
  hasError: boolean;

  // Ações globais
  refreshAll: () => Promise<void>;
  getOverallStats: () => {
    totalAttendants: number;
    activeSeasons: number;
    totalAchievements: number;
    totalXpDistributed: number;
    averageLevel: number;
  };
}

/**
 * Hook principal de gamificação que combina todos os sub-hooks
 * para fornecer uma interface unificada e completa.
 *
 * Este hook é ideal para:
 * - Páginas principais de gamificação
 * - Dashboards completos
 * - Componentes que precisam de múltiplas funcionalidades
 *
 * Para funcionalidades específicas, use os hooks individuais:
 * - useGamificationConfig: apenas configurações
 * - useAchievements: apenas conquistas
 * - useSeasons: apenas temporadas
 * - useXpAndLevels: apenas XP e níveis
 * - useLeaderboard: apenas leaderboard
 */
export function useGamification(): UseGamificationReturn {
  // Inicializar todos os hooks
  const config = useGamificationConfig();
  const achievements = useAchievements();
  const seasons = useSeasons();
  const xpAndLevels = useXpAndLevels();
  const leaderboard = useLeaderboard();

  // Estado global derivado
  const isLoading =
    config.isLoading ||
    achievements.isLoading ||
    seasons.isLoading ||
    xpAndLevels.isLoading ||
    leaderboard.isLoading;

  const hasError =
    !!config.error ||
    !!achievements.error ||
    !!seasons.error ||
    !!xpAndLevels.error ||
    !!leaderboard.error;

  // Atualizar todos os dados
  const refreshAll = async () => {
    await Promise.all([
      config.refreshConfig(),
      achievements.refreshAchievements(),
      seasons.refreshSeasons(),
      xpAndLevels.refreshData(),
      leaderboard.refreshLeaderboard(),
    ]);
  };

  // Obter estatísticas gerais
  const getOverallStats = () => {
    const achievementStats = achievements.getAchievementStats();
    const seasonStats = seasons.getSeasonStats();
    const xpStats = xpAndLevels.getXpStats();
    const levelStats = xpAndLevels.getLevelStats();

    // Calcular estatísticas derivadas
    const totalAttendants = leaderboard.mainLeaderboard.length;
    const totalXpDistributed = xpStats.totalXp;
    const averageLevel =
      totalAttendants > 0
        ? leaderboard.mainLeaderboard.reduce(
            (sum, entry) => sum + entry.level,
            0,
          ) / totalAttendants
        : 0;

    return {
      totalAttendants,
      activeSeasons: seasonStats.active,
      totalAchievements: achievementStats.total,
      totalXpDistributed,
      averageLevel: Math.round(averageLevel * 100) / 100, // 2 casas decimais
    };
  };

  return {
    config,
    achievements,
    seasons,
    xpAndLevels,
    leaderboard,
    isLoading,
    hasError,
    refreshAll,
    getOverallStats,
  };
}

/**
 * Hook simplificado para componentes que precisam apenas de dados básicos
 * de gamificação sem todas as funcionalidades de gerenciamento.
 */
export function useGamificationData() {
  const {
    config,
    achievements,
    seasons,
    xpAndLevels,
    leaderboard,
    isLoading,
    hasError,
  } = useGamification();

  return {
    // Dados básicos
    gamificationConfig: config.gamificationConfig,
    achievementConfig: config.achievementConfig,
    levelTrackConfig: config.levelTrackConfig,
    achievements: achievements.achievements,
    activeSeason: seasons.activeSeason,
    levelRewards: xpAndLevels.levelRewards,
    mainLeaderboard: leaderboard.mainLeaderboard,

    // Estado
    isLoading,
    hasError,

    // Funções utilitárias mais usadas
    getLevelFromXp: xpAndLevels.getLevelFromXp,
    getLevelProgress: xpAndLevels.getLevelProgress,
    getSeasonProgress: seasons.getSeasonProgress,
    getAttendantPosition: leaderboard.getAttendantPosition,
  };
}

/**
 * Hook para componentes que precisam apenas de funcionalidades de leitura
 * (sem operações de escrita/atualização).
 */
export function useGamificationReadOnly() {
  const gamificationData = useGamificationData();

  return {
    ...gamificationData,

    // Funções de cálculo e consulta apenas
    calculateXpFromEvaluation: useXpAndLevels().calculateXpFromEvaluation,
    filterAchievements: useAchievements().filterAchievements,
    getUpcomingRewards: useXpAndLevels().getUpcomingRewards,
    getOverallStats: useGamification().getOverallStats,
  };
}
