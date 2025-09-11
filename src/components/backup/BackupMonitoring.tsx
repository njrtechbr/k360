"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HardDrive,
  Clock,
  Database,
  RefreshCw,
  Play,
  Square,
  Trash2,
} from "lucide-react";

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

export function BackupMonitoring() {
  const [metrics, setMetrics] = useState<BackupMetrics | null>(null);
  const [alerts, setAlerts] = useState<BackupAlert[]>([]);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResult | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [monitoringActive, setMonitoringActive] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([loadMetrics(), loadAlerts(), loadHealthCheck()]);
    } catch (error) {
      console.error("Erro ao carregar dados de monitoramento:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const response = await fetch("/api/backup/monitoring?action=metrics");
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics);
      }
    } catch (error) {
      console.error("Erro ao carregar métricas:", error);
    }
  };

  const loadAlerts = async () => {
    try {
      const response = await fetch("/api/backup/monitoring?action=alerts");
      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error("Erro ao carregar alertas:", error);
    }
  };

  const loadHealthCheck = async () => {
    try {
      const response = await fetch("/api/backup/monitoring?action=health");
      if (response.ok) {
        const data = await response.json();
        setHealthCheck(data.healthCheck);
      }
    } catch (error) {
      console.error("Erro ao carregar health check:", error);
    }
  };

  const handleMonitoringToggle = async () => {
    try {
      const action = monitoringActive ? "stop_monitoring" : "start_monitoring";
      const response = await fetch("/api/backup/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        setMonitoringActive(!monitoringActive);
      }
    } catch (error) {
      console.error("Erro ao alterar monitoramento:", error);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    try {
      const response = await fetch("/api/backup/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_alert", alertId }),
      });

      if (response.ok) {
        await loadAlerts();
      }
    } catch (error) {
      console.error("Erro ao resolver alerta:", error);
    }
  };

  const handleForceCleanup = async () => {
    try {
      const response = await fetch("/api/backup/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "force_cleanup" }),
      });

      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Erro ao executar limpeza:", error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "critical":
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "info":
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados de monitoramento...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controles de Monitoramento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Controle de Monitoramento
          </CardTitle>
          <CardDescription>
            Gerencie o sistema de monitoramento automático de backups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              onClick={handleMonitoringToggle}
              variant={monitoringActive ? "destructive" : "default"}
              className="flex items-center gap-2"
            >
              {monitoringActive ? (
                <Square className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {monitoringActive
                ? "Parar Monitoramento"
                : "Iniciar Monitoramento"}
            </Button>

            <Button
              onClick={handleForceCleanup}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Executar Limpeza
            </Button>

            <Button
              onClick={loadData}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Dados
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="metrics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="metrics">Métricas</TabsTrigger>
          <TabsTrigger value="health">Status do Sistema</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
        </TabsList>

        {/* Métricas */}
        <TabsContent value="metrics" className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total de Backups
                  </CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalBackups}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.corruptedBackups} corrompidos
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Espaço Utilizado
                  </CardTitle>
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.totalSizeGB} GB
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {metrics.availableDiskSpaceGB} GB disponível
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Taxa de Sucesso
                  </CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.successRate}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Últimos backups
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Duração Média
                  </CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics.averageDurationMinutes} min
                  </div>
                  <p className="text-xs text-muted-foreground">Por backup</p>
                </CardContent>
              </Card>
            </div>
          )}

          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Informações Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Último Backup:</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.lastBackupDate
                        ? new Date(metrics.lastBackupDate).toLocaleString(
                            "pt-BR",
                          )
                        : "Nenhum backup encontrado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Backup Mais Antigo:</p>
                    <p className="text-sm text-muted-foreground">
                      {metrics.oldestBackupDate
                        ? new Date(metrics.oldestBackupDate).toLocaleString(
                            "pt-BR",
                          )
                        : "Nenhum backup encontrado"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Status do Sistema */}
        <TabsContent value="health" className="space-y-4">
          {healthCheck && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(healthCheck.status)}
                  Status do Sistema
                  <Badge
                    variant={
                      healthCheck.status === "healthy"
                        ? "default"
                        : healthCheck.status === "warning"
                          ? "secondary"
                          : "destructive"
                    }
                  >
                    {healthCheck.status === "healthy"
                      ? "Saudável"
                      : healthCheck.status === "warning"
                        ? "Atenção"
                        : "Crítico"}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Última verificação:{" "}
                  {new Date(healthCheck.lastCheck).toLocaleString("pt-BR")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {healthCheck.checks.diskSpace ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Espaço em Disco</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {healthCheck.checks.backupIntegrity ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Integridade dos Backups</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {healthCheck.checks.databaseConnection ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Conexão com Banco</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {healthCheck.checks.permissions ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span className="text-sm">Permissões</span>
                    </div>
                  </div>
                </div>

                {healthCheck.issues.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2">
                      Problemas Detectados:
                    </h4>
                    <ul className="space-y-1">
                      {healthCheck.issues.map((issue, index) => (
                        <li
                          key={index}
                          className="text-sm text-red-600 flex items-center gap-2"
                        >
                          <XCircle className="h-3 w-3" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                    <p>Nenhum alerta ativo</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  className={
                    alert.type === "error"
                      ? "border-red-200"
                      : alert.type === "warning"
                        ? "border-yellow-200"
                        : "border-blue-200"
                  }
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-2">
                      {getAlertIcon(alert.type)}
                      <div>
                        <AlertTitle className="text-sm">
                          {alert.type === "error"
                            ? "Erro"
                            : alert.type === "warning"
                              ? "Atenção"
                              : "Informação"}
                        </AlertTitle>
                        <AlertDescription className="text-sm">
                          {alert.message}
                        </AlertDescription>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(alert.timestamp).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    </div>

                    {!alert.resolved && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolveAlert(alert.id)}
                      >
                        Resolver
                      </Button>
                    )}
                  </div>
                </Alert>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
