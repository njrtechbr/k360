/**
 * Testes abrangentes para DashboardApiClient
 * Cobre todos os métodos, error handling, validação e edge cases
 */

import { DashboardApiClient } from "../dashboardApiClient";
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
} from "@/types/dashboard";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("DashboardApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === TESTES DE ESTATÍSTICAS GERAIS ===

  describe("getGeneralStats", () => {
    it("should return general stats successfully", async () => {
      const mockStats: DashboardStats = {
        totalEvaluations: 1500,
        totalAttendants: 45,
        averageRating: 4.2,
        totalXp: 125000,
        activeSeasons: 2,
        unlockedAchievements: 89,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await DashboardApiClient.getGeneralStats();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/dashboard/stats");
      expect(result).toEqual(mockStats);
    });

    it("should handle HttpClientError", async () => {
      const error = Object.create(HttpClientError.prototype);
      error.message = "Dashboard stats not found";
      error.status = 404;
      error.name = "HttpClientError";

      mockHttpClient.get.mockRejectedValue(error);

      await expect(DashboardApiClient.getGeneralStats()).rejects.toThrow(
        "Dashboard stats not found",
      );
    });

    it("should handle generic errors", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Network error"));

      await expect(DashboardApiClient.getGeneralStats()).rejects.toThrow(
        "Erro ao buscar estatísticas gerais",
      );
    });
  });

  describe("getEvaluationTrend", () => {
    it("should return evaluation trend with default days", async () => {
      const mockTrend: EvaluationTrend[] = [
        { date: "2024-01-01", count: 25, averageRating: 4.1 },
        { date: "2024-01-02", count: 30, averageRating: 4.3 },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockTrend,
      });

      const result = await DashboardApiClient.getEvaluationTrend();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/evaluation-trend?days=30",
      );
      expect(result).toEqual(mockTrend);
    });

    it("should return evaluation trend with custom days", async () => {
      const mockTrend: EvaluationTrend[] = [
        { date: "2024-01-01", count: 25, averageRating: 4.1 },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockTrend,
      });

      const result = await DashboardApiClient.getEvaluationTrend(7);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/evaluation-trend?days=7",
      );
      expect(result).toEqual(mockTrend);
    });
  });

  describe("getRatingDistribution", () => {
    it("should return rating distribution successfully", async () => {
      const mockDistribution: RatingDistribution[] = [
        { rating: 1, count: 10, percentage: 2.5 },
        { rating: 2, count: 20, percentage: 5.0 },
        { rating: 3, count: 50, percentage: 12.5 },
        { rating: 4, count: 150, percentage: 37.5 },
        { rating: 5, count: 170, percentage: 42.5 },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockDistribution,
      });

      const result = await DashboardApiClient.getRatingDistribution();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/rating-distribution",
      );
      expect(result).toEqual(mockDistribution);
    });
  });

  describe("getTopPerformers", () => {
    it("should return top performers with default limit", async () => {
      const mockPerformers: TopPerformers[] = [
        {
          attendantId: "1",
          attendantName: "João Silva",
          averageRating: 4.8,
          totalEvaluations: 150,
          totalXp: 5000,
          rank: 1,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockPerformers,
      });

      const result = await DashboardApiClient.getTopPerformers();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/top-performers?limit=10",
      );
      expect(result).toEqual(mockPerformers);
    });

    it("should return top performers with custom limit", async () => {
      const mockPerformers: TopPerformers[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockPerformers,
      });

      const result = await DashboardApiClient.getTopPerformers(5);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/top-performers?limit=5",
      );
      expect(result).toEqual(mockPerformers);
    });
  });

  // === TESTES DE MÉTRICAS DE GAMIFICAÇÃO ===

  describe("getGamificationOverview", () => {
    it("should return gamification overview successfully", async () => {
      const mockOverview: GamificationOverview = {
        totalXp: 125000,
        activeUsers: 42,
        totalAchievements: 25,
        unlockedAchievements: 89,
        averageLevel: 3.2,
        topRanking: [
          { attendantId: "1", attendantName: "João Silva", xp: 5000, level: 5 },
        ],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockOverview,
      });

      const result = await DashboardApiClient.getGamificationOverview();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/gamification-overview",
      );
      expect(result).toEqual(mockOverview);
    });
  });

  describe("getMonthlyEvaluationStats", () => {
    it("should return monthly stats with default months", async () => {
      const mockStats: MonthlyStats[] = [
        {
          month: "2024-01",
          totalEvaluations: 200,
          averageRating: 4.2,
          totalXp: 8000,
          activeAttendants: 25,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await DashboardApiClient.getMonthlyEvaluationStats();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/monthly-stats?months=6",
      );
      expect(result).toEqual(mockStats);
    });

    it("should return monthly stats with custom months", async () => {
      const mockStats: MonthlyStats[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await DashboardApiClient.getMonthlyEvaluationStats(12);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/monthly-stats?months=12",
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe("getPopularAchievements", () => {
    it("should return popular achievements with default limit", async () => {
      const mockAchievements: PopularAchievement[] = [
        {
          achievementId: "first-evaluation",
          title: "Primeira Avaliação",
          description: "Recebeu sua primeira avaliação",
          unlockedCount: 45,
          percentage: 100.0,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await DashboardApiClient.getPopularAchievements();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/popular-achievements?limit=10",
      );
      expect(result).toEqual(mockAchievements);
    });
  });

  describe("getRecentActivities", () => {
    it("should return recent activities with default limit", async () => {
      const mockActivities: RecentActivity[] = [
        {
          id: "1",
          type: "achievement_unlocked",
          attendantId: "1",
          attendantName: "João Silva",
          description: 'Desbloqueou a conquista "Expert"',
          timestamp: new Date("2024-01-15T10:30:00Z"),
          metadata: { achievementId: "expert" },
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockActivities,
      });

      const result = await DashboardApiClient.getRecentActivities();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/recent-activities?limit=20",
      );
      expect(result).toEqual(mockActivities);
    });

    it("should return recent activities with custom limit", async () => {
      const mockActivities: RecentActivity[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockActivities,
      });

      const result = await DashboardApiClient.getRecentActivities(50);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/recent-activities?limit=50",
      );
      expect(result).toEqual(mockActivities);
    });
  });

  // === TESTES DE MÉTRICAS EM TEMPO REAL ===

  describe("getRealtimeMetrics", () => {
    it("should return realtime metrics without options", async () => {
      const mockMetrics: DashboardMetrics = {
        gamification: {
          totalXp: 125000,
          activeUsers: 42,
          topRanking: [],
          recentAchievements: [],
          xpTrend: [],
        },
        satisfaction: {
          averageRating: 4.2,
          averageRating24h: 4.3,
          totalEvaluations: { total: 1500, last24h: 25, last7d: 180 },
          ratingDistribution: { 1: 10, 2: 20, 3: 50, 4: 150, 5: 170 },
          lowRatingAlerts: 2,
          trend: [],
        },
        alerts: {
          lowSatisfactionCount: 2,
          inactiveAttendantsCount: 3,
          systemAlerts: [],
          lastUpdated: new Date(),
        },
        lastUpdated: new Date(),
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const result = await DashboardApiClient.getRealtimeMetrics();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/realtime",
      );
      expect(result).toEqual(mockMetrics);
    });

    it("should return realtime metrics with options", async () => {
      const mockMetrics: DashboardMetrics = {
        gamification: {
          totalXp: 125000,
          activeUsers: 42,
          topRanking: [],
          recentAchievements: [],
          xpTrend: [],
        },
        satisfaction: {
          averageRating: 4.2,
          averageRating24h: 4.3,
          totalEvaluations: { total: 1500, last24h: 25, last7d: 180 },
          ratingDistribution: { 1: 10, 2: 20, 3: 50, 4: 150, 5: 170 },
          lowRatingAlerts: 2,
          trend: [],
        },
        alerts: {
          lowSatisfactionCount: 2,
          inactiveAttendantsCount: 3,
          systemAlerts: [],
          lastUpdated: new Date(),
        },
        lastUpdated: new Date(),
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const options = {
        satisfactionPeriod: "24h" as const,
        alertThresholds: {
          lowSatisfactionThreshold: 3.5,
          inactivityHours: 72,
        },
      };

      const result = await DashboardApiClient.getRealtimeMetrics(options);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/realtime?satisfactionPeriod=24h&alertThresholds=%7B%22lowSatisfactionThreshold%22%3A3.5%2C%22inactivityHours%22%3A72%7D",
      );
      expect(result).toEqual(mockMetrics);
    });

    it("should handle validation errors", async () => {
      const invalidOptions = {
        satisfactionPeriod: "invalid" as any,
      };

      await expect(
        DashboardApiClient.getRealtimeMetrics(invalidOptions),
      ).rejects.toThrow("Parâmetros inválidos");
    });
  });

  describe("getGamificationMetrics", () => {
    it("should return gamification metrics without seasonId", async () => {
      const mockMetrics: GamificationMetrics = {
        totalXp: 125000,
        activeUsers: 42,
        topRanking: [],
        recentAchievements: [],
        xpTrend: [],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const result = await DashboardApiClient.getGamificationMetrics();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/gamification-metrics",
      );
      expect(result).toEqual(mockMetrics);
    });

    it("should return gamification metrics with seasonId", async () => {
      const mockMetrics: GamificationMetrics = {
        totalXp: 125000,
        activeUsers: 42,
        topRanking: [],
        recentAchievements: [],
        xpTrend: [],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const result =
        await DashboardApiClient.getGamificationMetrics("season-2024-q1");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/gamification-metrics?seasonId=season-2024-q1",
      );
      expect(result).toEqual(mockMetrics);
    });
  });

  describe("getSatisfactionMetrics", () => {
    it("should return satisfaction metrics with default period", async () => {
      const mockMetrics: SatisfactionMetrics = {
        averageRating: 4.2,
        averageRating24h: 4.3,
        totalEvaluations: { total: 1500, last24h: 25, last7d: 180 },
        ratingDistribution: { 1: 10, 2: 20, 3: 50, 4: 150, 5: 170 },
        lowRatingAlerts: 2,
        trend: [],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const result = await DashboardApiClient.getSatisfactionMetrics();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/satisfaction-metrics?period=7d",
      );
      expect(result).toEqual(mockMetrics);
    });

    it("should return satisfaction metrics with custom period", async () => {
      const mockMetrics: SatisfactionMetrics = {
        averageRating: 4.2,
        averageRating24h: 4.3,
        totalEvaluations: { total: 1500, last24h: 25, last7d: 180 },
        ratingDistribution: { 1: 10, 2: 20, 3: 50, 4: 150, 5: 170 },
        lowRatingAlerts: 2,
        trend: [],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const result = await DashboardApiClient.getSatisfactionMetrics("30d");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/satisfaction-metrics?period=30d",
      );
      expect(result).toEqual(mockMetrics);
    });
  });

  describe("getAlertMetrics", () => {
    it("should return alert metrics without thresholds", async () => {
      const mockMetrics: AlertMetrics = {
        lowSatisfactionCount: 2,
        inactiveAttendantsCount: 3,
        systemAlerts: [],
        lastUpdated: new Date(),
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const result = await DashboardApiClient.getAlertMetrics();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/dashboard/alert-metrics",
      );
      expect(result).toEqual(mockMetrics);
    });

    it("should return alert metrics with thresholds", async () => {
      const mockMetrics: AlertMetrics = {
        lowSatisfactionCount: 2,
        inactiveAttendantsCount: 3,
        systemAlerts: [],
        lastUpdated: new Date(),
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockMetrics,
      });

      const thresholds = {
        lowSatisfactionThreshold: 3.5,
        inactivityHours: 72,
      };

      const result = await DashboardApiClient.getAlertMetrics(thresholds);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/dashboard/alert-metrics?thresholds={"lowSatisfactionThreshold":3.5,"inactivityHours":72}',
      );
      expect(result).toEqual(mockMetrics);
    });

    it("should handle validation errors for thresholds", async () => {
      const invalidThresholds = {
        lowSatisfactionThreshold: 10, // Invalid: should be between 1-5
        inactivityHours: 0, // Invalid: should be >= 1
      };

      await expect(
        DashboardApiClient.getAlertMetrics(invalidThresholds),
      ).rejects.toThrow("Parâmetros inválidos");
    });
  });

  // === TESTES DE COMPATIBILIDADE ===

  describe("Compatibility aliases", () => {
    it("should maintain DashboardService compatibility", async () => {
      const { DashboardService } = require("../dashboardApiClient");
      expect(DashboardService).toBe(DashboardApiClient);
    });

    it("should maintain RealtimeDashboardService compatibility", async () => {
      const { RealtimeDashboardService } = require("../dashboardApiClient");
      expect(RealtimeDashboardService).toBe(DashboardApiClient);
    });
  });
});
