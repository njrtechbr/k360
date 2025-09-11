import { z } from "zod";
import { httpClient, HttpClientError } from "@/lib/httpClient";
import type {
  UnlockedAchievement,
  AchievementConfig,
  ProcessResult,
  AchievementStats,
  PopularAchievement,
  AchievementProgress,
} from "@/types/achievements";

// Schemas de validação
export const ProcessAttendantSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
});

export const ProcessSeasonSchema = z.object({
  seasonId: z.string().min(1, "ID da temporada é obrigatório"),
});

export const CheckCriteriaSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
  achievementId: z.string().min(1, "ID da conquista é obrigatório"),
});

export const GetUnlockedSchema = z.object({
  attendantId: z.string().min(1, "ID do atendente é obrigatório"),
  seasonId: z.string().optional(),
  includeDetails: z.boolean().default(false),
});

export const GetStatsSchema = z.object({
  seasonId: z.string().optional(),
  attendantId: z.string().optional(),
});

export const GetPopularSchema = z.object({
  limit: z.number().min(1).max(100).default(10),
  seasonId: z.string().optional(),
});

// Tipos derivados dos schemas de validação
export type ProcessAttendantInput = z.infer<typeof ProcessAttendantSchema>;
export type ProcessSeasonInput = z.infer<typeof ProcessSeasonSchema>;
export type CheckCriteriaInput = z.infer<typeof CheckCriteriaSchema>;
export type GetUnlockedInput = z.infer<typeof GetUnlockedSchema>;
export type GetStatsInput = z.infer<typeof GetStatsSchema>;
export type GetPopularInput = z.infer<typeof GetPopularSchema>;

/**
 * AchievementApiClient - Cliente para operações de conquistas via API REST
 * Substitui o AchievementProcessor que usava Prisma diretamente
 */
export class AchievementApiClient {
  // === PROCESSAMENTO DE CONQUISTAS ===

  /**
   * Processar conquistas para um atendente específico
   */
  static async processAchievementsForAttendant(
    attendantId: string,
  ): Promise<number> {
    try {
      // Validar entrada
      const validatedData = ProcessAttendantSchema.parse({ attendantId });

      const response = await httpClient.post<{ newUnlocks: number }>(
        "/api/achievements/process-attendant",
        validatedData,
      );

      return response.data.newUnlocks;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao processar conquistas para atendente");
    }
  }

  /**
   * Processar conquistas para todos os atendentes
   */
  static async processAllAchievements(): Promise<ProcessResult> {
    try {
      const response = await httpClient.post<ProcessResult>(
        "/api/achievements/process",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao processar todas as conquistas");
    }
  }

  /**
   * Processar conquistas para uma temporada específica
   */
  static async processSeasonAchievements(
    seasonId: string,
  ): Promise<ProcessResult> {
    try {
      // Validar entrada
      const validatedData = ProcessSeasonSchema.parse({ seasonId });

      const response = await httpClient.post<ProcessResult>(
        "/api/achievements/process-season",
        validatedData,
      );

      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao processar conquistas da temporada");
    }
  }

  // === VERIFICAÇÃO DE CONQUISTAS ===

  /**
   * Verificar se um atendente atende aos critérios de uma conquista
   */
  static async checkAchievementCriteria(
    attendantId: string,
    achievementId: string,
  ): Promise<boolean> {
    try {
      // Validar entrada
      const validatedData = CheckCriteriaSchema.parse({
        attendantId,
        achievementId,
      });

      const response = await httpClient.post<{ meetscriteria: boolean }>(
        "/api/achievements/check",
        validatedData,
      );

      return response.data.meetscriteria;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao verificar critérios da conquista");
    }
  }

  /**
   * Buscar conquistas desbloqueadas de um atendente
   */
  static async getUnlockedAchievements(
    attendantId: string,
    seasonId?: string,
    includeDetails: boolean = false,
  ): Promise<UnlockedAchievement[]> {
    try {
      // Validar entrada
      const validatedData = GetUnlockedSchema.parse({
        attendantId,
        seasonId,
        includeDetails,
      });

      const queryParams = new URLSearchParams();
      if (validatedData.seasonId) {
        queryParams.set("seasonId", validatedData.seasonId);
      }
      if (validatedData.includeDetails) {
        queryParams.set("includeDetails", "true");
      }

      const url = `/api/achievements/unlocked/${attendantId}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await httpClient.get<UnlockedAchievement[]>(url);

      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar conquistas desbloqueadas");
    }
  }

  /**
   * Buscar todas as conquistas disponíveis
   */
  static async getAvailableAchievements(): Promise<AchievementConfig[]> {
    try {
      const response = await httpClient.get<AchievementConfig[]>(
        "/api/achievements/available",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar conquistas disponíveis");
    }
  }

  /**
   * Verificar e desbloquear conquistas para um atendente após uma nova avaliação
   */
  static async checkAndUnlockAchievements(
    attendantId: string,
    evaluationDate: Date,
  ): Promise<{
    newAchievements: Array<{ config: AchievementConfig; xpAwarded: number }>;
    totalXpAwarded: number;
  }> {
    try {
      const response = await httpClient.post<{
        newAchievements: Array<{
          config: AchievementConfig;
          xpAwarded: number;
        }>;
        totalXpAwarded: number;
      }>("/api/achievements/check-and-unlock", {
        attendantId,
        evaluationDate: evaluationDate.toISOString(),
      });

      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao verificar e desbloquear conquistas");
    }
  }

  /**
   * Obter status de todas as conquistas para um atendente
   */
  static async getAttendantAchievementStatus(attendantId: string): Promise<
    Array<{
      config: AchievementConfig;
      isUnlocked: boolean;
      unlockedAt?: Date;
      progress: number;
    }>
  > {
    try {
      const response = await httpClient.get<
        Array<{
          config: AchievementConfig;
          isUnlocked: boolean;
          unlockedAt?: string;
          progress: number;
        }>
      >(`/api/achievements/status/${attendantId}`);

      // Converter strings de data para Date objects
      return response.data.map((item) => ({
        ...item,
        unlockedAt: item.unlockedAt ? new Date(item.unlockedAt) : undefined,
      }));
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao obter status das conquistas");
    }
  }

  // === ESTATÍSTICAS DE CONQUISTAS ===

  /**
   * Buscar estatísticas gerais de conquistas
   */
  static async getAchievementStats(
    seasonId?: string,
    attendantId?: string,
  ): Promise<AchievementStats> {
    try {
      // Validar entrada
      const validatedData = GetStatsSchema.parse({ seasonId, attendantId });

      const queryParams = new URLSearchParams();
      if (validatedData.seasonId) {
        queryParams.set("seasonId", validatedData.seasonId);
      }
      if (validatedData.attendantId) {
        queryParams.set("attendantId", validatedData.attendantId);
      }

      const url = `/api/achievements/stats${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await httpClient.get<AchievementStats>(url);

      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar estatísticas de conquistas");
    }
  }

  /**
   * Buscar conquistas mais populares
   */
  static async getPopularAchievements(
    limit: number = 10,
    seasonId?: string,
  ): Promise<PopularAchievement[]> {
    try {
      // Validar entrada
      const validatedData = GetPopularSchema.parse({ limit, seasonId });

      const queryParams = new URLSearchParams();
      queryParams.set("limit", validatedData.limit.toString());
      if (validatedData.seasonId) {
        queryParams.set("seasonId", validatedData.seasonId);
      }

      const url = `/api/achievements/popular?${queryParams.toString()}`;
      const response = await httpClient.get<PopularAchievement[]>(url);

      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Dados inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar conquistas populares");
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Verificar se uma conquista específica foi desbloqueada por um atendente
   */
  static async isAchievementUnlocked(
    attendantId: string,
    achievementId: string,
    seasonId?: string,
  ): Promise<boolean> {
    try {
      const unlockedAchievements = await this.getUnlockedAchievements(
        attendantId,
        seasonId,
      );
      return unlockedAchievements.some(
        (ua) => ua.achievementId === achievementId,
      );
    } catch (error) {
      console.error("Erro ao verificar se conquista foi desbloqueada:", error);
      return false;
    }
  }

  /**
   * Buscar conquistas desbloqueadas recentemente (últimas N)
   */
  static async getRecentUnlockedAchievements(
    limit: number = 10,
  ): Promise<UnlockedAchievement[]> {
    try {
      const response = await httpClient.get<UnlockedAchievement[]>(
        `/api/achievements/recent?limit=${limit}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar conquistas recentes");
    }
  }

  /**
   * Buscar progresso de um atendente em direção a uma conquista
   */
  static async getAchievementProgress(
    attendantId: string,
    achievementId: string,
  ): Promise<AchievementProgress> {
    try {
      const response = await httpClient.get<AchievementProgress>(
        `/api/achievements/progress/${achievementId}?attendantId=${attendantId}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar progresso da conquista");
    }
  }
}

// Manter compatibilidade com o serviço original
export const AchievementProcessor = AchievementApiClient;
