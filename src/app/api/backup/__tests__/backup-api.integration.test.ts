/**
 * @jest-environment node
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";
import { BackupService } from "@/services/backupService";
import { BackupStorage } from "@/services/backupStorage";

// Mock do NextAuth para testes
jest.mock("next-auth/next", () => ({
  getServerSession: jest.fn(),
}));

// Mock do BackupService
jest.mock("@/services/backupService");
jest.mock("@/services/backupStorage");

const mockGetServerSession = require("next-auth/next")
  .getServerSession as jest.MockedFunction<any>;

describe("Backup API Integration Tests", () => {
  const testBackupDir = path.join(process.cwd(), "test-backups");
  const testBackupId = "test-backup-123";
  const testFilename = "test_backup_2025-01-09_14-30-00.sql";

  beforeAll(async () => {
    // Criar diretório de teste
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }

    // Criar arquivo de backup de teste
    const testBackupPath = path.join(testBackupDir, testFilename);
    fs.writeFileSync(testBackupPath, "SELECT 1; -- Test backup content");
  });

  afterAll(async () => {
    // Limpar arquivos de teste
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/backup/create - Endpoint de Criação", () => {
    it("deve criar backup com sucesso para usuário ADMIN", async () => {
      // Mock da sessão de usuário ADMIN
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      // Mock do BackupService
      const mockBackupResult = {
        success: true,
        filename: testFilename,
        filepath: path.join(testBackupDir, testFilename),
        size: 1024,
        checksum: "abc123",
        duration: 5000,
        id: testBackupId,
      };

      (BackupService.createBackup as jest.Mock).mockResolvedValue(
        mockBackupResult,
      );

      // Importar e testar o endpoint
      const { POST } = await import("../create/route");
      const request = new NextRequest(
        "http://localhost:3000/api/backup/create",
        {
          method: "POST",
          body: JSON.stringify({
            options: { compress: true, includeData: true },
          }),
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.backup.filename).toBe(testFilename);
      expect(BackupService.createBackup).toHaveBeenCalledWith({
        compress: true,
        includeData: true,
      });
    });

    it("deve negar acesso para usuário USUARIO", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "2", role: "USUARIO", name: "Regular User" },
      });

      const { POST } = await import("../create/route");
      const request = new NextRequest(
        "http://localhost:3000/api/backup/create",
        {
          method: "POST",
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain("Acesso negado");
    });

    it("deve retornar erro 401 para usuário não autenticado", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const { POST } = await import("../create/route");
      const request = new NextRequest(
        "http://localhost:3000/api/backup/create",
        {
          method: "POST",
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain("Não autenticado");
    });

    it("deve tratar erro do BackupService adequadamente", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      (BackupService.createBackup as jest.Mock).mockRejectedValue(
        new Error("Falha na conexão com o banco de dados"),
      );

      const { POST } = await import("../create/route");
      const request = new NextRequest(
        "http://localhost:3000/api/backup/create",
        {
          method: "POST",
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain("Erro interno");
    });
  });

  describe("GET /api/backup/list - Endpoint de Listagem", () => {
    it("deve listar backups para usuário SUPERVISOR", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "3", role: "SUPERVISOR", name: "Supervisor User" },
      });

      const mockBackups = [
        {
          id: testBackupId,
          filename: testFilename,
          size: 1024,
          createdAt: new Date(),
          status: "success" as const,
          checksum: "abc123",
        },
      ];

      (BackupStorage.listBackups as jest.Mock).mockResolvedValue(mockBackups);

      const { GET } = await import("../list/route");
      const request = new NextRequest("http://localhost:3000/api/backup/list");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backups).toHaveLength(1);
      expect(data.backups[0].filename).toBe(testFilename);
    });

    it("deve aplicar filtros de data corretamente", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      (BackupStorage.listBackups as jest.Mock).mockResolvedValue([]);

      const { GET } = await import("../list/route");
      const request = new NextRequest(
        "http://localhost:3000/api/backup/list?startDate=2025-01-01&endDate=2025-01-31",
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(BackupStorage.listBackups).toHaveBeenCalledWith({
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-31"),
      });
    });

    it("deve implementar paginação corretamente", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      (BackupStorage.listBackups as jest.Mock).mockResolvedValue([]);

      const { GET } = await import("../list/route");
      const request = new NextRequest(
        "http://localhost:3000/api/backup/list?page=2&limit=10",
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(BackupStorage.listBackups).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
      });
    });
  });

  describe("GET /api/backup/download/[id] - Endpoint de Download", () => {
    it("deve fazer download de backup para usuário autorizado", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      const mockBackupInfo = {
        id: testBackupId,
        filename: testFilename,
        filepath: path.join(testBackupDir, testFilename),
        size: 1024,
        checksum: "abc123",
      };

      (BackupStorage.getBackupInfo as jest.Mock).mockResolvedValue(
        mockBackupInfo,
      );

      const { GET } = await import("../download/[id]/route");
      const response = await GET(
        new NextRequest("http://localhost:3000/api/backup/download/test-id"),
        { params: { id: testBackupId } },
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/sql");
      expect(response.headers.get("Content-Disposition")).toContain(
        testFilename,
      );
    });

    it("deve retornar 404 para backup inexistente", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      (BackupStorage.getBackupInfo as jest.Mock).mockResolvedValue(null);

      const { GET } = await import("../download/[id]/route");
      const response = await GET(
        new NextRequest(
          "http://localhost:3000/api/backup/download/inexistente",
        ),
        { params: { id: "inexistente" } },
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toContain("Backup não encontrado");
    });

    it("deve validar integridade antes do download", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      const mockBackupInfo = {
        id: testBackupId,
        filename: testFilename,
        filepath: path.join(testBackupDir, testFilename),
        size: 1024,
        checksum: "abc123",
      };

      (BackupStorage.getBackupInfo as jest.Mock).mockResolvedValue(
        mockBackupInfo,
      );
      (BackupService.validateBackup as jest.Mock).mockResolvedValue(false);

      const { GET } = await import("../download/[id]/route");
      const response = await GET(
        new NextRequest("http://localhost:3000/api/backup/download/corrupted"),
        { params: { id: testBackupId } },
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain("corrompido");
    });
  });

  describe("DELETE /api/backup/[id] - Endpoint de Exclusão", () => {
    it("deve excluir backup para usuário ADMIN", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      (BackupService.deleteBackup as jest.Mock).mockResolvedValue(true);

      const { DELETE } = await import("../[id]/route");
      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/backup/test-id"),
        { params: { id: testBackupId } },
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(BackupService.deleteBackup).toHaveBeenCalledWith(testBackupId);
    });

    it("deve negar exclusão para usuário SUPERVISOR", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "3", role: "SUPERVISOR", name: "Supervisor User" },
      });

      const { DELETE } = await import("../[id]/route");
      const response = await DELETE(
        new NextRequest("http://localhost:3000/api/backup/test-id"),
        { params: { id: testBackupId } },
      );

      const data = await response.json();
      expect(response.status).toBe(403);
      expect(data.error).toContain("Acesso negado");
    });
  });

  describe("GET /api/backup/status/[id] - Endpoint de Status", () => {
    it("deve retornar status de operação em progresso", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      // Simular operação em progresso
      const { updateBackupProgress } = await import("../status/[id]/route");
      updateBackupProgress(testBackupId, {
        status: "in_progress",
        progress: 50,
        message: "Processando tabelas...",
        startTime: Date.now() - 30000,
      });

      const { GET } = await import("../status/[id]/route");
      const response = await GET(
        new NextRequest("http://localhost:3000/api/backup/status/test-id"),
        { params: { id: testBackupId } },
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.status).toBe("in_progress");
      expect(data.progress).toBe(50);
      expect(data.message).toBe("Processando tabelas...");
      expect(data.elapsedTime).toContain(":");
    });

    it("deve retornar status completed para operação finalizada", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "ADMIN", name: "Admin User" },
      });

      const mockBackupInfo = {
        id: testBackupId,
        status: "success" as const,
        filename: testFilename,
        size: 1024,
      };

      (BackupStorage.getBackupInfo as jest.Mock).mockResolvedValue(
        mockBackupInfo,
      );

      const { GET } = await import("../status/[id]/route");
      const response = await GET(
        new NextRequest("http://localhost:3000/api/backup/status/completed"),
        { params: { id: testBackupId } },
      );

      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.status).toBe("completed");
      expect(data.backup).toBeDefined();
    });
  });
});
