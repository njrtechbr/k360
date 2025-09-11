"use client";

import { useApiQuery } from "@/hooks/api";
import type { GamificationSeason } from "@/lib/types";

export interface ActiveSeasonData extends GamificationSeason {
  status: {
    label: "active";
    isActive: true;
    hasStarted: true;
    hasEnded: false;
    progress: number;
    remainingDays: number;
  };
  duration: {
    totalDays: number;
    elapsedDays: number;
    remainingDays: number;
  };
  stats?: {
    totalParticipants: number;
    totalXpDistributed: number;
    averageXpPerParticipant: number;
    topPerformer: {
      name: string;
      xp: number;
    } | null;
  };
}

export interface UseActiveSeasonOptions {
  includeStats?: boolean;
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
}

export function useActiveSeason(options: UseActiveSeasonOptions = {}) {
  const {
    includeStats = false,
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 2 * 60 * 1000, // 2 minutos - dados de temporada mudam com menos frequência
  } = options;

  const queryParams = includeStats ? { includeStats: "true" } : undefined;

  const {
    data: activeSeason,
    loading: isLoading,
    error,
    refetch,
    isStale,
    isFetching,
  } = useApiQuery<ActiveSeasonData>(
    [
      "gamification",
      "seasons",
      "active",
      includeStats ? "with-stats" : "basic",
    ],
    "/api/gamification/seasons/active",
    queryParams,
    {
      enabled,
      refetchOnWindowFocus,
      staleTime,
      onError: (error) => {
        console.error("Erro ao carregar temporada ativa:", error);
      },
    },
  );

  return {
    activeSeason,
    isLoading,
    error,
    refetch,
    isStale,
    isFetching,
    hasActiveSeason: activeSeason !== null && activeSeason !== undefined,
    // Propriedades de conveniência para acesso rápido
    seasonProgress: activeSeason?.status?.progress ?? 0,
    remainingDays: activeSeason?.status?.remainingDays ?? 0,
    totalParticipants: activeSeason?.stats?.totalParticipants ?? 0,
    totalXpDistributed: activeSeason?.stats?.totalXpDistributed ?? 0,
  };
}
