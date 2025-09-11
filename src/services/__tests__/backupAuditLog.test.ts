import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { promises as fs } from "fs";
import path from "path";
import { BackupAuditLogger, createAuditEntry } from "../backupAuditLog";
import { Role } from "@prisma/client";

// Mock do fs
jest.mock("fs", () => ({
  promises: {
    access: jest.fn(),
    appendFile: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    rename: jest.fn(),
    readdir: jest.fn(),
    unlink: jest.fn(),
  },
}));

const mockFs = {
  access: fs.access as jest.MockedFunction<typeof fs.access>,
  appendFile: fs.appendFile as jest.MockedFunction<typeof fs.appendFile>,
  readFile: fs.readFile as jest.MockedFunction<typeof fs.readFile>,
  writeFile: fs.writeFile as jest.MockedFunction<typeof fs.writeFile>,
  mkdir: fs.mkdir as jest.MockedFunction<typeof fs.mkdir>,
  stat: fs.stat as jest.MockedFunction<typeof fs.stat>,
  rename: fs.rename as jest.MockedFunction<typeof fs.rename>,
  readdir: fs.readdir as jest.MockedFunction<typeof fs.readdir>,
  unlink: fs.unlink as jest.MockedFunction<typeof fs.unlink>,
};

describe("BackupAuditLogger", () => {
  const testAuditPath = path.join(process.cwd(), "backups", "audit.log");

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("logOperation", () => {
    it("deve registrar operação com sucesso", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.appendFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);

      const entry = createAuditEntry(
        "create",
        { id: "user-1", email: "test@test.com", role: "ADMIN" },
        true,
        { resource: "backup-123" },
      );

      await BackupAuditLogger.logOperation(entry);

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        testAuditPath,
        expect.stringContaining('"operation":"create"'),
        "utf8",
      );
    });

    it("deve criar diretório se não existir", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.appendFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1000 } as any);

      const entry = createAuditEntry(
        "create",
        { id: "user-1", email: "test@test.com", role: "ADMIN" },
        true,
      );

      await BackupAuditLogger.logOperation(entry);

      expect(mockFs.mkdir).toHaveBeenCalledWith(path.dirname(testAuditPath), {
        recursive: true,
      });
    });

    it("deve rotacionar log se exceder tamanho máximo", async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 11 * 1024 * 1024 } as any); // 11MB
      mockFs.rename.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);
      mockFs.appendFile.mockResolvedValue(undefined);

      const entry = createAuditEntry(
        "create",
        { id: "user-1", email: "test@test.com", role: "ADMIN" },
        true,
      );

      await BackupAuditLogger.logOperation(entry);

      expect(mockFs.rename).toHaveBeenCalled();
    });

    it("deve continuar mesmo se log falhar", async () => {
      mockFs.access.mockRejectedValue(new Error("Permission denied"));
      mockFs.mkdir.mockRejectedValue(new Error("Permission denied"));

      const entry = createAuditEntry(
        "create",
        { id: "user-1", email: "test@test.com", role: "ADMIN" },
        true,
      );

      // Não deve lançar erro
      await expect(
        BackupAuditLogger.logOperation(entry),
      ).resolves.toBeUndefined();
    });
  });

  describe("getAuditEntries", () => {
    it("deve retornar array vazio se arquivo não existir", async () => {
      mockFs.access.mockRejectedValue(new Error("ENOENT"));

      const entries = await BackupAuditLogger.getAuditEntries();

      expect(entries).toEqual([]);
    });

    it("deve parsear entradas do log corretamente", async () => {
      const mockLogContent = [
        JSON.stringify({
          id: "audit_1",
          timestamp: "2025-01-09T10:00:00.000Z",
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
        JSON.stringify({
          id: "audit_2",
          timestamp: "2025-01-09T11:00:00.000Z",
          userId: "user-2",
          userEmail: "test2@test.com",
          userRole: "SUPERVISOR",
          operation: "list",
          success: true,
        }),
      ].join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const entries = await BackupAuditLogger.getAuditEntries();

      expect(entries).toHaveLength(2);
      expect(entries[0].operation).toBe("list"); // Mais recente primeiro
      expect(entries[1].operation).toBe("create");
    });

    it("deve aplicar filtros corretamente", async () => {
      const mockLogContent = [
        JSON.stringify({
          id: "audit_1",
          timestamp: "2025-01-09T10:00:00.000Z",
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
        JSON.stringify({
          id: "audit_2",
          timestamp: "2025-01-09T11:00:00.000Z",
          userId: "user-2",
          userEmail: "test2@test.com",
          userRole: "SUPERVISOR",
          operation: "list",
          success: false,
        }),
      ].join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);

      // Filtrar apenas operações com sucesso
      const entries = await BackupAuditLogger.getAuditEntries({
        success: true,
      });

      expect(entries).toHaveLength(1);
      expect(entries[0].operation).toBe("create");
    });

    it("deve aplicar limite corretamente", async () => {
      const mockLogContent = Array.from({ length: 10 }, (_, i) =>
        JSON.stringify({
          id: `audit_${i}`,
          timestamp: new Date(Date.now() + i * 1000).toISOString(),
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
      ).join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const entries = await BackupAuditLogger.getAuditEntries({ limit: 5 });

      expect(entries).toHaveLength(5);
    });

    it("deve ignorar linhas inválidas", async () => {
      const mockLogContent = [
        JSON.stringify({
          id: "audit_1",
          timestamp: "2025-01-09T10:00:00.000Z",
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
        "linha inválida",
        JSON.stringify({
          id: "audit_2",
          timestamp: "2025-01-09T11:00:00.000Z",
          userId: "user-2",
          userEmail: "test2@test.com",
          userRole: "SUPERVISOR",
          operation: "list",
          success: true,
        }),
      ].join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const entries = await BackupAuditLogger.getAuditEntries();

      expect(entries).toHaveLength(2);
      expect(console.warn).toHaveBeenCalledWith(
        "Linha inválida no audit log:",
        "linha inválida",
      );
    });
  });

  describe("getAuditStats", () => {
    it("deve calcular estatísticas corretamente", async () => {
      const mockLogContent = [
        JSON.stringify({
          id: "audit_1",
          timestamp: "2025-01-09T10:00:00.000Z",
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
        JSON.stringify({
          id: "audit_2",
          timestamp: "2025-01-09T11:00:00.000Z",
          userId: "user-2",
          userEmail: "test2@test.com",
          userRole: "SUPERVISOR",
          operation: "list",
          success: false,
        }),
        JSON.stringify({
          id: "audit_3",
          timestamp: "2025-01-09T12:00:00.000Z",
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
      ].join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const stats = await BackupAuditLogger.getAuditStats();

      expect(stats.totalOperations).toBe(3);
      expect(stats.successfulOperations).toBe(2);
      expect(stats.failedOperations).toBe(1);
      expect(stats.operationsByType.create).toBe(2);
      expect(stats.operationsByType.list).toBe(1);
      expect(stats.recentActivity).toHaveLength(3);
    });
  });

  describe("cleanupOldEntries", () => {
    it("deve remover entradas antigas", async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // 100 dias atrás
      const recentDate = new Date();

      const mockLogContent = [
        JSON.stringify({
          id: "audit_1",
          timestamp: oldDate.toISOString(),
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
        JSON.stringify({
          id: "audit_2",
          timestamp: recentDate.toISOString(),
          userId: "user-2",
          userEmail: "test2@test.com",
          userRole: "SUPERVISOR",
          operation: "list",
          success: true,
        }),
      ].join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);
      mockFs.writeFile.mockResolvedValue(undefined);

      const removedCount = await BackupAuditLogger.cleanupOldEntries(90);

      expect(removedCount).toBe(1);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        testAuditPath,
        expect.stringContaining('"operation":"list"'),
        "utf8",
      );
    });

    it("deve manter todas as entradas se nenhuma for antiga", async () => {
      const recentDate = new Date();

      const mockLogContent = [
        JSON.stringify({
          id: "audit_1",
          timestamp: recentDate.toISOString(),
          userId: "user-1",
          userEmail: "test@test.com",
          userRole: "ADMIN",
          operation: "create",
          success: true,
        }),
      ].join("\n");

      mockFs.access.mockResolvedValue(undefined);
      mockFs.readFile.mockResolvedValue(mockLogContent);

      const removedCount = await BackupAuditLogger.cleanupOldEntries(90);

      expect(removedCount).toBe(0);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });
  });

  describe("createAuditEntry", () => {
    it("deve criar entrada de audit corretamente", () => {
      const user = {
        id: "user-1",
        email: "test@test.com",
        role: "ADMIN" as Role,
      };
      const entry = createAuditEntry("create", user, true, {
        resource: "backup-123",
        metadata: { size: 1000 },
      });

      expect(entry.userId).toBe("user-1");
      expect(entry.userEmail).toBe("test@test.com");
      expect(entry.userRole).toBe("ADMIN");
      expect(entry.operation).toBe("create");
      expect(entry.success).toBe(true);
      expect(entry.resource).toBe("backup-123");
      expect(entry.metadata).toEqual({ size: 1000 });
    });

    it("deve criar entrada mínima sem opções", () => {
      const user = {
        id: "user-1",
        email: "test@test.com",
        role: "SUPERVISOR" as Role,
      };
      const entry = createAuditEntry("list", user, false);

      expect(entry.userId).toBe("user-1");
      expect(entry.userEmail).toBe("test@test.com");
      expect(entry.userRole).toBe("SUPERVISOR");
      expect(entry.operation).toBe("list");
      expect(entry.success).toBe(false);
      expect(entry.resource).toBeUndefined();
      expect(entry.metadata).toBeUndefined();
    });
  });
});
