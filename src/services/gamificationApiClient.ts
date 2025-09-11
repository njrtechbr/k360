import { httpClient } from "@/lib/httpClient";
import { ApiResponse } from "@/lib/api-types";
import {
  GamificationSeason,
  XpEvent,
  AchievementConfig,
  UnlockedAchievement,
} from "@prisma/client";
import { z } from "zod";

// Schemas de validação (mantidos do serviço original)
export const CreateSeasonSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  startDate: z.date(),
  endDate: z.date(),
  active: z.boolean().default(false),
  xpMultiplier: z
    .number()
    .min(0.1, "Multiplicador deve ser pelo menos 0.1")
    .default(1),
});

export const UpdateSeasonSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  active: z.boolean().optional(),
  xpMultiplier: z
    .number()
    .min(0.1, "Multiplicador deve ser pelo menos 0.1")
    .optional(),
});

export const CreateAchievementSchema = z.object({
  id: z.string().min(1, "ID é obrigatório"),
  title: z.string().min(1, "Título é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  xp: z.number().min(0, "XP deve ser positivo"),
  active: z.boolean().default(true),
  icon: z.string().min(1, "Ícone é obrigatório"),
  color: z.string().min(1, "Cor é obrigatória"),
});

export type CreateSeasonData = z.infer<typeof CreateSeasonSchema>;
export type UpdateSeasonData = z.infer<typeof UpdateSeasonSchema>;
export type CreateAchievementData = z.infer<typeof CreateAchievementSchema>;

// Tipos para rankings
export interface SeasonRanking {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  position: number;
}

// Tipos estendidos com informações de API
export interface SeasonWithStats extends GamificationSeason {
  status?: {
    label: string;
    isActive: boolean;
    hasStarted: boolean;
    hasEnded: boolean;
    progress: number;
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

export class GamificationApiClient {
  // === TEMPORADAS ===

  // Buscar todas as temporadas
  static async findAllSeasons(): Promise<SeasonWithStats[]> {
    try {
      const response = await httpClient.get<{ seasons: SeasonWithStats[] }>(
        "/api/gamification/seasons",
      );
      return response.data.seasons;
    } catch (error) {
      console.error("Erro ao buscar temporadas:", error);
      throw new Error("Falha ao buscar temporadas");
    }
  }

  // Buscar temporada ativa
  static async findActiveSeason(): Promise<GamificationSeason | null> {
    try {
      const response = await httpClient.get<GamificationSeason>(
        "/api/gamification/seasons/active",
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar temporada ativa:", error);
      throw new Error("Falha ao buscar temporada ativa");
    }
  }

  // Criar temporada
  static async createSeason(
    seasonData: CreateSeasonData,
  ): Promise<GamificationSeason> {
    try {
      // Validar dados
      const validatedData = CreateSeasonSchema.parse(seasonData);

      // Validar datas
      if (validatedData.endDate <= validatedData.startDate) {
        throw new Error("Data de fim deve ser posterior à data de início");
      }

      const response = await httpClient.post<GamificationSeason>(
        "/api/gamification/seasons",
        validatedData,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao criar temporada:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  // Atualizar temporada
  static async updateSeason(
    id: string,
    seasonData: UpdateSeasonData,
  ): Promise<GamificationSeason> {
    try {
      // Validar dados
      const validatedData = UpdateSeasonSchema.parse(seasonData);

      const response = await httpClient.put<GamificationSeason>(
        `/api/gamification/seasons?id=${id}`,
        validatedData,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao atualizar temporada:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  // Deletar temporada
  static async deleteSeason(id: string): Promise<void> {
    try {
      await httpClient.delete(`/api/gamification/seasons?id=${id}`);
    } catch (error) {
      console.error("Erro ao deletar temporada:", error);
      throw error;
    }
  }

  // === EVENTOS XP ===

  // Buscar eventos XP por atendente
  static async findXpEventsByAttendant(
    attendantId: string,
  ): Promise<XpEvent[]> {
    try {
      const response = await httpClient.get<{ events: XpEvent[] }>(
        `/api/gamification/xp-events?attendantId=${attendantId}`,
      );
      return response.data.events;
    } catch (error) {
      console.error("Erro ao buscar eventos XP:", error);
      throw new Error("Falha ao buscar eventos XP");
    }
  }

  // Calcular XP total de um atendente
  static async calculateTotalXp(
    attendantId: string,
    seasonId?: string,
  ): Promise<number> {
    try {
      const params = new URLSearchParams({ attendantId });
      if (seasonId) {
        params.append("seasonId", seasonId);
      }
      params.append("includeStats", "true");

      const response = await httpClient.get<{ stats: { totalXp: number } }>(
        `/api/gamification/xp-events?${params}`,
      );
      return response.data.stats?.totalXp || 0;
    } catch (error) {
      console.error("Erro ao calcular XP total:", error);
      return 0;
    }
  }

  // Criar evento XP manual
  static async createXpEvent(data: {
    attendantId: string;
    points: number;
    reason: string;
    type: string;
    relatedId?: string;
  }): Promise<XpEvent> {
    try {
      const response = await httpClient.post<XpEvent>(
        "/api/gamification/xp-events",
        data,
      );

      // Verificar conquistas após adicionar XP
      await this.checkAchievements(data.attendantId);

      return response.data;
    } catch (error) {
      console.error("Erro ao criar evento XP:", error);
      throw error;
    }
  }

  // === CONQUISTAS ===

  // Buscar todas as configurações de conquistas
  static async findAllAchievements(): Promise<AchievementConfig[]> {
    try {
      const response = await httpClient.get<AchievementConfig[]>(
        "/api/gamification/achievements",
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar conquistas:", error);
      throw new Error("Falha ao buscar conquistas");
    }
  }

  // Criar configuração de conquista
  static async createAchievement(
    achievementData: CreateAchievementData,
  ): Promise<AchievementConfig> {
    try {
      // Validar dados
      const validatedData = CreateAchievementSchema.parse(achievementData);

      const response = await httpClient.post<AchievementConfig>(
        "/api/gamification/achievements",
        validatedData,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao criar conquista:", error);
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      throw error;
    }
  }

  // Buscar conquistas desbloqueadas de um atendente
  static async findUnlockedAchievements(
    attendantId: string,
  ): Promise<UnlockedAchievement[]> {
    try {
      const response = await httpClient.get<UnlockedAchievement[]>(
        `/api/gamification/attendants/${attendantId}/achievements`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar conquistas desbloqueadas:", error);
      throw new Error("Falha ao buscar conquistas desbloqueadas");
    }
  }

  // Desbloquear conquista
  static async unlockAchievement(
    attendantId: string,
    achievementId: string,
  ): Promise<UnlockedAchievement> {
    try {
      const response = await httpClient.post<UnlockedAchievement>(
        `/api/gamification/attendants/${attendantId}/achievements`,
        {
          achievementId,
        },
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao desbloquear conquista:", error);
      throw error;
    }
  }

  // Verificar conquistas automaticamente
  static async checkAchievements(
    attendantId: string,
  ): Promise<UnlockedAchievement[]> {
    try {
      const response = await httpClient.post<UnlockedAchievement[]>(
        `/api/gamification/attendants/${attendantId}/check-achievements`,
        {},
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao verificar conquistas:", error);
      return [];
    }
  }

  // === RANKINGS ===

  // Calcular ranking de temporada
  static async calculateSeasonRankings(
    seasonId?: string,
  ): Promise<SeasonRanking[]> {
    try {
      const params = seasonId ? `?seasonId=${seasonId}` : "";
      const response = await httpClient.get<SeasonRanking[]>(
        `/api/gamification/leaderboard${params}`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao calcular rankings:", error);
      throw new Error("Falha ao calcular rankings");
    }
  }

  // Reset de eventos XP (para nova temporada)
  static async resetXpEvents(seasonId?: string): Promise<number> {
    try {
      const params = seasonId ? `?seasonId=${seasonId}` : "";
      const response = await httpClient.delete<{ count: number }>(
        `/api/gamification/xp-events/reset${params}`,
      );
      return response.data.count;
    } catch (error) {
      console.error("Erro ao resetar eventos XP:", error);
      throw error;
    }
  }

  // === MÉTODOS AUXILIARES PARA VERIFICAÇÃO DE CONQUISTAS ===

  // Verificar critérios de conquista (implementação básica via API)
  static async checkAchievementCriteria(
    attendantId: string,
    achievementId: string,
  ): Promise<boolean> {
    try {
      const response = await httpClient.get<{ eligible: boolean }>(
        `/api/gamification/attendants/${attendantId}/achievements/${achievementId}/check`,
      );
      return response.data.eligible;
    } catch (error) {
      console.error("Erro ao verificar critérios:", error);
      return false;
    }
  }

  // Verificar sequência de 5 estrelas
  static async checkFiveStarStreak(
    attendantId: string,
    requiredStreak: number,
  ): Promise<boolean> {
    try {
      const response = await httpClient.get<{ hasStreak: boolean }>(
        `/api/gamification/attendants/${attendantId}/streak?required=${requiredStreak}`,
      );
      return response.data.hasStreak;
    } catch (error) {
      console.error("Erro ao verificar sequência 5 estrelas:", error);
      return false;
    }
  }

  // Verificar média alta com mínimo de avaliações
  static async checkHighAverage(
    attendantId: string,
    requiredAverage: number,
    minEvaluations: number,
  ): Promise<boolean> {
    try {
      const response = await httpClient.get<{ hasHighAverage: boolean }>(
        `/api/gamification/attendants/${attendantId}/average?required=${requiredAverage}&min=${minEvaluations}`,
      );
      return response.data.hasHighAverage;
    } catch (error) {
      console.error("Erro ao verificar média alta:", error);
      return false;
    }
  }

  // Verificar posição no ranking
  static async checkRankingPosition(
    attendantId: string,
    achievementId: string,
  ): Promise<boolean> {
    try {
      const response = await httpClient.get<{ hasPosition: boolean }>(
        `/api/gamification/attendants/${attendantId}/ranking/${achievementId}`,
      );
      return response.data.hasPosition;
    } catch (error) {
      console.error("Erro ao verificar posição no ranking:", error);
      return false;
    }
  }
}
