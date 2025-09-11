import { useState, useEffect, useCallback } from "react";
import {
  DashboardApiClient,
  DashboardApiClientOptions,
} from "@/services/dashboardApiClient";
import {
  GamificationMetrics,
  SatisfactionMetrics,
  AlertMetrics,
  DashboardMetrics,
} from "@/types/dashboard";
import { dashboardCache } from "@/lib/cache/dashboardCache";

interface DashboardMetricsState {
  gamification: GamificationMetrics | null;
  satisfaction: SatisfactionMetrics | null;
  alerts: AlertMetrics | null;
  allMetrics: DashboardMetrics | null;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export function useDashboardMetrics(options?: DashboardApiClientOptions) {
  const [state, setState] = useState<DashboardMetricsState>({
    gamification: null,
    satisfaction: null,
    alerts: null,
    allMetrics: null,
    loading: {},
    errors: {},
  });

  const setLoading = useCallback((key: string, loading: boolean) => {
    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, [key]: loading },
    }));
  }, []);

  const setError = useCallback((key: string, error: string | null) => {
    setState((prev) => ({
      ...prev,
      errors: { ...prev.errors, [key]: error },
    }));
  }, []);

  const setData = useCallback((key: keyof DashboardMetricsState, data: any) => {
    setState((prev) => ({
      ...prev,
      [key]: data,
    }));
  }, []);

  /**
   * Carrega métricas de gamificação
   */
  const loadGamificationMetrics = useCallback(
    async (seasonId?: string) => {
      const cacheKey = `gamification_${seasonId || "active"}`;
      const cached = dashboardCache.get(cacheKey);

      if (cached) {
        setData("gamification", cached);
        setLoading("gamification", false);
        return cached;
      }

      setLoading("gamification", true);
      setError("gamification", null);

      try {
        const metrics =
          await DashboardApiClient.getGamificationMetrics(seasonId);

        // Cache por 2 minutos
        dashboardCache.set(cacheKey, metrics, 2);

        setData("gamification", metrics);
        setLoading("gamification", false);

        return metrics;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao carregar métricas de gamificação";
        setError("gamification", errorMessage);
        setLoading("gamification", false);
        throw error;
      }
    },
    [setData, setLoading, setError],
  );

  /**
   * Carrega métricas de satisfação
   */
  const loadSatisfactionMetrics = useCallback(
    async (period: "1d" | "7d" | "30d" = "7d") => {
      const cacheKey = `satisfaction_${period}`;
      const cached = dashboardCache.get(cacheKey);

      if (cached) {
        setData("satisfaction", cached);
        setLoading("satisfaction", false);
        return cached;
      }

      setLoading("satisfaction", true);
      setError("satisfaction", null);

      try {
        const metrics = await DashboardApiClient.getSatisfactionMetrics(period);

        // Cache por 3 minutos
        dashboardCache.set(cacheKey, metrics, 3);

        setData("satisfaction", metrics);
        setLoading("satisfaction", false);

        return metrics;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao carregar métricas de satisfação";
        setError("satisfaction", errorMessage);
        setLoading("satisfaction", false);
        throw error;
      }
    },
    [setData, setLoading, setError],
  );

  /**
   * Carrega métricas de alertas
   */
  const loadAlertMetrics = useCallback(
    async (alertOptions?: {
      lowSatisfactionThreshold?: number;
      inactivityHours?: number;
    }) => {
      const cacheKey = `alerts_${JSON.stringify(alertOptions || {})}`;
      const cached = dashboardCache.get(cacheKey);

      if (cached) {
        setData("alerts", cached);
        setLoading("alerts", false);
        return cached;
      }

      setLoading("alerts", true);
      setError("alerts", null);

      try {
        const metrics = await DashboardApiClient.getAlertMetrics(alertOptions);

        // Cache por 1 minuto (alertas são mais dinâmicos)
        dashboardCache.set(cacheKey, metrics, 1);

        setData("alerts", metrics);
        setLoading("alerts", false);

        return metrics;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao carregar métricas de alertas";
        setError("alerts", errorMessage);
        setLoading("alerts", false);
        throw error;
      }
    },
    [setData, setLoading, setError],
  );

  /**
   * Carrega todas as métricas de uma vez
   */
  const loadAllMetrics = useCallback(
    async (dashboardOptions?: DashboardApiClientOptions) => {
      const cacheKey = `all_metrics_${JSON.stringify(dashboardOptions || {})}`;
      const cached = dashboardCache.get(cacheKey);

      if (cached) {
        setData("allMetrics", cached);
        setData("gamification", cached.gamification);
        setData("satisfaction", cached.satisfaction);
        setData("alerts", cached.alerts);
        setLoading("allMetrics", false);
        return cached;
      }

      setLoading("allMetrics", true);
      setError("allMetrics", null);

      try {
        const metrics =
          await DashboardApiClient.getAllDashboardMetrics(dashboardOptions);

        // Cache por 2 minutos
        dashboardCache.set(cacheKey, metrics, 2);

        setData("allMetrics", metrics);
        setData("gamification", metrics.gamification);
        setData("satisfaction", metrics.satisfaction);
        setData("alerts", metrics.alerts);
        setLoading("allMetrics", false);

        return metrics;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Erro ao carregar métricas do dashboard";
        setError("allMetrics", errorMessage);
        setLoading("allMetrics", false);
        throw error;
      }
    },
    [setData, setLoading, setError],
  );

  /**
   * Recarrega todas as métricas forçando bypass do cache
   */
  const refreshAllMetrics = useCallback(async () => {
    // Limpar cache relacionado
    dashboardCache.clear();

    return loadAllMetrics(options);
  }, [loadAllMetrics, options]);

  // Carregamento inicial
  useEffect(() => {
    if (options) {
      loadAllMetrics(options);
    }
  }, [loadAllMetrics, options]);

  return {
    // Estado
    ...state,

    // Flags de loading consolidadas
    isLoading: Object.values(state.loading).some(Boolean),
    hasErrors: Object.values(state.errors).some(Boolean),

    // Métodos de carregamento
    loadGamificationMetrics,
    loadSatisfactionMetrics,
    loadAlertMetrics,
    loadAllMetrics,
    refreshAllMetrics,
  };
}
