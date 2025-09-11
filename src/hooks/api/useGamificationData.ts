/**
 * Hook para gerenciar dados de gamificação usando APIs REST
 * Substitui o acesso direto ao PrismaProvider por chamadas HTTP
 */

import { useCallback, useMemo } from "react";
import { useApiQuery, type UseApiQueryOptions } from "./useApiQuery";
import {
  useApiMutation,
  useApiCreate,
  useApiUpdate,
  useApiDelete,
} from "./useApiMutation";
import { httpClient } from "@/lib/httpClient";
import type {
  GamificationConfig,
  Achievement,
  LevelReward,
  GamificationSeason,
  XpEvent,
  UnlockedAchievement,
  AchievementConfig,
  LevelTrackConfig,
} from "@/lib/types";

// Interfaces para os dados de resposta da API
interface GamificationApiResponse {
  ratingScores: GamificationConfig["ratingScores"];
  achievements: Achievement[];
  levelRewards: LevelReward[];
  seasons: GamificationSeason[];
  globalXpMultiplier: number;
}

interface XpEventsResponse {
  events: XpEvent[];
  totalXp: number;
  currentLevel: number;
}

interface UnlockedAchievementsResponse {
  achievements: UnlockedAchievement[];
  totalUnlocked: number;
}

interface LeaderboardEntry {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  level: number;
  position: number;
  unlockedAchievements: number;
}

interface LeaderboardResponse {
  leaderboard: LeaderboardEntry[];
  seasonId?: string;
  seasonName?: string;
}

// Opções específicas para queries de gamificação
interface UseGamificationQueryOptions extends UseApiQueryOptions {
  seasonId?: string;
  attendantId?: string;
}

export interface UseGamificationDataResult {
  // Configuração principal
  config: {
    data: GamificationApiResponse | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
  };

  // Conquistas
  achievements: {
    data: Achievement[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateAchievement: (
      id: string,
      data: Partial<AchievementConfig>,
    ) => Promise<void>;
  };

  // Eventos de XP
  xpEvents: {
    data: XpEvent[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getByAttendant: (attendantId: string) => XpEvent[];
    getTotalXp: (attendantId?: string) => number;
  };

  // Conquistas desbloqueadas
  unlockedAchievements: {
    data: UnlockedAchievement[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getByAttendant: (attendantId: string) => UnlockedAchievement[];
  };

  // Temporadas
  seasons: {
    data: GamificationSeason[] | null;
    activeSeason: GamificationSeason | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    createSeason: (season: Omit<GamificationSeason, "id">) => Promise<void>;
    updateSeason: (
      id: string,
      data: Partial<GamificationSeason>,
    ) => Promise<void>;
    deleteSeason: (id: string) => Promise<void>;
  };

  // Leaderboard
  leaderboard: {
    data: LeaderboardEntry[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    getByPosition: (position: number) => LeaderboardEntry | null;
    getByAttendant: (attendantId: string) => LeaderboardEntry | null;
  };

  // Recompensas de nível
  levelRewards: {
    data: LevelReward[] | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
    updateLevelReward: (
      level: number,
      data: Partial<LevelTrackConfig>,
    ) => Promise<void>;
  };

  // Estado global
  isLoading: boolean;
  hasError: boolean;

  // Ações globais
  refreshAll: () => Promise<void>;

  // Utilitários
  getLevelFromXp: (xp: number) => number;
  getXpForLevel: (level: number) => number;
  calculateSeasonMultiplier: (date?: Date) => number;
}

export function useGamificationData(
  options: UseGamificationQueryOptions = {},
): UseGamificationDataResult {
  const { seasonId, attendantId, ...queryOptions } = options;

  // Query para configuração principal de gamificação
  const configQuery = useApiQuery<GamificationApiResponse>(
    ["gamification", "config"],
    "/api/gamification",
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      cacheTime: 10 * 60 * 1000, // 10 minutos
      ...queryOptions,
    },
  );

  // Query para eventos de XP
  const xpEventsQuery = useApiQuery<XpEvent[]>(
    ["gamification", "xp-events", attendantId].filter(Boolean),
    attendantId
      ? `/api/gamification/xp-events/attendant/${attendantId}`
      : "/api/gamification/xp-events",
    undefined,
    {
      staleTime: 2 * 60 * 1000, // 2 minutos
      ...queryOptions,
    },
  );

  // Query para conquistas desbloqueadas
  const unlockedAchievementsQuery = useApiQuery<UnlockedAchievement[]>(
    ["gamification", "achievements", "unlocked", attendantId].filter(Boolean),
    attendantId
      ? `/api/gamification/achievements/attendant/${attendantId}`
      : "/api/gamification/achievements/unlocked",
    undefined,
    {
      staleTime: 3 * 60 * 1000, // 3 minutos
      ...queryOptions,
    },
  );

  // Query para temporadas
  const seasonsQuery = useApiQuery<GamificationSeason[]>(
    ["gamification", "seasons"],
    "/api/gamification/seasons",
    undefined,
    {
      staleTime: 10 * 60 * 1000, // 10 minutos
      ...queryOptions,
    },
  );

  // Query para temporada ativa
  const activeSeasonQuery = useApiQuery<GamificationSeason>(
    ["gamification", "seasons", "active"],
    "/api/gamification/seasons/active",
    undefined,
    {
      staleTime: 5 * 60 * 1000, // 5 minutos
      ...queryOptions,
    },
  );

  // Query para leaderboard
  const leaderboardQuery = useApiQuery<LeaderboardEntry[]>(
    ["gamification", "leaderboard", seasonId].filter(Boolean),
    seasonId
      ? `/api/gamification/leaderboard?seasonId=${seasonId}`
      : "/api/gamification/leaderboard",
    undefined,
    {
      staleTime: 1 * 60 * 1000, // 1 minuto
      ...queryOptions,
    },
  );

  // Mutations para atualizações
  const updateAchievementMutation = useApiUpdate<
    AchievementConfig,
    { id: string } & Partial<AchievementConfig>
  >((variables) => `/api/gamification/achievements/${variables.id}`);

  const updateLevelRewardMutation = useApiUpdate<
    LevelTrackConfig,
    { level: number } & Partial<LevelTrackConfig>
  >((variables) => `/api/gamification/level-rewards/${variables.level}`);

  const createSeasonMutation = useApiCreate<
    GamificationSeason,
    Omit<GamificationSeason, "id">
  >("/api/gamification/seasons");

  const updateSeasonMutation = useApiUpdate<
    GamificationSeason,
    { id: string } & Partial<GamificationSeason>
  >((variables) => `/api/gamification/seasons/${variables.id}`);

  const deleteSeasonMutation = useApiDelete<void, { id: string }>(
    (variables) => `/api/gamification/seasons/${variables.id}`,
  );

  // Função para atualizar configuração principal
  const updateConfigMutation = useApiMutation(
    async (variables: Partial<GamificationConfig>) => {
      return httpClient.put("/api/gamification", variables);
    },
  );

  // Funções utilitárias
  const getLevelFromXp = useCallback((xp: number): number => {
    // Fórmula padrão: level = floor(sqrt(xp / 100)) + 1
    return Math.floor(Math.sqrt(xp / 100)) + 1;
  }, []);

  const getXpForLevel = useCallback((level: number): number => {
    // Fórmula inversa: xp = (level - 1)^2 * 100
    return Math.pow(level - 1, 2) * 100;
  }, []);

  const calculateSeasonMultiplier = useCallback(
    (date: Date = new Date()): number => {
      const activeSeason = activeSeasonQuery.data;
      if (!activeSeason) return 1;

      const seasonStart = new Date(activeSeason.startDate);
      const seasonEnd = new Date(activeSeason.endDate);

      if (date >= seasonStart && date <= seasonEnd) {
        return activeSeason.xpMultiplier;
      }

      return 1;
    },
    [activeSeasonQuery.data],
  );

  // Funções de busca por attendant
  const getXpEventsByAttendant = useCallback(
    (attendantId: string): XpEvent[] => {
      if (!xpEventsQuery.data) return [];
      return xpEventsQuery.data.filter(
        (event) => event.attendantId === attendantId,
      );
    },
    [xpEventsQuery.data],
  );

  const getUnlockedAchievementsByAttendant = useCallback(
    (attendantId: string): UnlockedAchievement[] => {
      if (!unlockedAchievementsQuery.data) return [];
      return unlockedAchievementsQuery.data.filter(
        (achievement) => achievement.attendantId === attendantId,
      );
    },
    [unlockedAchievementsQuery.data],
  );

  const getTotalXp = useCallback(
    (attendantId?: string): number => {
      if (!xpEventsQuery.data) return 0;

      const events = attendantId
        ? getXpEventsByAttendant(attendantId)
        : xpEventsQuery.data;

      return events.reduce((total, event) => total + event.points, 0);
    },
    [xpEventsQuery.data, getXpEventsByAttendant],
  );

  // Funções de busca no leaderboard
  const getLeaderboardByPosition = useCallback(
    (position: number): LeaderboardEntry | null => {
      if (!leaderboardQuery.data) return null;
      return (
        leaderboardQuery.data.find((entry) => entry.position === position) ||
        null
      );
    },
    [leaderboardQuery.data],
  );

  const getLeaderboardByAttendant = useCallback(
    (attendantId: string): LeaderboardEntry | null => {
      if (!leaderboardQuery.data) return null;
      return (
        leaderboardQuery.data.find(
          (entry) => entry.attendantId === attendantId,
        ) || null
      );
    },
    [leaderboardQuery.data],
  );

  // Função para refresh de todos os dados
  const refreshAll = useCallback(async () => {
    await Promise.all([
      configQuery.refetch(),
      xpEventsQuery.refetch(),
      unlockedAchievementsQuery.refetch(),
      seasonsQuery.refetch(),
      activeSeasonQuery.refetch(),
      leaderboardQuery.refetch(),
    ]);
  }, [
    configQuery.refetch,
    xpEventsQuery.refetch,
    unlockedAchievementsQuery.refetch,
    seasonsQuery.refetch,
    activeSeasonQuery.refetch,
    leaderboardQuery.refetch,
  ]);

  // Handlers para mutations
  const handleUpdateAchievement = useCallback(
    async (id: string, data: Partial<AchievementConfig>) => {
      await updateAchievementMutation.mutateAsync({ id, ...data });
      await configQuery.refetch();
    },
    [updateAchievementMutation.mutateAsync, configQuery.refetch],
  );

  const handleUpdateLevelReward = useCallback(
    async (level: number, data: Partial<LevelTrackConfig>) => {
      await updateLevelRewardMutation.mutateAsync({ level, ...data });
      await configQuery.refetch();
    },
    [updateLevelRewardMutation.mutateAsync, configQuery.refetch],
  );

  const handleCreateSeason = useCallback(
    async (season: Omit<GamificationSeason, "id">) => {
      await createSeasonMutation.mutateAsync(season);
      await seasonsQuery.refetch();
      await activeSeasonQuery.refetch();
    },
    [
      createSeasonMutation.mutateAsync,
      seasonsQuery.refetch,
      activeSeasonQuery.refetch,
    ],
  );

  const handleUpdateSeason = useCallback(
    async (id: string, data: Partial<GamificationSeason>) => {
      await updateSeasonMutation.mutateAsync({ id, ...data });
      await seasonsQuery.refetch();
      await activeSeasonQuery.refetch();
    },
    [
      updateSeasonMutation.mutateAsync,
      seasonsQuery.refetch,
      activeSeasonQuery.refetch,
    ],
  );

  const handleDeleteSeason = useCallback(
    async (id: string) => {
      await deleteSeasonMutation.mutateAsync({ id });
      await seasonsQuery.refetch();
      await activeSeasonQuery.refetch();
    },
    [
      deleteSeasonMutation.mutateAsync,
      seasonsQuery.refetch,
      activeSeasonQuery.refetch,
    ],
  );

  // Estado global derivado
  const isLoading =
    configQuery.loading ||
    xpEventsQuery.loading ||
    unlockedAchievementsQuery.loading ||
    seasonsQuery.loading ||
    activeSeasonQuery.loading ||
    leaderboardQuery.loading;

  const hasError =
    !!configQuery.error ||
    !!xpEventsQuery.error ||
    !!unlockedAchievementsQuery.error ||
    !!seasonsQuery.error ||
    !!activeSeasonQuery.error ||
    !!leaderboardQuery.error;

  // Dados derivados
  const achievements = useMemo(
    () => configQuery.data?.achievements || [],
    [configQuery.data?.achievements],
  );
  const levelRewards = useMemo(
    () => configQuery.data?.levelRewards || [],
    [configQuery.data?.levelRewards],
  );
  const seasons = useMemo(() => seasonsQuery.data || [], [seasonsQuery.data]);
  const activeSeason = useMemo(
    () => activeSeasonQuery.data || null,
    [activeSeasonQuery.data],
  );

  return {
    // Configuração principal
    config: {
      data: configQuery.data,
      loading: configQuery.loading,
      error: configQuery.error,
      refetch: configQuery.refetch,
    },

    // Conquistas
    achievements: {
      data: achievements,
      loading: configQuery.loading,
      error: configQuery.error,
      refetch: configQuery.refetch,
      updateAchievement: handleUpdateAchievement,
    },

    // Eventos de XP
    xpEvents: {
      data: xpEventsQuery.data,
      loading: xpEventsQuery.loading,
      error: xpEventsQuery.error,
      refetch: xpEventsQuery.refetch,
      getByAttendant: getXpEventsByAttendant,
      getTotalXp,
    },

    // Conquistas desbloqueadas
    unlockedAchievements: {
      data: unlockedAchievementsQuery.data,
      loading: unlockedAchievementsQuery.loading,
      error: unlockedAchievementsQuery.error,
      refetch: unlockedAchievementsQuery.refetch,
      getByAttendant: getUnlockedAchievementsByAttendant,
    },

    // Temporadas
    seasons: {
      data: seasons,
      activeSeason,
      loading: seasonsQuery.loading || activeSeasonQuery.loading,
      error: seasonsQuery.error || activeSeasonQuery.error,
      refetch: async () => {
        await seasonsQuery.refetch();
        await activeSeasonQuery.refetch();
      },
      createSeason: handleCreateSeason,
      updateSeason: handleUpdateSeason,
      deleteSeason: handleDeleteSeason,
    },

    // Leaderboard
    leaderboard: {
      data: leaderboardQuery.data,
      loading: leaderboardQuery.loading,
      error: leaderboardQuery.error,
      refetch: leaderboardQuery.refetch,
      getByPosition: getLeaderboardByPosition,
      getByAttendant: getLeaderboardByAttendant,
    },

    // Recompensas de nível
    levelRewards: {
      data: levelRewards,
      loading: configQuery.loading,
      error: configQuery.error,
      refetch: configQuery.refetch,
      updateLevelReward: handleUpdateLevelReward,
    },

    // Estado global
    isLoading,
    hasError,

    // Ações globais
    refreshAll,

    // Utilitários
    getLevelFromXp,
    getXpForLevel,
    calculateSeasonMultiplier,
  };
}

/**
 * Hook simplificado para componentes que precisam apenas de dados básicos
 * de gamificação sem funcionalidades de gerenciamento.
 */
export function useGamificationReadOnly(
  options: UseGamificationQueryOptions = {},
) {
  const gamificationData = useGamificationData(options);

  return {
    // Dados básicos
    config: gamificationData.config.data,
    achievements: gamificationData.achievements.data,
    levelRewards: gamificationData.levelRewards.data,
    seasons: gamificationData.seasons.data,
    activeSeason: gamificationData.seasons.activeSeason,
    xpEvents: gamificationData.xpEvents.data,
    unlockedAchievements: gamificationData.unlockedAchievements.data,
    leaderboard: gamificationData.leaderboard.data,

    // Estado
    isLoading: gamificationData.isLoading,
    hasError: gamificationData.hasError,

    // Funções utilitárias (somente leitura)
    getLevelFromXp: gamificationData.getLevelFromXp,
    getXpForLevel: gamificationData.getXpForLevel,
    calculateSeasonMultiplier: gamificationData.calculateSeasonMultiplier,
    getXpByAttendant: gamificationData.xpEvents.getByAttendant,
    getTotalXp: gamificationData.xpEvents.getTotalXp,
    getUnlockedAchievementsByAttendant:
      gamificationData.unlockedAchievements.getByAttendant,
    getLeaderboardPosition: gamificationData.leaderboard.getByAttendant,
  };
}
