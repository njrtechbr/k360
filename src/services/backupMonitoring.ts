import { promises as fs } from "fs";
import path from "path";
import cron from "node-cron";
import { BackupStorage } from "./backupStorage";
import { BackupValidator } from "./backupValidator";
import { BackupAuditLog } from "./backupAuditLog";
import {
  loadMonitoringConfig,
  BackupMonitoringConfig,
} from "@/config/backupMonitoring";

export interface BackupMetrics {
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

export interface BackupAlert {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  timestamp: Date;
  resolved: boolean;
  details?: any;
}

export interface HealthCheckResult {
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

export class BackupMonitoring {
  private static instance: BackupMonitoring;
  private storage: BackupStorage;
  private validator: BackupValidator;
  private auditLog: BackupAuditLog;
  private config: BackupMonitoringConfig;
  private alerts: BackupAlert[] = [];
  private cleanupJob: cron.ScheduledTask | null = null;
  private healthCheckJob: cron.ScheduledTask | null = null;

  constructor() {
    this.storage = new BackupStorage();
    this.validator = new BackupValidator();
    this.auditLog = new BackupAuditLog();
    this.config = loadMonitoringConfig();
  }

  static getInstance(): BackupMonitoring {
    if (!BackupMonitoring.instance) {
      BackupMonitoring.instance = new BackupMonitoring();
    }
    return BackupMonitoring.instance;
  }

  /**
   * Inicia os jobs de monitoramento automático
   */
  async startMonitoring(): Promise<void> {
    try {
      // Job de limpeza automática
      if (this.config.cleanup.enabled) {
        this.cleanupJob = cron.schedule(
          this.config.cleanup.schedule,
          async () => {
            await this.performAutomaticCleanup();
          },
          {
            scheduled: false,
            timezone: "America/Sao_Paulo",
          },
        );
        this.cleanupJob.start();
      }

      // Health check
      if (this.config.healthCheck.enabled) {
        this.healthCheckJob = cron.schedule(
          this.config.healthCheck.schedule,
          async () => {
            await this.performHealthCheck();
          },
          {
            scheduled: false,
            timezone: "America/Sao_Paulo",
          },
        );
        this.healthCheckJob.start();
      }

      await this.auditLog.log("system", "monitoring_started", {
        message: "Sistema de monitoramento iniciado com sucesso",
      });

      console.log("Sistema de monitoramento de backup iniciado");
    } catch (error) {
      await this.createAlert(
        "error",
        "Falha ao iniciar sistema de monitoramento",
        { error: error.message },
      );
      throw error;
    }
  }

  /**
   * Para os jobs de monitoramento
   */
  async stopMonitoring(): Promise<void> {
    try {
      if (this.cleanupJob) {
        this.cleanupJob.stop();
        this.cleanupJob = null;
      }

      if (this.healthCheckJob) {
        this.healthCheckJob.stop();
        this.healthCheckJob = null;
      }

      await this.auditLog.log("system", "monitoring_stopped", {
        message: "Sistema de monitoramento parado",
      });

      console.log("Sistema de monitoramento de backup parado");
    } catch (error) {
      console.error("Erro ao parar monitoramento:", error);
    }
  }

  /**
   * Executa limpeza automática de backups antigos
   */
  async performAutomaticCleanup(): Promise<void> {
    try {
      const config = await this.storage.getConfig();
      const retentionDays = config.retentionDays || 30;
      const maxBackups = config.maxBackups || 50;

      await this.auditLog.log("system", "cleanup_started", {
        retentionDays,
        maxBackups,
      });

      // Limpar por idade
      const deletedByAge = await this.storage.cleanupOldBackups(retentionDays);

      // Limpar por quantidade
      const deletedByCount =
        await this.storage.cleanupExcessBackups(maxBackups);

      const totalDeleted = deletedByAge + deletedByCount;

      if (totalDeleted > 0) {
        await this.createAlert(
          "info",
          `Limpeza automática concluída: ${totalDeleted} backups removidos`,
          {
            deletedByAge,
            deletedByCount,
            retentionDays,
            maxBackups,
          },
        );
      }

      await this.auditLog.log("system", "cleanup_completed", {
        totalDeleted,
        deletedByAge,
        deletedByCount,
      });
    } catch (error) {
      await this.createAlert(
        "error",
        "Falha na limpeza automática de backups",
        { error: error.message },
      );
      await this.auditLog.log("system", "cleanup_failed", {
        error: error.message,
      });
    }
  }

  /**
   * Executa verificação de saúde do sistema
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: "healthy",
      checks: {
        diskSpace: false,
        backupIntegrity: false,
        databaseConnection: false,
        permissions: false,
      },
      issues: [],
      lastCheck: new Date(),
    };

    try {
      // Verificar espaço em disco
      result.checks.diskSpace = await this.checkDiskSpace();
      if (!result.checks.diskSpace) {
        result.issues.push("Espaço em disco insuficiente");
        result.status = "warning";
      }

      // Verificar integridade dos backups
      result.checks.backupIntegrity = await this.checkBackupIntegrity();
      if (!result.checks.backupIntegrity) {
        result.issues.push("Backups corrompidos detectados");
        result.status = "critical";
      }

      // Verificar conexão com banco
      result.checks.databaseConnection = await this.checkDatabaseConnection();
      if (!result.checks.databaseConnection) {
        result.issues.push("Falha na conexão com banco de dados");
        result.status = "critical";
      }

      // Verificar permissões
      result.checks.permissions = await this.checkPermissions();
      if (!result.checks.permissions) {
        result.issues.push("Problemas de permissão detectados");
        result.status = "warning";
      }

      // Criar alertas se necessário
      if (result.status !== "healthy") {
        await this.createAlert(
          result.status === "critical" ? "error" : "warning",
          `Health check falhou: ${result.issues.join(", ")}`,
          { healthCheck: result },
        );
      }

      await this.auditLog.log("system", "health_check", {
        status: result.status,
        issues: result.issues,
      });
    } catch (error) {
      result.status = "critical";
      result.issues.push(`Erro no health check: ${error.message}`);
      await this.createAlert("error", "Falha no health check do sistema", {
        error: error.message,
      });
    }

    return result;
  }

  /**
   * Coleta métricas de performance do sistema
   */
  async collectMetrics(): Promise<BackupMetrics> {
    try {
      const backups = await this.storage.listBackups();
      const config = await this.storage.getConfig();

      const totalBackups = backups.length;
      const totalSizeBytes = backups.reduce(
        (sum, backup) => sum + backup.size,
        0,
      );
      const totalSizeGB = totalSizeBytes / (1024 * 1024 * 1024);

      const successfulBackups = backups.filter((b) => b.status === "success");
      const successRate =
        totalBackups > 0 ? (successfulBackups.length / totalBackups) * 100 : 0;

      const totalDuration = successfulBackups.reduce(
        (sum, backup) => sum + backup.duration,
        0,
      );
      const averageDurationMinutes =
        successfulBackups.length > 0
          ? totalDuration / successfulBackups.length / 60000
          : 0;

      const dates = backups.map((b) => b.createdAt).sort();
      const lastBackupDate = dates.length > 0 ? dates[dates.length - 1] : null;
      const oldestBackupDate = dates.length > 0 ? dates[0] : null;

      const corruptedBackups = backups.filter(
        (b) => b.status === "failed",
      ).length;

      // Verificar espaço em disco
      const backupDir = config.defaultDirectory || "./backups";
      const stats = await fs.stat(backupDir).catch(() => null);
      const diskSpaceUsageGB = stats ? totalSizeGB : 0;

      // Simular espaço disponível (em produção, usar biblioteca específica)
      const availableDiskSpaceGB = 100; // Placeholder

      return {
        totalBackups,
        totalSizeGB: Math.round(totalSizeGB * 100) / 100,
        successRate: Math.round(successRate * 100) / 100,
        averageDurationMinutes: Math.round(averageDurationMinutes * 100) / 100,
        lastBackupDate,
        oldestBackupDate,
        corruptedBackups,
        diskSpaceUsageGB: Math.round(diskSpaceUsageGB * 100) / 100,
        availableDiskSpaceGB,
      };
    } catch (error) {
      await this.createAlert("error", "Falha ao coletar métricas", {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Cria um novo alerta
   */
  async createAlert(
    type: "error" | "warning" | "info",
    message: string,
    details?: any,
  ): Promise<void> {
    const alert: BackupAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      message,
      timestamp: new Date(),
      resolved: false,
      details,
    };

    this.alerts.push(alert);

    // Manter apenas os últimos N alertas conforme configuração
    if (this.alerts.length > this.config.alerts.maxAlerts) {
      this.alerts = this.alerts.slice(-this.config.alerts.maxAlerts);
    }

    await this.auditLog.log("system", "alert_created", {
      alertId: alert.id,
      type: alert.type,
      message: alert.message,
    });

    console.log(`[BACKUP ALERT] ${type.toUpperCase()}: ${message}`);
  }

  /**
   * Lista alertas ativos
   */
  getAlerts(includeResolved: boolean = false): BackupAlert[] {
    return includeResolved
      ? this.alerts
      : this.alerts.filter((alert) => !alert.resolved);
  }

  /**
   * Resolve um alerta
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      await this.auditLog.log("system", "alert_resolved", { alertId });
      return true;
    }
    return false;
  }

  /**
   * Verifica espaço em disco
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      const config = await this.storage.getConfig();
      const backupDir = config.defaultDirectory || "./backups";

      // Verificar se diretório existe
      await fs.access(backupDir);

      // Em produção, usar biblioteca para verificar espaço real
      // Por enquanto, simular verificação
      const metrics = await this.collectMetrics();
      const usagePercentage =
        (metrics.diskSpaceUsageGB / metrics.availableDiskSpaceGB) * 100;

      return usagePercentage < 90; // Alerta se uso > 90%
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica integridade dos backups
   */
  private async checkBackupIntegrity(): Promise<boolean> {
    try {
      const backups = await this.storage.listBackups();
      const recentBackups = backups.slice(-5); // Verificar últimos 5 backups

      for (const backup of recentBackups) {
        const isValid = await this.validator.validateBackup(backup.filepath);
        if (!isValid) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica conexão com banco de dados
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      // Simular verificação de conexão
      // Em produção, usar cliente do banco para testar conexão
      const { spawn } = require("child_process");

      return new Promise((resolve) => {
        const process = spawn("pg_isready", ["-h", "localhost"], {
          timeout: 5000,
        });

        process.on("exit", (code) => {
          resolve(code === 0);
        });

        process.on("error", () => {
          resolve(false);
        });

        setTimeout(() => {
          process.kill();
          resolve(false);
        }, 5000);
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica permissões do sistema
   */
  private async checkPermissions(): Promise<boolean> {
    try {
      const config = await this.storage.getConfig();
      const backupDir = config.defaultDirectory || "./backups";

      // Verificar permissões de leitura e escrita
      await fs.access(backupDir, fs.constants.R_OK | fs.constants.W_OK);

      return true;
    } catch (error) {
      return false;
    }
  }
}
