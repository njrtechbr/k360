import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { useDashboardMetrics } from "../useDashboardMetrics";
import { DashboardApiClient } from "@/services/dashboardApiClient";
import { dashboardCache } from "@/lib/cache/dashboardCache";

// Mock do DashboardApiClient
jest.mock("@/services/dashboardApiClient");

const mockDashboardApiClientMethods = {
  getGamificationMetrics: jest.fn(),
  getSatisfactionMetrics: jest.fn(),
  getAlertMetrics: jest.fn(),
  getAllDashboardMetrics: jest.fn(),
};

// Substituir os métodos mockados
import { DashboardApiClient } from "@/services/dashboardApiClient";
Object.assign(DashboardApiClient, mockDashboardApiClientMethods);

// Mock do cache
jest.mock("@/lib/cache/dashboardCache");

const mockDashboardApiClient = mockDashboardApiClientMethods;
const mockDashboardCache = {
  get: jest.fn(),
  set: jest.fn(),
  clear: jest.fn(),
};

// Substituir o cache mockado
(dashboardCache as any).get = mockDashboardCache.get;
(dashboardCache as any).set = mockDashboardCache.set;
(dashboardCache as any).clear = mockDashboardCache.clear;

describe("useDashboardMetrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDashboardCache.get.mockReturnValue(null);
  });

  describe("loadGamificationMetrics", () => {
    it("deve carregar métricas de gamificação com sucesso", async () => {
      const mockMetrics = {
        totalXp: 15000,
        activeUsers: 45,
        topRanking: [],
        recentAchievements: [],
        xpTrend: [],
      };

      mockDashboardApiClient.getGamificationMetrics.mockResolvedValue(
        mockMetrics,
      );

      const { result } = renderHook(() => useDashboardMetrics());

      await act(async () => {
        const metrics = await result.current.loadGamificationMetrics();
        expect(metrics).toEqual(mockMetrics);
      });

      expect(result.current.gamification).toEqual(mockMetrics);
      expect(result.current.loading.gamification).toBe(false);
      expect(result.current.errors.gamification).toBeNull();
    });

    it("deve usar cache quando disponível", async () => {
      const cachedMetrics = {
        totalXp: 10000,
        activeUsers: 30,
        topRanking: [],
        recentAchievements: [],
        xpTrend: [],
      };

      mockDashboardCache.get.mockReturnValue(cachedMetrics);

      const { result } = renderHook(() => useDashboardMetrics());

      await act(async () => {
        const metrics = await result.current.loadGamificationMetrics();
        expect(metrics).toEqual(cachedMetrics);
      });

      expect(
        mockDashboardApiClient.getGamificationMetrics,
      ).not.toHaveBeenCalled();
      expect(result.current.gamification).toEqual(cachedMetrics);
    });

    it("deve tratar erros corretamente", async () => {
      const error = new Error("Erro de rede");
      mockDashboardApiClient.getGamificationMetrics.mockRejectedValue(error);

      const { result } = renderHook(() => useDashboardMetrics());

      await act(async () => {
        try {
          await result.current.loadGamificationMetrics();
        } catch (e) {
          expect(e).toBe(error);
        }
      });

      expect(result.current.loading.gamification).toBe(false);
      expect(result.current.errors.gamification).toBe("Erro de rede");
    });
  });

  describe("loadAllMetrics", () => {
    it("deve carregar todas as métricas de uma vez", async () => {
      const mockAllMetrics = {
        gamification: {
          totalXp: 15000,
          activeUsers: 45,
          topRanking: [],
          recentAchievements: [],
          xpTrend: [],
        },
        satisfaction: {
          averageRating: 4.2,
          averageRating24h: 4.1,
          totalEvaluations: { today: 10, week: 50, month: 200 },
          ratingDistribution: {
            rating1: 5,
            rating2: 10,
            rating3: 15,
            rating4: 25,
            rating5: 45,
          },
          lowRatingAlerts: 2,
          trend: [],
        },
        alerts: {
          lowSatisfactionCount: 2,
          inactiveUsersCount: 5,
          systemAlerts: [],
        },
        lastUpdated: new Date(),
      };

      mockDashboardApiClient.getAllDashboardMetrics.mockResolvedValue(
        mockAllMetrics,
      );

      const { result } = renderHook(() => useDashboardMetrics());

      await act(async () => {
        const metrics = await result.current.loadAllMetrics();
        expect(metrics).toEqual(mockAllMetrics);
      });

      expect(result.current.allMetrics).toEqual(mockAllMetrics);
      expect(result.current.gamification).toEqual(mockAllMetrics.gamification);
      expect(result.current.satisfaction).toEqual(mockAllMetrics.satisfaction);
      expect(result.current.alerts).toEqual(mockAllMetrics.alerts);
    });
  });

  describe("refreshAllMetrics", () => {
    it("deve limpar cache e recarregar métricas", async () => {
      const mockMetrics = {
        gamification: {},
        satisfaction: {},
        alerts: {},
        lastUpdated: new Date(),
      };

      mockDashboardApiClient.getAllDashboardMetrics.mockResolvedValue(
        mockMetrics as any,
      );

      const { result } = renderHook(() => useDashboardMetrics());

      await act(async () => {
        await result.current.refreshAllMetrics();
      });

      expect(mockDashboardCache.clear).toHaveBeenCalled();
      expect(mockDashboardApiClient.getAllDashboardMetrics).toHaveBeenCalled();
    });
  });

  describe("flags de estado", () => {
    it("deve calcular isLoading corretamente", () => {
      const { result } = renderHook(() => useDashboardMetrics());

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.loadGamificationMetrics();
      });

      // Durante o loading, isLoading deve ser true
      expect(result.current.isLoading).toBe(true);
    });
  });
});
