import { z } from "zod";
import { httpClient, HttpClientError } from "@/lib/httpClient";
import { logError } from "@/lib/errors";

// Importar tipos do cliente API ao invés do Prisma
export interface XpEvent {
  id: string;
  attendantId: string;
  points: number;
  basePoints?: number;
  multiplier?: number;
  reason: string;
  type: string;
  relatedId?: string;
  date: Date;
  seasonId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GamificationSeason {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  active: boolean;
  xpMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementConfig {
  id: string;
  title: string;
  description: string;
  xp: number;
  active: boolean;
  icon: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UnlockedAchievement {
  id: string;
  attendantId: string;
  achievementId: string;
  seasonId?: string;
  unlockedAt: Date;
  xpGained: number;
  createdAt: Date;
  updatedAt: Date;
}

// Schemas de validação
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

export class GamificationService {
  // === TEMPORADAS ===

  // Buscar todas as temporadas
  static async findAllSeasons(): Promise<GamificationSeason[]> {
    try {
      const response = await httpClient.get<{ seasons: GamificationSeason[] }>(
        "/api/gamification/seasons",
      );
      return response.data.seasons;
    } catch (error) {
      logError(error as Error, "GamificationService.findAllSeasons");
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
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
      if (error instanceof HttpClientError && error.status === 404) {
        return null; // Nenhuma temporada ativa
      }
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
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
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
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
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
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
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
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Falha ao buscar eventos XP");
    }
  }

  // Calcular XP total de um atendente
  static async calculateTotalXp(
    attendantId: string,
    seasonId?: string,
  ): Promise<number> {
    try {
      let url = `/api/gamification/xp-events?attendantId=${attendantId}&includeStats=true`;
      if (seasonId) {
        // Para filtrar por temporada, precisamos buscar as datas da temporada
        const season = await this.findActiveSeason();
        if (season && season.id === seasonId) {
          url += `&startDate=${season.startDate.toISOString()}&endDate=${season.endDate.toISOString()}`;
        }
      }

      const response = await httpClient.get<{ stats: { totalXp: number } }>(
        url,
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
      // Buscar temporada ativa para aplicar multiplicador
      const activeSeason = await this.findActiveSeason();
      const multiplier = activeSeason?.xpMultiplier || 1;
      const finalPoints = data.points * multiplier;

      const xpEventData = {
        attendantId: data.attendantId,
        points: finalPoints,
        basePoints: data.points,
        multiplier: multiplier,
        reason: data.reason,
        type: data.type,
        relatedId: data.relatedId || "",
      };

      const response = await httpClient.post<XpEvent>(
        "/api/gamification/xp-events",
        xpEventData,
      );

      // Verificar conquistas após adicionar XP
      await this.checkAchievements(data.attendantId);

      return response.data;
    } catch (error) {
      console.error("Erro ao criar evento XP:", error);
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
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
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
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
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
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
        `/api/gamification/achievements/unlocked?attendantId=${attendantId}`,
      );
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar conquistas desbloqueadas:", error);
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
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
        "/api/gamification/achievements/unlocked",
        {
          attendantId,
          achievementId,
        },
      );

      return response.data;
    } catch (error) {
      console.error("Erro ao desbloquear conquista:", error);
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }

  // Verificar conquistas automaticamente
  static async checkAchievements(
    attendantId: string,
  ): Promise<UnlockedAchievement[]> {
    try {
      const response = await httpClient.post<{
        newAchievements: UnlockedAchievement[];
        totalXpAwarded: number;
      }>(`/api/gamification/achievements/check/${attendantId}`);

      return response.data.newAchievements;
    } catch (error) {
      console.error("Erro ao verificar conquistas:", error);
      if (error instanceof HttpClientError) {
        console.error("HTTP Error:", error.message);
      }
      return [];
    }
  }

  // === RANKINGS ===

  // Calcular ranking de temporada
  static async calculateSeasonRankings(seasonId?: string): Promise<
    Array<{
      attendantId: string;
      attendantName: string;
      totalXp: number;
      position: number;
    }>
  > {
    try {
      let url = "/api/gamification/leaderboard";
      if (seasonId) {
        url += `?seasonId=${seasonId}`;
      }

      const response = await httpClient.get<{
        leaderboard: Array<{
          attendant: { id: string; name: string };
          totalXp: number;
          position: number;
        }>;
      }>(url);

      // Converter para o formato esperado
      return response.data.leaderboard.map((item) => ({
        attendantId: item.attendant.id,
        attendantName: item.attendant.name,
        totalXp: item.totalXp,
        position: item.position,
      }));
    } catch (error) {
      console.error("Erro ao calcular rankings:", error);
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Falha ao calcular rankings");
    }
  }

  // Reset de eventos XP (para nova temporada)
  static async resetXpEvents(seasonId?: string): Promise<number> {
    try {
      // Para reset de XP, vamos usar uma abordagem de deletar eventos por temporada
      // Isso requer uma implementação específica na API ou usar filtros de data
      let url = "/api/gamification/xp-events";
      if (seasonId) {
        // Buscar datas da temporada para filtrar
        const seasons = await this.findAllSeasons();
        const season = seasons.find((s) => s.id === seasonId);
        if (season) {
          url += `?startDate=${season.startDate.toISOString()}&endDate=${season.endDate.toISOString()}`;
        }
      }

      // Por enquanto, retornamos 0 pois não temos endpoint específico para reset
      // Em uma implementação completa, seria necessário criar um endpoint DELETE específico
      console.warn(
        "Reset de XP events não implementado via API - requer endpoint específico",
      );
      return 0;
    } catch (error) {
      console.error("Erro ao resetar eventos XP:", error);
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw error;
    }
  }
}
