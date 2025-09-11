"use client";

import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { SeasonsService } from "@/services/gamification";
import type { GamificationSeason } from "@/lib/types";

export interface UseSeasonsReturn {
  // Estado
  seasons: GamificationSeason[];
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  previousSeason: GamificationSeason | null;
  isLoading: boolean;
  error: string | null;

  // Ações
  createSeason: (season: Omit<GamificationSeason, "id">) => Promise<void>;
  updateSeason: (
    id: string,
    data: Partial<GamificationSeason>,
  ) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  activateSeason: (id: string) => Promise<void>;
  getSeasonProgress: (season?: GamificationSeason) => {
    daysElapsed: number;
    totalDays: number;
    progressPercentage: number;
    remainingDays: number;
  };
  getSeasonStats: () => {
    total: number;
    active: number;
    upcoming: number;
    past: number;
  };
  refreshSeasons: () => Promise<void>;
}

export function useSeasons(): UseSeasonsReturn {
  const [seasons, setSeasons] = useState<GamificationSeason[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar temporadas da API
  const fetchSeasons = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/gamification/seasons");
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }

      const data = await response.json();
      const sortedSeasons = SeasonsService.sortSeasons(data.seasons || []);
      setSeasons(sortedSeasons);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      console.error("Erro ao buscar temporadas:", err);

      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível carregar as temporadas.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Carregar dados na inicialização
  useEffect(() => {
    fetchSeasons();
  }, [fetchSeasons]);

  // Calcular temporadas derivadas
  const activeSeason = SeasonsService.findActiveSeason(seasons);
  const nextSeason = SeasonsService.findNextSeason(seasons);
  const previousSeason = SeasonsService.findPreviousSeason(seasons);

  // Criar nova temporada
  const createSeason = useCallback(
    async (seasonData: Omit<GamificationSeason, "id">) => {
      try {
        setIsLoading(true);

        // Validar dados da temporada
        const validation = SeasonsService.validateSeason({
          ...seasonData,
          id: "temp-id", // ID temporário para validação
        });

        if (!validation.isValid) {
          throw new Error(validation.errors.join(", "));
        }

        const response = await fetch("/api/gamification/seasons", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(seasonData),
        });

        if (!response.ok) {
          throw new Error("Falha ao criar temporada");
        }

        const newSeason = await response.json();

        // Atualizar estado local
        setSeasons((prev) => SeasonsService.sortSeasons([...prev, newSeason]));

        toast({
          title: "Temporada Criada!",
          description: `A temporada "${seasonData.name}" foi criada com sucesso.`,
        });
      } catch (err) {
        console.error("Erro ao criar temporada:", err);
        toast({
          variant: "destructive",
          title: "Erro",
          description:
            err instanceof Error
              ? err.message
              : "Não foi possível criar a temporada.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // Atualizar temporada
  const updateSeason = useCallback(
    async (id: string, data: Partial<GamificationSeason>) => {
      try {
        setIsLoading(true);

        const response = await fetch("/api/gamification/seasons", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id,
            ...data,
          }),
        });

        if (!response.ok) {
          throw new Error("Falha ao atualizar temporada");
        }

        // Atualizar estado local
        setSeasons((prev) =>
          SeasonsService.sortSeasons(
            prev.map((season) =>
              season.id === id ? { ...season, ...data } : season,
            ),
          ),
        );

        toast({
          title: "Temporada Atualizada!",
          description: "As informações da temporada foram salvas.",
        });
      } catch (err) {
        console.error("Erro ao atualizar temporada:", err);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível salvar a temporada.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // Deletar temporada
  const deleteSeason = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);

        const response = await fetch(`/api/gamification/seasons/${id}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Falha ao deletar temporada");
        }

        // Atualizar estado local
        setSeasons((prev) => prev.filter((season) => season.id !== id));

        toast({
          title: "Temporada Deletada!",
          description: "A temporada foi removida com sucesso.",
        });
      } catch (err) {
        console.error("Erro ao deletar temporada:", err);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível deletar a temporada.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast],
  );

  // Ativar temporada
  const activateSeason = useCallback(
    async (id: string) => {
      try {
        setIsLoading(true);

        const response = await fetch(
          `/api/gamification/seasons/${id}/activate`,
          {
            method: "POST",
          },
        );

        if (!response.ok) {
          throw new Error("Falha ao ativar temporada");
        }

        // Recarregar temporadas para refletir mudanças
        await fetchSeasons();

        toast({
          title: "Temporada Ativada!",
          description: "A temporada foi ativada com sucesso.",
        });
      } catch (err) {
        console.error("Erro ao ativar temporada:", err);
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível ativar a temporada.",
        });
      } finally {
        setIsLoading(false);
      }
    },
    [toast, fetchSeasons],
  );

  // Obter progresso da temporada
  const getSeasonProgress = useCallback(
    (season?: GamificationSeason) => {
      const targetSeason = season || activeSeason;

      if (!targetSeason) {
        return {
          daysElapsed: 0,
          totalDays: 0,
          progressPercentage: 0,
          remainingDays: 0,
        };
      }

      const daysElapsed = SeasonsService.getDaysSinceStart(targetSeason);
      const totalDays = SeasonsService.getTotalDuration(targetSeason);
      const remainingDays = SeasonsService.getRemainingDays(targetSeason);
      const progressPercentage = SeasonsService.getSeasonProgress(targetSeason);

      return {
        daysElapsed,
        totalDays,
        progressPercentage,
        remainingDays,
      };
    },
    [activeSeason],
  );

  // Obter estatísticas das temporadas
  const getSeasonStats = useCallback(() => {
    const total = seasons.length;
    const active = seasons.filter((s) =>
      SeasonsService.isSeasonActive(s),
    ).length;
    const upcoming = SeasonsService.filterByStatus(seasons, "upcoming").length;
    const past = SeasonsService.filterByStatus(seasons, "past").length;

    return {
      total,
      active,
      upcoming,
      past,
    };
  }, [seasons]);

  // Atualizar dados manualmente
  const refreshSeasons = useCallback(async () => {
    await fetchSeasons();
  }, [fetchSeasons]);

  return {
    seasons,
    activeSeason,
    nextSeason,
    previousSeason,
    isLoading,
    error,
    createSeason,
    updateSeason,
    deleteSeason,
    activateSeason,
    getSeasonProgress,
    getSeasonStats,
    refreshSeasons,
  };
}
