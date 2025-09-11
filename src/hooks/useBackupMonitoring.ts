import { useState, useEffect, useCallback } from "react";

interface BackupMetrics {
  totalBackups: number;
  totalSizeGB: number;
  successRate: number;
  averageDurationMinutes: number;
  lastBackupDate: Date | null;
  oldestBackupDate: Date | null;
  corruptedBackups: number;
  diskSpaceUsageGB: number;
  availableDiskSpaceGB: number;
}

interface BackupAlert {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  timestamp: Date;
  resolved: boolean;
  details?: any;
}

interface HealthCheckResult {
  status: "healthy" | "warning" | "critical";
  checks: {
    diskSpace: boolean;
    backupIntegrity: boolean;
    databaseConnection: boolean;
    permissions: boolean;
  };
  issues: string[];
  lastCheck: Date;
}

interface UseBackupMonitoringReturn {
  metrics: BackupMetrics | null;
  alerts: BackupAlert[];
  healthCheck: HealthCheckResult | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  resolveAlert: (alertId: string) => Promise<boolean>;
  startMonitoring: () => Promise<boolean>;
  stopMonitoring: () => Promise<boolean>;
  forceCleanup: () => Promise<boolean>;
  forceHealthCheck: () => Promise<HealthCheckResult | null>;
}

export function useBackupMonitoring(
  autoRefresh: boolean = true,
): UseBackupMonitoringReturn {
  const [metrics, setMetrics] = useState<BackupMetrics | null>(null);
  const [alerts, setAlerts] = useState<BackupAlert[]>([]);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (): Promise<BackupMetrics | null> => {
    try {
      const response = await fetch("/api/backup/monitoring?action=metrics");
      if (!response.ok) {
        throw new Error(`Erro ao buscar métricas: ${response.statusText}`);
      }
      const data = await response.json();
      return data.metrics;
    } catch (err) {
      console.error("Erro ao buscar métricas:", err);
      return null;
    }
  }, []);

  const fetchAlerts = useCallback(async (): Promise<BackupAlert[]> => {
    try {
      const response = await fetch("/api/backup/monitoring?action=alerts");
      if (!response.ok) {
        throw new Error(`Erro ao buscar alertas: ${response.statusText}`);
      }
      const data = await response.json();
      return data.alerts;
    } catch (err) {
      console.error("Erro ao buscar alertas:", err);
      return [];
    }
  }, []);

  const fetchHealthCheck =
    useCallback(async (): Promise<HealthCheckResult | null> => {
      try {
        const response = await fetch("/api/backup/monitoring?action=health");
        if (!response.ok) {
          throw new Error(
            `Erro ao buscar health check: ${response.statusText}`,
          );
        }
        const data = await response.json();
        return data.healthCheck;
      } catch (err) {
        console.error("Erro ao buscar health check:", err);
        return null;
      }
    }, []);

  const refreshData = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const [metricsData, alertsData, healthData] = await Promise.all([
        fetchMetrics(),
        fetchAlerts(),
        fetchHealthCheck(),
      ]);

      setMetrics(metricsData);
      setAlerts(alertsData);
      setHealthCheck(healthData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      console.error("Erro ao atualizar dados de monitoramento:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchMetrics, fetchAlerts, fetchHealthCheck]);

  const resolveAlert = useCallback(
    async (alertId: string): Promise<boolean> => {
      try {
        const response = await fetch("/api/backup/monitoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "resolve_alert", alertId }),
        });

        if (!response.ok) {
          throw new Error(`Erro ao resolver alerta: ${response.statusText}`);
        }

        // Atualizar lista de alertas
        await fetchAlerts().then(setAlerts);
        return true;
      } catch (err) {
        console.error("Erro ao resolver alerta:", err);
        return false;
      }
    },
    [fetchAlerts],
  );

  const startMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/backup/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start_monitoring" }),
      });

      if (!response.ok) {
        throw new Error(
          `Erro ao iniciar monitoramento: ${response.statusText}`,
        );
      }

      return true;
    } catch (err) {
      console.error("Erro ao iniciar monitoramento:", err);
      return false;
    }
  }, []);

  const stopMonitoring = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/backup/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop_monitoring" }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao parar monitoramento: ${response.statusText}`);
      }

      return true;
    } catch (err) {
      console.error("Erro ao parar monitoramento:", err);
      return false;
    }
  }, []);

  const forceCleanup = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch("/api/backup/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_cleanup" }),
      });

      if (!response.ok) {
        throw new Error(`Erro ao executar limpeza: ${response.statusText}`);
      }

      // Atualizar dados após limpeza
      await refreshData();
      return true;
    } catch (err) {
      console.error("Erro ao executar limpeza:", err);
      return false;
    }
  }, [refreshData]);

  const forceHealthCheck =
    useCallback(async (): Promise<HealthCheckResult | null> => {
      try {
        const response = await fetch("/api/backup/monitoring", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "force_health_check" }),
        });

        if (!response.ok) {
          throw new Error(
            `Erro ao executar health check: ${response.statusText}`,
          );
        }

        const data = await response.json();
        const healthResult = data.healthCheck;

        setHealthCheck(healthResult);
        return healthResult;
      } catch (err) {
        console.error("Erro ao executar health check:", err);
        return null;
      }
    }, []);

  // Carregar dados iniciais
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Auto-refresh se habilitado
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Atualizar a cada 30 segundos

    return () => clearInterval(interval);
  }, [autoRefresh, refreshData]);

  return {
    metrics,
    alerts,
    healthCheck,
    loading,
    error,
    refreshData,
    resolveAlert,
    startMonitoring,
    stopMonitoring,
    forceCleanup,
    forceHealthCheck,
  };
}
