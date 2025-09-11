/**
 * @jest-environment node
 */
import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { NextRequest } from "next/server";
import { GET } from "../download/[id]/route";

// Mock dos módulos necessários
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/services/backupService", () => ({
  BackupService: {
    getBackupInfo: jest.fn(),
  },
}));

jest.mock("@/services/backupValidator", () => ({
  BackupValidator: {
    validateBackup: jest.fn(),
  },
}));

jest.mock("fs", () => ({
  statSync: jest.fn(),
  createReadStream: jest.fn(),
}));

jest.mock("fs/promises", () => ({
  readFile: jest.fn(),
}));

const mockGetServerSession = require("next-auth")
  .getServerSession as jest.MockedFunction<any>;
const mockBackupService = require("@/services/backupService").BackupService;
const mockBackupValidator =
  require("@/services/backupValidator").BackupValidator;
const mockFs = require("fs");
const mockFsPromises = require("fs/promises");

describe("GET /api/backup/download/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deve retornar 401 se usuário não estiver autenticado", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Não autenticado");
  });

  it("deve retornar 403 se usuário não tiver permissões adequadas", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "USUARIO" },
    });

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe(
      "Permissões insuficientes para fazer download de backups",
    );
  });

  it("deve retornar 400 se ID do backup for inválido", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    const request = new NextRequest("http://localhost/api/backup/download/");
    const params = { params: { id: "" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("ID do backup inválido");
  });

  it("deve retornar 404 se backup não for encontrado", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    mockBackupService.getBackupInfo.mockResolvedValue(null);

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Backup não encontrado");
  });

  it("deve retornar 400 se backup não estiver com status success", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    mockBackupService.getBackupInfo.mockResolvedValue({
      id: "test-id",
      status: "failed",
      filename: "test.sql",
      filepath: "/path/test.sql",
    });

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Backup não está disponível para download");
  });

  it("deve retornar 404 se arquivo físico não existir", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    mockBackupService.getBackupInfo.mockResolvedValue({
      id: "test-id",
      status: "success",
      filename: "test.sql",
      filepath: "/path/test.sql",
      size: 1000,
    });

    mockFs.statSync.mockImplementation(() => {
      throw new Error("File not found");
    });

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Arquivo de backup não encontrado");
  });

  it("deve retornar 500 se arquivo estiver corrompido (tamanho diferente)", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    mockBackupService.getBackupInfo.mockResolvedValue({
      id: "test-id",
      status: "success",
      filename: "test.sql",
      filepath: "/path/test.sql",
      size: 1000,
    });

    mockFs.statSync.mockReturnValue({
      size: 500, // Tamanho diferente do esperado
    });

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Arquivo de backup corrompido");
  });

  it("deve retornar 500 se validação de integridade falhar", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    mockBackupService.getBackupInfo.mockResolvedValue({
      id: "test-id",
      status: "success",
      filename: "test.sql",
      filepath: "/path/test.sql",
      size: 1000,
    });

    mockFs.statSync.mockReturnValue({
      size: 1000,
    });

    mockBackupValidator.validateBackup.mockResolvedValue(false);

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Backup falhou na validação de integridade");
  });

  it("deve permitir download para usuários com permissões adequadas", async () => {
    const roles = ["ADMIN", "SUPERADMIN", "SUPERVISOR"];

    for (const role of roles) {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role },
      });

      mockBackupService.getBackupInfo.mockResolvedValue({
        id: "test-id",
        status: "success",
        filename: "test.sql",
        filepath: "/path/test.sql",
        size: 1000,
      });

      mockFs.statSync.mockReturnValue({
        size: 1000,
      });

      mockBackupValidator.validateBackup.mockResolvedValue(true);
      mockFsPromises.readFile.mockResolvedValue(Buffer.from("test content"));

      const request = new NextRequest(
        "http://localhost/api/backup/download/test-id",
      );
      const params = { params: { id: "test-id" } };

      const response = await GET(request, params);

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe(
        "application/octet-stream",
      );
      expect(response.headers.get("Content-Disposition")).toBe(
        'attachment; filename="test.sql"',
      );
    }
  });

  it("deve configurar headers corretos para download", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    mockBackupService.getBackupInfo.mockResolvedValue({
      id: "test-id",
      status: "success",
      filename: "backup_2025-01-09.sql",
      filepath: "/path/backup_2025-01-09.sql",
      size: 1000,
    });

    mockFs.statSync.mockReturnValue({
      size: 1000,
    });

    mockBackupValidator.validateBackup.mockResolvedValue(true);
    mockFsPromises.readFile.mockResolvedValue(Buffer.from("test content"));

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/octet-stream",
    );
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="backup_2025-01-09.sql"',
    );
    expect(response.headers.get("Content-Length")).toBe("1000");
    expect(response.headers.get("Cache-Control")).toBe(
      "no-cache, no-store, must-revalidate",
    );
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("Expires")).toBe("0");
  });

  it("deve usar streaming para arquivos grandes", async () => {
    mockGetServerSession.mockResolvedValue({
      user: { id: "1", role: "ADMIN" },
    });

    const largeFileSize = 60 * 1024 * 1024; // 60MB

    mockBackupService.getBackupInfo.mockResolvedValue({
      id: "test-id",
      status: "success",
      filename: "large_backup.sql",
      filepath: "/path/large_backup.sql",
      size: largeFileSize,
    });

    mockFs.statSync.mockReturnValue({
      size: largeFileSize,
    });

    mockBackupValidator.validateBackup.mockResolvedValue(true);

    // Mock do stream
    const mockStream = {
      on: jest.fn(),
      destroy: jest.fn(),
    };
    mockFs.createReadStream.mockReturnValue(mockStream);

    const request = new NextRequest(
      "http://localhost/api/backup/download/test-id",
    );
    const params = { params: { id: "test-id" } };

    const response = await GET(request, params);

    expect(response.status).toBe(200);
    expect(mockFs.createReadStream).toHaveBeenCalledWith(
      "/path/large_backup.sql",
    );
  });
});
