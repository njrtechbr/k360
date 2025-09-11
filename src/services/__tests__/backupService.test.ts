import { BackupService } from "../backupService";
import { BackupValidator } from "../backupValidator";
import { promises as fs } from "fs";
import type { BackupOptions, BackupMetadata } from "@/types/backup";

// Mock das dependências
jest.mock("../backupValidator");
jest.mock("fs", () => ({
  promises: {
    access: jest.fn(),
    mkdir: jest.fn(),
    stat: jest.fn(),
    statfs: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn(),
  },
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
}));

describe("BackupService - Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock do ambiente
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/testdb";
    process.env.BACKUP_DIRECTORY = "./test-backups";
    process.env.PGDUMP_PATH = "pg_dump";
    process.env.PGDUMP_TIMEOUT = "3600";
    process.env.BACKUP_MAX_SIZE_GB = "10";

    // Mock padrão do BackupValidator
    (BackupValidator.validateBackup as jest.Mock).mockResolvedValue({
      isValid: true,
      checksum: "test-checksum-abc123",
      size: 1024 * 1024,
      hasValidStructure: true,
      errors: [],
      warnings: [],
      validationTime: 100,
    });

    (BackupValidator.calculateChecksum as jest.Mock).mockResolvedValue(
      "test-checksum-abc123",
    );
    (BackupValidator.validateMultipleBackups as jest.Mock).mockResolvedValue(
      {},
    );
    (BackupValidator.generateValidationReport as jest.Mock).mockReturnValue(
      "Relatório de teste",
    );
    (BackupValidator.detectFileCorruption as jest.Mock).mockResolvedValue(
      false,
    );

    // Mock do registry padrão
    const defaultRegistry = {
      backups: [],
      lastCleanup: new Date(),
      settings: {
        maxBackups: 50,
        retentionDays: 30,
        defaultDirectory: "./test-backups",
      },
    };

    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(defaultRegistry),
    );
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.unlink as jest.Mock).mockResolvedValue(undefined);
  });

  // Testes focados nos métodos que podem ser testados de forma unitária
  describe("Métodos Utilitários", () => {
    it("deve gerar nome de arquivo com timestamp correto", () => {
      const filename = (BackupService as any).generateTimestampFilename();

      expect(filename).toMatch(
        /^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.sql$/,
      );
    });

    it("deve gerar nomes únicos", () => {
      const filename1 = (BackupService as any).generateTimestampFilename();

      // Aguardar um milissegundo para garantir timestamp diferente
      setTimeout(() => {
        const filename2 = (BackupService as any).generateTimestampFilename();
        expect(filename1).not.toBe(filename2);
      }, 1);
    });

    it("deve construir argumentos do pg_dump corretamente", () => {
      const options: BackupOptions = { includeData: true, includeSchema: true };
      const args = (BackupService as any).buildPgDumpArgs(options);

      expect(args).toContain("--host");
      expect(args).toContain("localhost");
      expect(args).toContain("--port");
      expect(args).toContain("5432");
      expect(args).toContain("--username");
      expect(args).toContain("user");
      expect(args).toContain("--dbname");
      expect(args).toContain("testdb");
      expect(args).toContain("--verbose");
      expect(args).toContain("--no-password");
    });

    it("deve adicionar --data-only quando includeSchema é false", () => {
      const options: BackupOptions = { includeSchema: false };
      const args = (BackupService as any).buildPgDumpArgs(options);

      expect(args).toContain("--data-only");
    });

    it("deve adicionar --schema-only quando includeData é false", () => {
      const options: BackupOptions = { includeData: false };
      const args = (BackupService as any).buildPgDumpArgs(options);

      expect(args).toContain("--schema-only");
    });

    it("deve extrair senha da URL do banco corretamente", () => {
      const password = (BackupService as any).extractPasswordFromDatabaseUrl();
      expect(password).toBe("pass");
    });

    it("deve retornar string vazia quando não há senha na URL", () => {
      process.env.DATABASE_URL = "postgresql://user@localhost:5432/testdb";
      const password = (BackupService as any).extractPasswordFromDatabaseUrl();
      expect(password).toBe("");
    });
  });

  describe("Validação de Opções", () => {
    it("deve aceitar opções válidas", () => {
      const options: BackupOptions = {
        filename: "test_backup.sql",
        directory: "./backups",
        includeData: true,
        includeSchema: true,
        compress: false,
      };

      // Não deve lançar erro
      expect(() => {
        (BackupService as any).validateBackupOptions(options);
      }).not.toThrow();
    });

    it("deve rejeitar nome de arquivo inválido", () => {
      const options: BackupOptions = {
        filename: "invalid/filename.sql",
      };

      expect(() => {
        (BackupService as any).validateBackupOptions(options);
      }).toThrow("Nome do arquivo inválido");
    });

    it("deve rejeitar quando includeData e includeSchema são ambos false", () => {
      const options: BackupOptions = {
        includeData: false,
        includeSchema: false,
      };

      expect(() => {
        (BackupService as any).validateBackupOptions(options);
      }).toThrow("Pelo menos um de includeData ou includeSchema deve ser true");
    });

    it("deve aceitar filename com extensão .gz", () => {
      const options: BackupOptions = {
        filename: "backup_compressed.sql.gz",
      };

      expect(() => {
        (BackupService as any).validateBackupOptions(options);
      }).not.toThrow();
    });

    it("deve aceitar diretório relativo válido", () => {
      const options: BackupOptions = {
        directory: "./valid-directory",
      };

      expect(() => {
        (BackupService as any).validateBackupOptions(options);
      }).not.toThrow();
    });
  });

  describe("Tratamento de Erros de Configuração", () => {
    it("deve lançar erro quando DATABASE_URL não está configurada", () => {
      delete process.env.DATABASE_URL;

      expect(() => {
        (BackupService as any).buildPgDumpArgs({});
      }).toThrow("DATABASE_URL não configurada");
    });

    it("deve lançar erro quando DATABASE_URL é inválida", () => {
      process.env.DATABASE_URL = "invalid-url";

      expect(() => {
        (BackupService as any).buildPgDumpArgs({});
      }).toThrow("URL do banco de dados inválida");
    });

    it("deve funcionar com URL válida sem senha", () => {
      process.env.DATABASE_URL = "postgresql://user@localhost:5432/testdb";

      expect(() => {
        (BackupService as any).buildPgDumpArgs({});
      }).not.toThrow();
    });
  });

  describe("listBackups", () => {
    it("deve retornar lista vazia quando não há backups", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

      const backups = await BackupService.listBackups();

      expect(backups).toEqual([]);
    });

    it("deve retornar backups ordenados por data", async () => {
      const mockRegistry = {
        backups: [
          { id: "1", createdAt: new Date("2025-01-01") },
          { id: "2", createdAt: new Date("2025-01-02") },
          { id: "3", createdAt: new Date("2025-01-03") },
        ],
        lastCleanup: null,
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const backups = await BackupService.listBackups();

      expect(backups).toHaveLength(3);
      expect(backups[0].id).toBe("3"); // Mais recente primeiro
      expect(backups[2].id).toBe("1"); // Mais antigo por último
    });
  });

  describe("validateBackup", () => {
    it("deve retornar true para arquivo SQL válido", async () => {
      // Mock do BackupValidator para retornar resultado válido
      (BackupValidator.validateBackup as jest.Mock).mockResolvedValue({
        isValid: true,
        checksum: "abc123",
        size: 1000,
        hasValidStructure: true,
        errors: [],
        warnings: [],
        validationTime: 100,
      });

      const isValid = await BackupService.validateBackup("test.sql");

      expect(isValid).toBe(true);
      expect(BackupValidator.validateBackup).toHaveBeenCalledWith(
        "test.sql",
        undefined,
      );
    });

    it("deve retornar true para arquivo com checksum válido", async () => {
      (BackupValidator.validateBackup as jest.Mock).mockResolvedValue({
        isValid: true,
        checksum: "expected-checksum",
        size: 1000,
        hasValidStructure: true,
        errors: [],
        warnings: [],
        validationTime: 100,
      });

      const isValid = await BackupService.validateBackup(
        "test.sql",
        "expected-checksum",
      );

      expect(isValid).toBe(true);
      expect(BackupValidator.validateBackup).toHaveBeenCalledWith(
        "test.sql",
        "expected-checksum",
      );
    });

    it("deve retornar false para arquivo vazio", async () => {
      // Mock do BackupValidator para retornar resultado inválido
      (BackupValidator.validateBackup as jest.Mock).mockResolvedValue({
        isValid: false,
        checksum: "",
        size: 0,
        hasValidStructure: false,
        errors: ["Arquivo de backup está vazio"],
        warnings: [],
        validationTime: 50,
      });

      const isValid = await BackupService.validateBackup("empty.sql");

      expect(isValid).toBe(false);
    });

    it("deve retornar false para arquivo inexistente", async () => {
      // Mock do BackupValidator para retornar resultado inválido
      (BackupValidator.validateBackup as jest.Mock).mockResolvedValue({
        isValid: false,
        checksum: "",
        size: 0,
        hasValidStructure: false,
        errors: ["Arquivo não encontrado"],
        warnings: [],
        validationTime: 25,
      });

      const isValid = await BackupService.validateBackup("nonexistent.sql");

      expect(isValid).toBe(false);
    });

    it("deve retornar false quando BackupValidator lança exceção", async () => {
      (BackupValidator.validateBackup as jest.Mock).mockRejectedValue(
        new Error("Erro de validação"),
      );

      const isValid = await BackupService.validateBackup("error.sql");

      expect(isValid).toBe(false);
    });
  });

  describe("getBackupValidationDetails", () => {
    it("deve retornar detalhes completos da validação", async () => {
      const mockValidationResult = {
        isValid: true,
        checksum: "abc123",
        size: 1000,
        hasValidStructure: true,
        errors: [],
        warnings: ["Aviso menor"],
        validationTime: 150,
      };

      (BackupValidator.validateBackup as jest.Mock).mockResolvedValue(
        mockValidationResult,
      );

      const details = await BackupService.getBackupValidationDetails(
        "test.sql",
        "abc123",
      );

      expect(details).toEqual(mockValidationResult);
      expect(BackupValidator.validateBackup).toHaveBeenCalledWith(
        "test.sql",
        "abc123",
      );
    });
  });

  describe("Validação Múltipla de Backups", () => {
    it("deve validar múltiplos backups com sucesso", async () => {
      const mockRegistry = {
        backups: [
          { id: "1", filepath: "/path/backup1.sql", checksum: "checksum1" },
          { id: "2", filepath: "/path/backup2.sql", checksum: "checksum2" },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const mockValidationResults = {
        "/path/backup1.sql": {
          isValid: true,
          checksum: "checksum1",
          errors: [],
        },
        "/path/backup2.sql": {
          isValid: true,
          checksum: "checksum2",
          errors: [],
        },
      };

      (BackupValidator.validateMultipleBackups as jest.Mock).mockResolvedValue(
        mockValidationResults,
      );
      (BackupValidator.generateValidationReport as jest.Mock).mockReturnValue(
        "Relatório de validação",
      );

      const result = await BackupService.validateMultipleBackups(["1", "2"]);

      expect(result.results).toEqual(mockValidationResults);
      expect(result.report).toBe("Relatório de validação");
      expect(BackupValidator.validateMultipleBackups).toHaveBeenCalledWith(
        ["/path/backup1.sql", "/path/backup2.sql"],
        { "/path/backup1.sql": "checksum1", "/path/backup2.sql": "checksum2" },
      );
    });

    it("deve lançar erro quando nenhum backup é encontrado", async () => {
      const mockRegistry = {
        backups: [],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      await expect(
        BackupService.validateMultipleBackups(["nonexistent"]),
      ).rejects.toThrow("Nenhum backup válido encontrado para validação");
    });
  });

  describe("runIntegrityCheck", () => {
    it("deve executar verificação de integridade com sucesso", async () => {
      const mockRegistry = {
        backups: [
          {
            id: "1",
            filepath: "/path/backup1.sql",
            checksum: "checksum1",
            filename: "backup1.sql",
          },
          {
            id: "2",
            filepath: "/path/backup2.sql",
            checksum: "checksum2",
            filename: "backup2.sql",
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const mockValidationResults = {
        "/path/backup1.sql": {
          isValid: true,
          checksum: "checksum1",
          errors: [],
        },
        "/path/backup2.sql": {
          isValid: true,
          checksum: "checksum2",
          errors: [],
        },
      };

      (BackupValidator.validateMultipleBackups as jest.Mock).mockResolvedValue(
        mockValidationResults,
      );
      (BackupValidator.generateValidationReport as jest.Mock).mockReturnValue(
        "Relatório completo",
      );

      const result = await BackupService.runIntegrityCheck();

      expect(result.success).toBe(true);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(2);
      expect(result.summary.invalid).toBe(0);
      expect(result.summary.successRate).toBe(100);
      expect(result.message).toContain("2/2 backups válidos");
    });

    it("deve retornar mensagem quando não há backups", async () => {
      const mockRegistry = {
        backups: [],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const result = await BackupService.runIntegrityCheck();

      expect(result.success).toBe(true);
      expect(result.message).toBe("Nenhum backup encontrado para verificação");
      expect(result.results).toEqual({});
    });

    it("deve detectar backups inválidos", async () => {
      const mockRegistry = {
        backups: [
          {
            id: "1",
            filepath: "/path/backup1.sql",
            checksum: "checksum1",
            filename: "backup1.sql",
          },
          {
            id: "2",
            filepath: "/path/backup2.sql",
            checksum: "checksum2",
            filename: "backup2.sql",
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const mockValidationResults = {
        "/path/backup1.sql": {
          isValid: true,
          checksum: "checksum1",
          errors: [],
        },
        "/path/backup2.sql": {
          isValid: false,
          checksum: "",
          errors: ["Arquivo corrompido"],
        },
      };

      (BackupValidator.validateMultipleBackups as jest.Mock).mockResolvedValue(
        mockValidationResults,
      );
      (BackupValidator.generateValidationReport as jest.Mock).mockReturnValue(
        "Relatório com erros",
      );

      const result = await BackupService.runIntegrityCheck();

      expect(result.success).toBe(false);
      expect(result.summary.total).toBe(2);
      expect(result.summary.valid).toBe(1);
      expect(result.summary.invalid).toBe(1);
      expect(result.summary.successRate).toBe(50);
    });
  });

  describe("detectCorruptedBackups", () => {
    it("deve detectar backups corrompidos", async () => {
      const mockRegistry = {
        backups: [
          {
            id: "1",
            filepath: "/path/backup1.sql",
            filename: "backup1.sql",
            createdAt: new Date(),
            size: 1000,
          },
          {
            id: "2",
            filepath: "/path/backup2.sql",
            filename: "backup2.sql",
            createdAt: new Date(),
            size: 2000,
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      (BackupValidator.detectFileCorruption as jest.Mock)
        .mockResolvedValueOnce(false) // backup1 não corrompido
        .mockResolvedValueOnce(true); // backup2 corrompido

      const result = await BackupService.detectCorruptedBackups();

      expect(result.corruptedCount).toBe(1);
      expect(result.totalCount).toBe(2);
      expect(result.corruptedBackups).toHaveLength(1);
      expect(result.corruptedBackups[0].id).toBe("2");
    });

    it("deve tratar erros de acesso a arquivo como corrupção", async () => {
      const mockRegistry = {
        backups: [
          {
            id: "1",
            filepath: "/path/backup1.sql",
            filename: "backup1.sql",
            createdAt: new Date(),
            size: 1000,
          },
        ],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );
      (BackupValidator.detectFileCorruption as jest.Mock).mockRejectedValue(
        new Error("Arquivo não encontrado"),
      );

      const result = await BackupService.detectCorruptedBackups();

      expect(result.corruptedCount).toBe(1);
      expect(result.totalCount).toBe(1);
    });
  });

  describe("deleteBackup", () => {
    it("deve excluir backup com sucesso", async () => {
      const mockBackup = {
        id: "test-id",
        filename: "test.sql",
        filepath: "/path/test.sql",
        size: 1000,
        checksum: "abc123",
        createdAt: new Date(),
        status: "success" as const,
        duration: 5000,
        databaseVersion: "15.0",
        schemaVersion: "1.0.0",
      };

      const mockRegistry = {
        backups: [mockBackup],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );
      (fs.unlink as jest.Mock).mockResolvedValue(undefined);
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await BackupService.deleteBackup("test-id");

      expect(result).toBe(true);
      expect(fs.unlink).toHaveBeenCalledWith("/path/test.sql");
      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining("registry.json"),
        expect.stringMatching(/"backups":\s*\[\s*\]/),
      );
    });

    it("deve retornar false quando backup não é encontrado", async () => {
      const mockRegistry = {
        backups: [],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const result = await BackupService.deleteBackup("nonexistent-id");

      expect(result).toBe(false);
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it("deve continuar mesmo se arquivo físico não existir", async () => {
      const mockBackup = {
        id: "test-id",
        filename: "test.sql",
        filepath: "/path/test.sql",
        size: 1000,
        checksum: "abc123",
        createdAt: new Date(),
        status: "success" as const,
        duration: 5000,
        databaseVersion: "15.0",
        schemaVersion: "1.0.0",
      };

      const mockRegistry = {
        backups: [mockBackup],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );
      (fs.unlink as jest.Mock).mockRejectedValue(new Error("File not found"));
      (fs.writeFile as jest.Mock).mockResolvedValue(undefined);

      const result = await BackupService.deleteBackup("test-id");

      expect(result).toBe(true); // Deve continuar mesmo com erro no unlink
    });
  });

  describe("getBackupInfo", () => {
    it("deve retornar informações do backup quando encontrado", async () => {
      const testDate = new Date("2025-01-01T10:00:00.000Z");
      const mockBackup = {
        id: "test-id",
        filename: "test.sql",
        filepath: "/path/test.sql",
        size: 1000,
        checksum: "abc123",
        createdAt: testDate,
        status: "success" as const,
        duration: 5000,
        databaseVersion: "15.0",
        schemaVersion: "1.0.0",
      };

      const mockRegistry = {
        backups: [mockBackup],
        lastCleanup: null,
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const info = await BackupService.getBackupInfo("test-id");

      // A data será deserializada como string, então comparamos com string
      expect(info).toEqual({
        ...mockBackup,
        createdAt: testDate.toISOString(),
      });
    });

    it("deve retornar null quando backup não é encontrado", async () => {
      const mockRegistry = {
        backups: [],
        lastCleanup: null,
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: "./backups",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const info = await BackupService.getBackupInfo("nonexistent-id");

      expect(info).toBeNull();
    });
  });

  describe("Operações de Arquivo e Registry", () => {
    it("deve carregar registry padrão quando arquivo não existe", async () => {
      (fs.readFile as jest.Mock).mockRejectedValue(new Error("File not found"));

      const registry = await (BackupService as any).loadRegistry();

      expect(registry.backups).toEqual([]);
      expect(registry.settings.maxBackups).toBe(50);
      expect(registry.settings.retentionDays).toBe(30);
    });

    it("deve carregar registry existente", async () => {
      const mockRegistry = {
        backups: [{ id: "1", filename: "test.sql" }],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 100,
          retentionDays: 60,
          defaultDirectory: "./custom",
        },
      };

      (fs.readFile as jest.Mock).mockResolvedValue(
        JSON.stringify(mockRegistry),
      );

      const registry = await (BackupService as any).loadRegistry();

      expect(registry.backups).toHaveLength(1);
      expect(registry.settings.maxBackups).toBe(100);
    });

    it("deve obter informações do banco de dados", async () => {
      const dbInfo = await (BackupService as any).getDatabaseInfo();

      expect(dbInfo.version).toBeDefined();
      expect(dbInfo.schemaVersion).toBeDefined();
    });
  });

  describe("Mocks do Sistema de Arquivos", () => {
    it("deve simular verificação de diretório existente", async () => {
      (fs.access as jest.Mock).mockResolvedValue(undefined);

      await expect(
        (BackupService as any).ensureDirectoryExists("./test-dir"),
      ).resolves.not.toThrow();
    });

    it("deve simular criação de diretório quando não existe", async () => {
      (fs.access as jest.Mock).mockRejectedValue({ code: "ENOENT" });
      (fs.mkdir as jest.Mock).mockResolvedValue(undefined);

      await expect(
        (BackupService as any).ensureDirectoryExists("./new-dir"),
      ).resolves.not.toThrow();

      expect(fs.mkdir).toHaveBeenCalledWith("./new-dir", { recursive: true });
    });

    it("deve simular verificação de espaço em disco", async () => {
      (fs.statfs as jest.Mock).mockResolvedValue({
        bavail: 10000000, // Muito espaço disponível
        bsize: 4096, // ~40GB disponível
      });

      await expect(
        (BackupService as any).checkDiskSpace("./test-dir"),
      ).resolves.not.toThrow();
    });

    it("deve simular erro de espaço insuficiente", async () => {
      (fs.statfs as jest.Mock).mockResolvedValue({
        bavail: 100, // Muito pouco espaço
        bsize: 4096,
      });

      await expect(
        (BackupService as any).checkDiskSpace("./test-dir"),
      ).rejects.toThrow("Espaço insuficiente em disco");
    });
  });

  describe("Mocks do BackupValidator", () => {
    it("deve simular validação bem-sucedida", async () => {
      (BackupValidator.validateBackup as jest.Mock).mockResolvedValue({
        isValid: true,
        checksum: "valid-checksum",
        size: 1000,
        hasValidStructure: true,
        errors: [],
        warnings: [],
        validationTime: 100,
      });

      const result = await BackupService.validateBackup("test.sql");
      expect(result).toBe(true);
    });

    it("deve simular cálculo de checksum", async () => {
      (BackupValidator.calculateChecksum as jest.Mock).mockResolvedValue(
        "calculated-checksum",
      );

      const checksum = await BackupValidator.calculateChecksum("test.sql");
      expect(checksum).toBe("calculated-checksum");
    });

    it("deve simular detecção de corrupção", async () => {
      (BackupValidator.detectFileCorruption as jest.Mock).mockResolvedValue(
        true,
      );

      const isCorrupted =
        await BackupValidator.detectFileCorruption("corrupted.sql");
      expect(isCorrupted).toBe(true);
    });

    it("deve simular validação múltipla", async () => {
      const mockResults = {
        "file1.sql": { isValid: true, errors: [] },
        "file2.sql": { isValid: false, errors: ["Erro de validação"] },
      };

      (BackupValidator.validateMultipleBackups as jest.Mock).mockResolvedValue(
        mockResults,
      );

      const results = await BackupValidator.validateMultipleBackups(
        ["file1.sql", "file2.sql"],
        {},
      );
      expect(results).toEqual(mockResults);
    });

    it("deve simular geração de relatório", () => {
      const mockResults = {
        "file1.sql": { isValid: true, errors: [] },
      };

      (BackupValidator.generateValidationReport as jest.Mock).mockReturnValue(
        "Relatório de teste",
      );

      const report = BackupValidator.generateValidationReport(mockResults);
      expect(report).toBe("Relatório de teste");
    });
  });

  describe("Integração com pg_dump", () => {
    it("deve construir argumentos corretos para backup completo", () => {
      const options: BackupOptions = {
        includeData: true,
        includeSchema: true,
      };

      const args = (BackupService as any).buildPgDumpArgs(options);

      expect(args).toContain("--create");
      expect(args).toContain("--clean");
      expect(args).not.toContain("--data-only");
      expect(args).not.toContain("--schema-only");
    });

    it("deve construir argumentos para backup apenas de dados", () => {
      const options: BackupOptions = {
        includeData: true,
        includeSchema: false,
      };

      const args = (BackupService as any).buildPgDumpArgs(options);

      expect(args).toContain("--data-only");
      expect(args).not.toContain("--create");
      expect(args).not.toContain("--clean");
    });

    it("deve construir argumentos para backup apenas de schema", () => {
      const options: BackupOptions = {
        includeData: false,
        includeSchema: true,
      };

      const args = (BackupService as any).buildPgDumpArgs(options);

      expect(args).toContain("--schema-only");
      expect(args).toContain("--create");
      expect(args).toContain("--clean");
    });
  });
});
