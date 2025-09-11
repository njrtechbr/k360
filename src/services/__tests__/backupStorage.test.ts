import { BackupStorage } from "../backupStorage";
import { BackupMetadata, BackupRegistry } from "@/types/backup";
import { promises as fs } from "fs";
import path from "path";

// Mock do fs
jest.mock("fs", () => ({
  promises: {
    mkdir: jest.fn(),
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe("BackupStorage", () => {
  const mockBackupDir = "./test-backups";
  const mockRegistryPath = path.join(mockBackupDir, "registry.json");

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.BACKUP_DIRECTORY = mockBackupDir;
    process.env.BACKUP_RETENTION_DAYS = "30";
    process.env.BACKUP_MAX_BACKUPS = "50";
  });

  afterEach(() => {
    delete process.env.BACKUP_DIRECTORY;
    delete process.env.BACKUP_RETENTION_DAYS;
    delete process.env.BACKUP_MAX_BACKUPS;
  });

  describe("initialize", () => {
    it("deve criar diretórios e registry se não existirem", async () => {
      mockFs.access.mockRejectedValueOnce(new Error("File not found"));
      mockFs.writeFile.mockResolvedValueOnce();

      await BackupStorage.initialize();

      expect(mockFs.mkdir).toHaveBeenCalledWith(mockBackupDir, {
        recursive: true,
      });
      expect(mockFs.mkdir).toHaveBeenCalledWith(
        path.join(mockBackupDir, "files"),
        { recursive: true },
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockRegistryPath,
        expect.stringContaining('"backups": []'),
        "utf8",
      );
    });

    it("não deve recriar registry se já existir", async () => {
      mockFs.access.mockResolvedValueOnce();

      await BackupStorage.initialize();

      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe("addBackup", () => {
    const mockMetadata: BackupMetadata = {
      id: "test-backup-1",
      filename: "backup_2025-01-09_14-30-00.sql",
      filepath: "/path/to/backup.sql",
      size: 1024,
      checksum: "abc123",
      createdAt: new Date("2025-01-09T14:30:00Z"),
      createdBy: "admin",
      status: "success",
      duration: 5000,
      databaseVersion: "15.0",
      schemaVersion: "1.0",
    };

    beforeEach(() => {
      const mockRegistry: BackupRegistry = {
        backups: [],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: mockBackupDir,
        },
      };

      mockFs.access.mockResolvedValue();
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));
      mockFs.writeFile.mockResolvedValue();
    });

    it("deve adicionar novo backup ao registry", async () => {
      await BackupStorage.addBackup(mockMetadata);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        mockRegistryPath,
        expect.stringContaining(mockMetadata.id),
        "utf8",
      );
    });

    it("deve rejeitar backup com ID duplicado", async () => {
      const existingRegistry: BackupRegistry = {
        backups: [mockMetadata],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: mockBackupDir,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(existingRegistry));

      await expect(BackupStorage.addBackup(mockMetadata)).rejects.toThrow(
        "Backup com ID test-backup-1 já existe",
      );
    });
  });

  describe("listBackups", () => {
    const mockBackups: BackupMetadata[] = [
      {
        id: "backup-1",
        filename: "backup_2025-01-09_14-30-00.sql",
        filepath: "/path/to/backup1.sql",
        size: 1024,
        checksum: "abc123",
        createdAt: new Date("2025-01-09T14:30:00Z"),
        status: "success",
        duration: 5000,
        databaseVersion: "15.0",
        schemaVersion: "1.0",
      },
      {
        id: "backup-2",
        filename: "backup_2025-01-08_10-15-00.sql",
        filepath: "/path/to/backup2.sql",
        size: 2048,
        checksum: "def456",
        createdAt: new Date("2025-01-08T10:15:00Z"),
        status: "failed",
        duration: 3000,
        databaseVersion: "15.0",
        schemaVersion: "1.0",
      },
    ];

    beforeEach(() => {
      const mockRegistry: BackupRegistry = {
        backups: mockBackups,
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: mockBackupDir,
        },
      };

      mockFs.access.mockResolvedValue();
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));
    });

    it("deve listar todos os backups ordenados por data", async () => {
      const result = await BackupStorage.listBackups();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("backup-1"); // Mais recente primeiro
      expect(result[1].id).toBe("backup-2");
    });

    it("deve filtrar por status", async () => {
      const result = await BackupStorage.listBackups({ status: "success" });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("backup-1");
    });

    it("deve aplicar paginação", async () => {
      const result = await BackupStorage.listBackups({ limit: 1, offset: 1 });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("backup-2");
    });
  });

  describe("cleanupOldBackups", () => {
    beforeEach(() => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 dias atrás

      const mockRegistry: BackupRegistry = {
        backups: [
          {
            id: "old-backup",
            filename: "old_backup.sql",
            filepath: "/path/to/old_backup.sql",
            size: 1024,
            checksum: "old123",
            createdAt: oldDate,
            status: "success",
            duration: 5000,
            databaseVersion: "15.0",
            schemaVersion: "1.0",
          },
          {
            id: "new-backup",
            filename: "new_backup.sql",
            filepath: "/path/to/new_backup.sql",
            size: 2048,
            checksum: "new456",
            createdAt: new Date(),
            status: "success",
            duration: 3000,
            databaseVersion: "15.0",
            schemaVersion: "1.0",
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: mockBackupDir,
        },
      };

      mockFs.access.mockResolvedValue();
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));
      mockFs.writeFile.mockResolvedValue();
      mockFs.unlink.mockResolvedValue();
    });

    it("deve remover backups antigos", async () => {
      const result = await BackupStorage.cleanupOldBackups();

      expect(result.removed).toBe(1);
      expect(result.freedSpace).toBe(1024);
      expect(result.errors).toHaveLength(0);
      expect(mockFs.unlink).toHaveBeenCalledWith("/path/to/old_backup.sql");
    });
  });

  describe("getBackupStats", () => {
    beforeEach(() => {
      const mockRegistry: BackupRegistry = {
        backups: [
          {
            id: "backup-1",
            filename: "backup1.sql",
            filepath: "/path/to/backup1.sql",
            size: 1024,
            checksum: "abc123",
            createdAt: new Date("2025-01-09T14:30:00Z"),
            status: "success",
            duration: 5000,
            databaseVersion: "15.0",
            schemaVersion: "1.0",
          },
          {
            id: "backup-2",
            filename: "backup2.sql",
            filepath: "/path/to/backup2.sql",
            size: 2048,
            checksum: "def456",
            createdAt: new Date("2025-01-08T10:15:00Z"),
            status: "failed",
            duration: 3000,
            databaseVersion: "15.0",
            schemaVersion: "1.0",
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: mockBackupDir,
        },
      };

      mockFs.access.mockResolvedValue();
      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));
    });

    it("deve calcular estatísticas corretamente", async () => {
      const stats = await BackupStorage.getBackupStats();

      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.inProgress).toBe(0);
      expect(stats.totalSize).toBe(3072);
      expect(stats.oldestBackup).toEqual(new Date("2025-01-08T10:15:00Z"));
      expect(stats.newestBackup).toEqual(new Date("2025-01-09T14:30:00Z"));
    });
  });

  describe("validateRegistry", () => {
    it("deve identificar e corrigir entradas órfãs", async () => {
      const mockRegistry: BackupRegistry = {
        backups: [
          {
            id: "existing-backup",
            filename: "existing.sql",
            filepath: "/path/to/existing.sql",
            size: 1024,
            checksum: "abc123",
            createdAt: new Date(),
            status: "success",
            duration: 5000,
            databaseVersion: "15.0",
            schemaVersion: "1.0",
          },
          {
            id: "missing-backup",
            filename: "missing.sql",
            filepath: "/path/to/missing.sql",
            size: 2048,
            checksum: "def456",
            createdAt: new Date(),
            status: "success",
            duration: 3000,
            databaseVersion: "15.0",
            schemaVersion: "1.0",
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: mockBackupDir,
        },
      };

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockRegistry));
      mockFs.access
        .mockResolvedValueOnce() // Registry exists (initialize call)
        .mockRejectedValueOnce(new Error("File not found")) // First backup file missing
        .mockRejectedValueOnce(new Error("File not found")); // Second backup file missing
      mockFs.writeFile.mockResolvedValue();

      const result = await BackupStorage.validateRegistry();

      expect(result.isValid).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.fixedIssues.length).toBeGreaterThan(0);
    });
  });
});
