import { useState, useEffect, useCallback } from "react";
import { dashboardCache } from "@/lib/cache/dashboardCache";

interface DashboardDataState {
  evaluationTrend: any[];
  ratingDistribution: any[];
  topPerformers: any[];
  gamificationOverview: any;
  popularAchievements: any[];
  monthlyStats: any[];
  recentActivities: any[];
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardDataState>({
    evaluationTrend: [],
    ratingDistribution: [],
    topPerformers: [],
    gamificationOverview: null,
    popularAchievements: [],
    monthlyStats: [],
    recentActivities: [],
    loading: {},
    errors: {},
  });

  const loadData = useCallback(
    async (endpoint: string, dataKey: keyof DashboardDataState) => {
      if (dataKey === "loading" || dataKey === "errors") return;

      // Verificar cache primeiro
      const cacheKey = `dashboard_${dataKey}`;
      const cachedData = dashboardCache.get(cacheKey);

      if (cachedData) {
        setData((prev) => ({
          ...prev,
          [dataKey]: cachedData,
          loading: { ...prev.loading, [dataKey]: false },
        }));
        return;
      }

      setData((prev) => ({
        ...prev,
        loading: { ...prev.loading, [dataKey]: true },
        errors: { ...prev.errors, [dataKey]: null },
      }));

      try {
        const response = await fetch(endpoint);
        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Salvar no cache (TTL de 3 minutos para dados dinâmicos)
        dashboardCache.set(cacheKey, result, 3);

        setData((prev) => ({
          ...prev,
          [dataKey]: result,
          loading: { ...prev.loading, [dataKey]: false },
        }));
      } catch (error) {
        console.error(`Erro ao carregar ${dataKey}:`, error);
        setData((prev) => ({
          ...prev,
          loading: { ...prev.loading, [dataKey]: false },
          errors: {
            ...prev.errors,
            [dataKey]:
              error instanceof Error ? error.message : "Erro desconhecido",
          },
        }));
      }
    },
    [],
  );

  const loadEvaluationData = useCallback(() => {
    return Promise.all([
      loadData("/api/dashboard/evaluation-trend?days=30", "evaluationTrend"),
      loadData("/api/dashboard/rating-distribution", "ratingDistribution"),
      loadData("/api/dashboard/monthly-stats?months=6", "monthlyStats"),
    ]);
  }, [loadData]);

  const loadGamificationData = useCallback(() => {
    return Promise.all([
      loadData("/api/dashboard/gamification-overview", "gamificationOverview"),
      loadData(
        "/api/dashboard/popular-achievements?limit=5",
        "popularAchievements",
      ),
    ]);
  }, [loadData]);

  const loadTeamData = useCallback(() => {
    return Promise.all([
      loadData("/api/dashboard/top-performers?limit=10", "topPerformers"),
      loadData("/api/dashboard/recent-activities?limit=20", "recentActivities"),
    ]);
  }, [loadData]);

  return {
    data,
    loadEvaluationData,
    loadGamificationData,
    loadTeamData,
    loadData,
  };
}
