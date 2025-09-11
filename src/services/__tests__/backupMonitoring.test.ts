import { BackupMonitoring } from "../backupMonitoring";

// Mock das dependências
jest.mock("../backupStorage", () => ({
  BackupStorage: jest.fn().mockImplementation(() => ({
    listBackups: jest.fn(),
    getConfig: jest.fn(),
    cleanupOldBackups: jest.fn(),
    cleanupExcessBackups: jest.fn(),
  })),
}));

jest.mock("../backupValidator", () => ({
  BackupValidator: jest.fn().mockImplementation(() => ({
    validateBackup: jest.fn(),
  })),
}));

jest.mock("../backupAuditLog", () => ({
  BackupAuditLog: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
  })),
}));

jest.mock("node-cron");

jest.mock("@/config/backupMonitoring", () => ({
  loadMonitoringConfig: () => ({
    cleanup: {
      enabled: true,
      schedule: "0 2 * * *",
      retentionDays: 30,
      maxBackups: 50,
    },
    healthCheck: {
      enabled: true,
      schedule: "*/30 * * * *",
      diskSpaceThreshold: 90,
      alertOnFailure: true,
    },
    alerts: { maxAlerts: 100, retentionDays: 7, emailNotifications: false },
    metrics: {
      collectInterval: 5,
      retentionDays: 30,
      enableDetailedMetrics: true,
    },
  }),
}));

describe("BackupMonitoring", () => {
  let monitoring: BackupMonitoring;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance
    (BackupMonitoring as any).instance = undefined;

    monitoring = BackupMonitoring.getInstance();
  });

  describe("collectMetrics", () => {
    it("deve coletar métricas corretamente", async () => {
      // Mock do storage para retornar dados de teste
      const mockStorage = (monitoring as any).storage;
      mockStorage.listBackups.mockResolvedValue([
        {
          id: "1",
          filename: "backup1.sql",
          filepath: "/path/backup1.sql",
          size: 1024 * 1024 * 100, // 100MB
          status: "success",
          duration: 60000, // 1 minuto
          createdAt: new Date("2025-01-01"),
          checksum: "abc123",
        },
        {
          id: "2",
          filename: "backup2.sql",
          filepath: "/path/backup2.sql",
          size: 1024 * 1024 * 200, // 200MB
          status: "success",
          duration: 120000, // 2 minutos
          createdAt: new Date("2025-01-02"),
          checksum: "def456",
        },
        {
          id: "3",
          filename: "backup3.sql",
          filepath: "/path/backup3.sql",
          size: 1024 * 1024 * 50, // 50MB
          status: "failed",
          duration: 30000, // 30 segundos
          createdAt: new Date("2025-01-03"),
          checksum: "ghi789",
        },
      ]);

      mockStorage.getConfig.mockResolvedValue({
        defaultDirectory: "./backups",
        maxBackups: 50,
        retentionDays: 30,
      });

      const metrics = await monitoring.collectMetrics();

      expect(metrics.totalBackups).toBe(3);
      expect(metrics.totalSizeGB).toBe(0.34); // ~350MB convertido para GB
      expect(metrics.successRate).toBe(66.67); // 2 de 3 sucessos
      expect(metrics.averageDurationMinutes).toBe(1.5); // Média de 1.5 minutos
      expect(metrics.corruptedBackups).toBe(1);
      // Verificar se as datas estão sendo calculadas corretamente
      expect(metrics.lastBackupDate).toBeDefined();
      expect(metrics.oldestBackupDate).toBeDefined();
    });

    it("deve lidar com lista vazia de backups", async () => {
      const mockStorage = (monitoring as any).storage;
      mockStorage.listBackups.mockResolvedValue([]);
      mockStorage.getConfig.mockResolvedValue({
        defaultDirectory: "./backups",
        maxBackups: 50,
        retentionDays: 30,
      });

      const metrics = await monitoring.collectMetrics();

      expect(metrics.totalBackups).toBe(0);
      expect(metrics.totalSizeGB).toBe(0);
      expect(metrics.successRate).toBe(0);
      expect(metrics.averageDurationMinutes).toBe(0);
      expect(metrics.corruptedBackups).toBe(0);
      expect(metrics.lastBackupDate).toBeNull();
      expect(metrics.oldestBackupDate).toBeNull();
    });
  });

  describe("performAutomaticCleanup", () => {
    it("deve executar limpeza automática corretamente", async () => {
      const mockStorage = (monitoring as any).storage;
      const mockAuditLog = (monitoring as any).auditLog;

      mockStorage.getConfig.mockResolvedValue({
        defaultDirectory: "./backups",
        maxBackups: 10,
        retentionDays: 7,
      });

      mockStorage.cleanupOldBackups.mockResolvedValue(3);
      mockStorage.cleanupExcessBackups.mockResolvedValue(2);

      await monitoring.performAutomaticCleanup();

      expect(mockStorage.cleanupOldBackups).toHaveBeenCalledWith(7);
      expect(mockStorage.cleanupExcessBackups).toHaveBeenCalledWith(10);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        "system",
        "cleanup_started",
        {
          retentionDays: 7,
          maxBackups: 10,
        },
      );
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        "system",
        "cleanup_completed",
        {
          totalDeleted: 5,
          deletedByAge: 3,
          deletedByCount: 2,
        },
      );
    });

    it("deve lidar com erros na limpeza", async () => {
      const mockStorage = (monitoring as any).storage;
      const mockAuditLog = (monitoring as any).auditLog;

      mockStorage.getConfig.mockRejectedValue(
        new Error("Erro de configuração"),
      );

      await monitoring.performAutomaticCleanup();

      expect(mockAuditLog.log).toHaveBeenCalledWith(
        "system",
        "cleanup_failed",
        {
          error: "Erro de configuração",
        },
      );
    });
  });

  describe("performHealthCheck", () => {
    it("deve retornar status saudável quando tudo está OK", async () => {
      // Mock para simular verificações bem-sucedidas
      jest.spyOn(monitoring as any, "checkDiskSpace").mockResolvedValue(true);
      jest
        .spyOn(monitoring as any, "checkBackupIntegrity")
        .mockResolvedValue(true);
      jest
        .spyOn(monitoring as any, "checkDatabaseConnection")
        .mockResolvedValue(true);
      jest.spyOn(monitoring as any, "checkPermissions").mockResolvedValue(true);

      const result = await monitoring.performHealthCheck();

      expect(result.status).toBe("healthy");
      expect(result.checks.diskSpace).toBe(true);
      expect(result.checks.backupIntegrity).toBe(true);
      expect(result.checks.databaseConnection).toBe(true);
      expect(result.checks.permissions).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("deve retornar status crítico quando há problemas graves", async () => {
      jest.spyOn(monitoring as any, "checkDiskSpace").mockResolvedValue(true);
      jest
        .spyOn(monitoring as any, "checkBackupIntegrity")
        .mockResolvedValue(false);
      jest
        .spyOn(monitoring as any, "checkDatabaseConnection")
        .mockResolvedValue(false);
      jest.spyOn(monitoring as any, "checkPermissions").mockResolvedValue(true);

      const result = await monitoring.performHealthCheck();

      expect(result.status).toBe("critical");
      expect(result.issues).toContain("Backups corrompidos detectados");
      expect(result.issues).toContain("Falha na conexão com banco de dados");
    });

    it("deve retornar status de atenção para problemas menores", async () => {
      jest.spyOn(monitoring as any, "checkDiskSpace").mockResolvedValue(false);
      jest
        .spyOn(monitoring as any, "checkBackupIntegrity")
        .mockResolvedValue(true);
      jest
        .spyOn(monitoring as any, "checkDatabaseConnection")
        .mockResolvedValue(true);
      jest
        .spyOn(monitoring as any, "checkPermissions")
        .mockResolvedValue(false);

      const result = await monitoring.performHealthCheck();

      expect(result.status).toBe("warning");
      expect(result.issues).toContain("Espaço em disco insuficiente");
      expect(result.issues).toContain("Problemas de permissão detectados");
    });
  });

  describe("createAlert", () => {
    it("deve criar alerta corretamente", async () => {
      await monitoring.createAlert("error", "Teste de erro", {
        detail: "teste",
      });

      const alerts = monitoring.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe("error");
      expect(alerts[0].message).toBe("Teste de erro");
      expect(alerts[0].resolved).toBe(false);
      expect(alerts[0].details).toEqual({ detail: "teste" });
    });

    it("deve manter apenas os últimos N alertas conforme configuração", async () => {
      // Criar 105 alertas
      for (let i = 0; i < 105; i++) {
        await monitoring.createAlert("info", `Alerta ${i}`);
      }

      const alerts = monitoring.getAlerts(true); // incluir resolvidos
      expect(alerts).toHaveLength(100); // Conforme configuração mockada
    });
  });

  describe("resolveAlert", () => {
    it("deve resolver alerta existente", async () => {
      const mockAuditLog = (monitoring as any).auditLog;

      await monitoring.createAlert("warning", "Teste de alerta");
      const alerts = monitoring.getAlerts();
      const alertId = alerts[0].id;

      const resolved = await monitoring.resolveAlert(alertId);

      expect(resolved).toBe(true);
      expect(mockAuditLog.log).toHaveBeenCalledWith(
        "system",
        "alert_resolved",
        { alertId },
      );

      const activeAlerts = monitoring.getAlerts();
      expect(activeAlerts).toHaveLength(0);
    });

    it("deve retornar false para alerta inexistente", async () => {
      const resolved = await monitoring.resolveAlert("inexistente");
      expect(resolved).toBe(false);
    });
  });

  describe("getAlerts", () => {
    beforeEach(async () => {
      await monitoring.createAlert("error", "Erro ativo");
      await monitoring.createAlert("warning", "Aviso ativo");

      const alerts = monitoring.getAlerts(true);
      await monitoring.resolveAlert(alerts[0].id); // Resolver primeiro alerta
    });

    it("deve retornar apenas alertas ativos por padrão", () => {
      const alerts = monitoring.getAlerts();
      expect(alerts).toHaveLength(1);
      expect(alerts[0].message).toBe("Aviso ativo");
    });

    it("deve retornar todos os alertas quando solicitado", () => {
      const alerts = monitoring.getAlerts(true);
      expect(alerts).toHaveLength(2);
    });
  });
});
