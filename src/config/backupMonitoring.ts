export interface BackupMonitoringConfig {
  // Configurações de limpeza automática
  cleanup: {
    enabled: boolean;
    schedule: string; // Cron expression
    retentionDays: number;
    maxBackups: number;
  };

  // Configurações de health check
  healthCheck: {
    enabled: boolean;
    schedule: string; // Cron expression
    diskSpaceThreshold: number; // Percentual (0-100)
    alertOnFailure: boolean;
  };

  // Configurações de alertas
  alerts: {
    maxAlerts: number;
    retentionDays: number;
    emailNotifications: boolean;
    webhookUrl?: string;
  };

  // Configurações de métricas
  metrics: {
    collectInterval: number; // Minutos
    retentionDays: number;
    enableDetailedMetrics: boolean;
  };
}

export const DEFAULT_MONITORING_CONFIG: BackupMonitoringConfig = {
  cleanup: {
    enabled: true,
    schedule: "0 2 * * *", // Diariamente às 2:00 AM
    retentionDays: 30,
    maxBackups: 50,
  },

  healthCheck: {
    enabled: true,
    schedule: "*/30 * * * *", // A cada 30 minutos
    diskSpaceThreshold: 90, // Alerta quando uso > 90%
    alertOnFailure: true,
  },

  alerts: {
    maxAlerts: 100,
    retentionDays: 7,
    emailNotifications: false,
    webhookUrl: undefined,
  },

  metrics: {
    collectInterval: 5, // A cada 5 minutos
    retentionDays: 30,
    enableDetailedMetrics: true,
  },
};

/**
 * Carrega configuração do monitoramento a partir de variáveis de ambiente
 */
export function loadMonitoringConfig(): BackupMonitoringConfig {
  const config = { ...DEFAULT_MONITORING_CONFIG };

  // Configurações de limpeza
  if (process.env.BACKUP_CLEANUP_ENABLED !== undefined) {
    config.cleanup.enabled = process.env.BACKUP_CLEANUP_ENABLED === "true";
  }
  if (process.env.BACKUP_CLEANUP_SCHEDULE) {
    config.cleanup.schedule = process.env.BACKUP_CLEANUP_SCHEDULE;
  }
  if (process.env.BACKUP_RETENTION_DAYS) {
    config.cleanup.retentionDays = parseInt(
      process.env.BACKUP_RETENTION_DAYS,
      10,
    );
  }
  if (process.env.BACKUP_MAX_BACKUPS) {
    config.cleanup.maxBackups = parseInt(process.env.BACKUP_MAX_BACKUPS, 10);
  }

  // Configurações de health check
  if (process.env.BACKUP_HEALTH_CHECK_ENABLED !== undefined) {
    config.healthCheck.enabled =
      process.env.BACKUP_HEALTH_CHECK_ENABLED === "true";
  }
  if (process.env.BACKUP_HEALTH_CHECK_SCHEDULE) {
    config.healthCheck.schedule = process.env.BACKUP_HEALTH_CHECK_SCHEDULE;
  }
  if (process.env.BACKUP_DISK_SPACE_THRESHOLD) {
    config.healthCheck.diskSpaceThreshold = parseInt(
      process.env.BACKUP_DISK_SPACE_THRESHOLD,
      10,
    );
  }

  // Configurações de alertas
  if (process.env.BACKUP_MAX_ALERTS) {
    config.alerts.maxAlerts = parseInt(process.env.BACKUP_MAX_ALERTS, 10);
  }
  if (process.env.BACKUP_ALERT_RETENTION_DAYS) {
    config.alerts.retentionDays = parseInt(
      process.env.BACKUP_ALERT_RETENTION_DAYS,
      10,
    );
  }
  if (process.env.BACKUP_EMAIL_NOTIFICATIONS !== undefined) {
    config.alerts.emailNotifications =
      process.env.BACKUP_EMAIL_NOTIFICATIONS === "true";
  }
  if (process.env.BACKUP_WEBHOOK_URL) {
    config.alerts.webhookUrl = process.env.BACKUP_WEBHOOK_URL;
  }

  // Configurações de métricas
  if (process.env.BACKUP_METRICS_INTERVAL) {
    config.metrics.collectInterval = parseInt(
      process.env.BACKUP_METRICS_INTERVAL,
      10,
    );
  }
  if (process.env.BACKUP_METRICS_RETENTION_DAYS) {
    config.metrics.retentionDays = parseInt(
      process.env.BACKUP_METRICS_RETENTION_DAYS,
      10,
    );
  }
  if (process.env.BACKUP_DETAILED_METRICS !== undefined) {
    config.metrics.enableDetailedMetrics =
      process.env.BACKUP_DETAILED_METRICS === "true";
  }

  return config;
}
