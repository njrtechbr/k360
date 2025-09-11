import { z } from "zod";
import { httpClient, HttpClientError } from "@/lib/httpClient";
import type {
  DashboardStats,
  EvaluationTrend,
  RatingDistribution,
  TopPerformers,
  GamificationOverview,
  MonthlyStats,
  PopularAchievement,
  RecentActivity,
  DashboardMetrics,
  GamificationMetrics,
  SatisfactionMetrics,
  AlertMetrics,
  RealtimeOptions,
  AlertThresholds,
} from "@/types/dashboard";

// Schemas de validação para parâmetros opcionais
export const RealtimeOptionsSchema = z
  .object({
    satisfactionPeriod: z.enum(["24h", "7d", "30d"]).default("7d"),
    alertThresholds: z
      .object({
        lowSatisfactionThreshold: z.number().min(1).max(5).default(3),
        inactivityHours: z.number().min(1).default(48),
      })
      .optional(),
  })
  .optional();

export const AlertThresholdsSchema = z.object({
  lowSatisfactionThreshold: z.number().min(1).max(5).default(3),
  inactivityHours: z.number().min(1).default(48),
});

/**
 * DashboardApiClient - Cliente para operações de dashboard via API REST
 * Substitui o DashboardService e RealtimeDashboardService que usavam Prisma diretamente
 */
export class DashboardApiClient {
  // === ESTATÍSTICAS GERAIS ===

  /**
   * Buscar estatísticas gerais do dashboard
   */
  static async getGeneralStats(): Promise<DashboardStats> {
    try {
      const response = await httpClient.get<DashboardStats>(
        "/api/dashboard/stats",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar estatísticas gerais");
    }
  }

  /**
   * Buscar tendência de avaliações
   */
  static async getEvaluationTrend(
    days: number = 30,
  ): Promise<EvaluationTrend[]> {
    try {
      const response = await httpClient.get<EvaluationTrend[]>(
        `/api/dashboard/evaluation-trend?days=${days}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar tendência de avaliações");
    }
  }

  /**
   * Buscar distribuição de notas
   */
  static async getRatingDistribution(): Promise<RatingDistribution[]> {
    try {
      const response = await httpClient.get<RatingDistribution[]>(
        "/api/dashboard/rating-distribution",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar distribuição de notas");
    }
  }

  /**
   * Buscar top performers
   */
  static async getTopPerformers(limit: number = 10): Promise<TopPerformers[]> {
    try {
      const response = await httpClient.get<TopPerformers[]>(
        `/api/dashboard/top-performers?limit=${limit}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar top performers");
    }
  }

  // === MÉTRICAS DE GAMIFICAÇÃO ===

  /**
   * Buscar visão geral da gamificação
   */
  static async getGamificationOverview(): Promise<GamificationOverview> {
    try {
      const response = await httpClient.get<GamificationOverview>(
        "/api/dashboard/gamification-overview",
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar visão geral da gamificação");
    }
  }

  /**
   * Buscar estatísticas mensais de avaliação
   */
  static async getMonthlyEvaluationStats(
    months: number = 6,
  ): Promise<MonthlyStats[]> {
    try {
      const response = await httpClient.get<MonthlyStats[]>(
        `/api/dashboard/monthly-stats?months=${months}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar estatísticas mensais");
    }
  }

  /**
   * Buscar conquistas populares
   */
  static async getPopularAchievements(
    limit: number = 10,
  ): Promise<PopularAchievement[]> {
    try {
      const response = await httpClient.get<PopularAchievement[]>(
        `/api/dashboard/popular-achievements?limit=${limit}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar conquistas populares");
    }
  }

  /**
   * Buscar atividades recentes
   */
  static async getRecentActivities(
    limit: number = 20,
  ): Promise<RecentActivity[]> {
    try {
      const response = await httpClient.get<RecentActivity[]>(
        `/api/dashboard/recent-activities?limit=${limit}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar atividades recentes");
    }
  }

  // === MÉTRICAS EM TEMPO REAL ===

  /**
   * Buscar métricas consolidadas em tempo real
   */
  static async getRealtimeMetrics(
    options?: RealtimeOptions,
  ): Promise<DashboardMetrics> {
    try {
      // Validar opções se fornecidas
      const validatedOptions = options
        ? RealtimeOptionsSchema.parse(options)
        : undefined;

      const queryParams = new URLSearchParams();
      if (validatedOptions?.satisfactionPeriod) {
        queryParams.set(
          "satisfactionPeriod",
          validatedOptions.satisfactionPeriod,
        );
      }
      if (validatedOptions?.alertThresholds) {
        queryParams.set(
          "alertThresholds",
          JSON.stringify(validatedOptions.alertThresholds),
        );
      }

      const url = `/api/dashboard/realtime${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const response = await httpClient.get<DashboardMetrics>(url);
      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Parâmetros inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar métricas em tempo real");
    }
  }

  /**
   * Buscar métricas de gamificação em tempo real
   */
  static async getGamificationMetrics(
    seasonId?: string,
  ): Promise<GamificationMetrics> {
    try {
      const url = seasonId
        ? `/api/dashboard/gamification-metrics?seasonId=${seasonId}`
        : "/api/dashboard/gamification-metrics";

      const response = await httpClient.get<GamificationMetrics>(url);
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar métricas de gamificação");
    }
  }

  /**
   * Buscar métricas de satisfação
   */
  static async getSatisfactionMetrics(
    period: string = "7d",
  ): Promise<SatisfactionMetrics> {
    try {
      const response = await httpClient.get<SatisfactionMetrics>(
        `/api/dashboard/satisfaction-metrics?period=${period}`,
      );
      return response.data;
    } catch (error) {
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar métricas de satisfação");
    }
  }

  /**
   * Buscar métricas de alertas
   */
  static async getAlertMetrics(
    thresholds?: AlertThresholds,
  ): Promise<AlertMetrics> {
    try {
      // Validar thresholds se fornecidos
      const validatedThresholds = thresholds
        ? AlertThresholdsSchema.parse(thresholds)
        : undefined;

      const url = validatedThresholds
        ? `/api/dashboard/alert-metrics?thresholds=${JSON.stringify(validatedThresholds)}`
        : "/api/dashboard/alert-metrics";

      const response = await httpClient.get<AlertMetrics>(url);
      return response.data;
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Parâmetros inválidos: ${error.errors.map((e) => e.message).join(", ")}`,
        );
      }
      if (error instanceof HttpClientError) {
        throw new Error(error.message);
      }
      throw new Error("Erro ao buscar métricas de alertas");
    }
  }
}

// Manter compatibilidade com os serviços originais
export const DashboardService = DashboardApiClient;
export const RealtimeDashboardService = DashboardApiClient;
