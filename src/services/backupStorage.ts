import { promises as fs } from "fs";
import path from "path";
import { BackupMetadata, BackupRegistry } from "@/types/backup";
import {
  RegistryError,
  FileSystemError,
  PermissionError,
} from "./backupErrorHandler";

export class BackupStorage {
  private static readonly REGISTRY_FILE = "registry.json";

  private static get DEFAULT_BACKUP_DIR(): string {
    return process.env.BACKUP_DIRECTORY || "./backups";
  }

  private static get DEFAULT_RETENTION_DAYS(): number {
    return parseInt(process.env.BACKUP_RETENTION_DAYS || "30");
  }

  private static get DEFAULT_MAX_BACKUPS(): number {
    return parseInt(process.env.BACKUP_MAX_BACKUPS || "50");
  }

  private static get registryPath(): string {
    return path.join(this.DEFAULT_BACKUP_DIR, this.REGISTRY_FILE);
  }

  /**
   * Inicializa o diretório de backup e o arquivo de registry se não existirem
   */
  static async initialize(): Promise<void> {
    try {
      // Criar diretório de backup se não existir
      await fs.mkdir(this.DEFAULT_BACKUP_DIR, { recursive: true });

      // Criar subdiretório para arquivos de backup
      const filesDir = path.join(this.DEFAULT_BACKUP_DIR, "files");
      await fs.mkdir(filesDir, { recursive: true });

      // Verificar se registry existe, se não criar um vazio
      try {
        await fs.access(this.registryPath);
      } catch {
        await this.createEmptyRegistry();
      }
    } catch (error) {
      throw new FileSystemError(
        `Falha ao inicializar BackupStorage: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        { error },
      );
    }
  }

  /**
   * Cria um arquivo de registry vazio com configurações padrão
   */
  private static async createEmptyRegistry(): Promise<void> {
    const emptyRegistry: BackupRegistry = {
      backups: [],
      lastCleanup: new Date(),
      settings: {
        maxBackups: this.DEFAULT_MAX_BACKUPS,
        retentionDays: this.DEFAULT_RETENTION_DAYS,
        defaultDirectory: this.DEFAULT_BACKUP_DIR,
      },
    };

    await fs.writeFile(
      this.registryPath,
      JSON.stringify(emptyRegistry, null, 2),
      "utf8",
    );
  }

  /**
   * Lê o arquivo de registry
   */
  private static async readRegistry(): Promise<BackupRegistry> {
    try {
      const data = await fs.readFile(this.registryPath, "utf8");
      const registry = JSON.parse(data) as BackupRegistry;

      // Converter strings de data de volta para objetos Date
      registry.backups = registry.backups.map((backup) => ({
        ...backup,
        createdAt: new Date(backup.createdAt),
      }));
      registry.lastCleanup = new Date(registry.lastCleanup);

      return registry;
    } catch (error) {
      throw new RegistryError(
        `Falha ao ler registry: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        { error },
      );
    }
  }

  /**
   * Escreve o arquivo de registry
   */
  private static async writeRegistry(registry: BackupRegistry): Promise<void> {
    try {
      await fs.writeFile(
        this.registryPath,
        JSON.stringify(registry, null, 2),
        "utf8",
      );
    } catch (error) {
      throw new RegistryError(
        `Falha ao escrever registry: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        { error },
      );
    }
  }

  /**
   * Adiciona um novo backup ao registry
   */
  static async addBackup(metadata: BackupMetadata): Promise<void> {
    await this.initialize();

    const registry = await this.readRegistry();

    // Verificar se já existe um backup com o mesmo ID
    const existingIndex = registry.backups.findIndex(
      (b) => b.id === metadata.id,
    );
    if (existingIndex >= 0) {
      throw new RegistryError(`Backup com ID ${metadata.id} já existe`, {
        metadata,
      });
    }

    registry.backups.push(metadata);
    await this.writeRegistry(registry);
  }

  /**
   * Atualiza um backup existente no registry
   */
  static async updateBackup(
    backupId: string,
    updates: Partial<BackupMetadata>,
  ): Promise<void> {
    await this.initialize();

    const registry = await this.readRegistry();
    const backupIndex = registry.backups.findIndex((b) => b.id === backupId);

    if (backupIndex === -1) {
      throw new RegistryError(`Backup com ID ${backupId} não encontrado`, {
        backupId,
      });
    }

    registry.backups[backupIndex] = {
      ...registry.backups[backupIndex],
      ...updates,
    };

    await this.writeRegistry(registry);
  }

  /**
   * Remove um backup do registry
   */
  static async removeBackup(backupId: string): Promise<void> {
    await this.initialize();

    const registry = await this.readRegistry();
    const initialLength = registry.backups.length;

    registry.backups = registry.backups.filter((b) => b.id !== backupId);

    if (registry.backups.length === initialLength) {
      throw new RegistryError(`Backup com ID ${backupId} não encontrado`, {
        backupId,
      });
    }

    await this.writeRegistry(registry);
  }

  /**
   * Busca um backup específico por ID
   */
  static async getBackup(backupId: string): Promise<BackupMetadata | null> {
    await this.initialize();

    const registry = await this.readRegistry();
    return registry.backups.find((b) => b.id === backupId) || null;
  }

  /**
   * Lista todos os backups com opções de filtro
   */
  static async listBackups(options?: {
    status?: "success" | "failed" | "in_progress";
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<BackupMetadata[]> {
    await this.initialize();

    const registry = await this.readRegistry();
    let backups = [...registry.backups];

    // Aplicar filtros
    if (options?.status) {
      backups = backups.filter((b) => b.status === options.status);
    }

    if (options?.startDate) {
      backups = backups.filter((b) => b.createdAt >= options.startDate!);
    }

    if (options?.endDate) {
      backups = backups.filter((b) => b.createdAt <= options.endDate!);
    }

    // Ordenar por data de criação (mais recente primeiro)
    backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Aplicar paginação
    if (options?.offset) {
      backups = backups.slice(options.offset);
    }

    if (options?.limit) {
      backups = backups.slice(0, options.limit);
    }

    return backups;
  }

  /**
   * Busca backups por nome ou padrão
   */
  static async searchBackups(searchTerm: string): Promise<BackupMetadata[]> {
    await this.initialize();

    const registry = await this.readRegistry();
    const lowerSearchTerm = searchTerm.toLowerCase();

    return registry.backups.filter(
      (backup) =>
        backup.filename.toLowerCase().includes(lowerSearchTerm) ||
        backup.createdBy?.toLowerCase().includes(lowerSearchTerm),
    );
  }

  /**
   * Obtém estatísticas dos backups
   */
  static async getBackupStats(): Promise<{
    total: number;
    successful: number;
    failed: number;
    inProgress: number;
    totalSize: number;
    oldestBackup?: Date;
    newestBackup?: Date;
  }> {
    await this.initialize();

    const registry = await this.readRegistry();
    const backups = registry.backups;

    const stats = {
      total: backups.length,
      successful: backups.filter((b) => b.status === "success").length,
      failed: backups.filter((b) => b.status === "failed").length,
      inProgress: backups.filter((b) => b.status === "in_progress").length,
      totalSize: backups.reduce((sum, b) => sum + b.size, 0),
      oldestBackup:
        backups.length > 0
          ? new Date(Math.min(...backups.map((b) => b.createdAt.getTime())))
          : undefined,
      newestBackup:
        backups.length > 0
          ? new Date(Math.max(...backups.map((b) => b.createdAt.getTime())))
          : undefined,
    };

    return stats;
  } /**
  
 * Limpa backups antigos baseado nas configurações de retenção
   */
  static async cleanupOldBackups(): Promise<{
    removed: number;
    freedSpace: number;
    errors: string[];
  }> {
    await this.initialize();

    const registry = await this.readRegistry();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - registry.settings.retentionDays);

    const backupsToRemove = registry.backups.filter(
      (backup) =>
        backup.createdAt < cutoffDate && backup.status !== "in_progress",
    );

    let removedCount = 0;
    let freedSpace = 0;
    const errors: string[] = [];

    for (const backup of backupsToRemove) {
      try {
        // Remover arquivo físico
        await fs.unlink(backup.filepath);

        // Remover do registry
        registry.backups = registry.backups.filter((b) => b.id !== backup.id);

        removedCount++;
        freedSpace += backup.size;
      } catch (error) {
        errors.push(
          `Falha ao remover backup ${backup.id}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
      }
    }

    // Atualizar data da última limpeza
    registry.lastCleanup = new Date();
    await this.writeRegistry(registry);

    return {
      removed: removedCount,
      freedSpace,
      errors,
    };
  }

  /**
   * Limpa backups excedentes baseado no limite máximo
   */
  static async cleanupExcessBackups(): Promise<{
    removed: number;
    freedSpace: number;
    errors: string[];
  }> {
    await this.initialize();

    const registry = await this.readRegistry();
    const successfulBackups = registry.backups
      .filter((b) => b.status === "success")
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (successfulBackups.length <= registry.settings.maxBackups) {
      return { removed: 0, freedSpace: 0, errors: [] };
    }

    const backupsToRemove = successfulBackups.slice(
      registry.settings.maxBackups,
    );

    let removedCount = 0;
    let freedSpace = 0;
    const errors: string[] = [];

    for (const backup of backupsToRemove) {
      try {
        // Remover arquivo físico
        await fs.unlink(backup.filepath);

        // Remover do registry
        registry.backups = registry.backups.filter((b) => b.id !== backup.id);

        removedCount++;
        freedSpace += backup.size;
      } catch (error) {
        errors.push(
          `Falha ao remover backup ${backup.id}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
      }
    }

    await this.writeRegistry(registry);

    return {
      removed: removedCount,
      freedSpace,
      errors,
    };
  }

  /**
   * Remove backups falhados ou corrompidos
   */
  static async cleanupFailedBackups(): Promise<{
    removed: number;
    freedSpace: number;
    errors: string[];
  }> {
    await this.initialize();

    const registry = await this.readRegistry();
    const failedBackups = registry.backups.filter((b) => b.status === "failed");

    let removedCount = 0;
    let freedSpace = 0;
    const errors: string[] = [];

    for (const backup of failedBackups) {
      try {
        // Tentar remover arquivo físico (pode não existir)
        try {
          await fs.unlink(backup.filepath);
          freedSpace += backup.size;
        } catch {
          // Arquivo pode não existir, continuar
        }

        // Remover do registry
        registry.backups = registry.backups.filter((b) => b.id !== backup.id);
        removedCount++;
      } catch (error) {
        errors.push(
          `Falha ao remover backup falhado ${backup.id}: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        );
      }
    }

    await this.writeRegistry(registry);

    return {
      removed: removedCount,
      freedSpace,
      errors,
    };
  }

  /**
   * Simula limpeza de backups antigos (dry-run)
   */
  static async simulateCleanupOldBackups(daysToKeep?: number): Promise<{
    wouldRemove: number;
    wouldFreeSpace: number;
    backupsToRemove: BackupMetadata[];
  }> {
    await this.initialize();

    const registry = await this.readRegistry();
    const retentionDays = daysToKeep || registry.settings.retentionDays;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const backupsToRemove = registry.backups.filter(
      (backup) =>
        backup.createdAt < cutoffDate && backup.status !== "in_progress",
    );

    const wouldFreeSpace = backupsToRemove.reduce(
      (sum, backup) => sum + backup.size,
      0,
    );

    return {
      wouldRemove: backupsToRemove.length,
      wouldFreeSpace,
      backupsToRemove,
    };
  }

  /**
   * Executa limpeza completa (antigos + excedentes + falhados)
   */
  static async performFullCleanup(): Promise<{
    totalRemoved: number;
    totalFreedSpace: number;
    details: {
      oldBackups: { removed: number; freedSpace: number; errors: string[] };
      excessBackups: { removed: number; freedSpace: number; errors: string[] };
      failedBackups: { removed: number; freedSpace: number; errors: string[] };
    };
  }> {
    const oldBackupsResult = await this.cleanupOldBackups();
    const excessBackupsResult = await this.cleanupExcessBackups();
    const failedBackupsResult = await this.cleanupFailedBackups();

    return {
      totalRemoved:
        oldBackupsResult.removed +
        excessBackupsResult.removed +
        failedBackupsResult.removed,
      totalFreedSpace:
        oldBackupsResult.freedSpace +
        excessBackupsResult.freedSpace +
        failedBackupsResult.freedSpace,
      details: {
        oldBackups: oldBackupsResult,
        excessBackups: excessBackupsResult,
        failedBackups: failedBackupsResult,
      },
    };
  }

  /**
   * Atualiza as configurações do sistema de backup
   */
  static async updateSettings(
    newSettings: Partial<BackupRegistry["settings"]>,
  ): Promise<void> {
    await this.initialize();

    const registry = await this.readRegistry();
    registry.settings = {
      ...registry.settings,
      ...newSettings,
    };

    await this.writeRegistry(registry);
  }

  /**
   * Obtém as configurações atuais
   */
  static async getSettings(): Promise<BackupRegistry["settings"]> {
    await this.initialize();

    const registry = await this.readRegistry();
    return registry.settings;
  }

  /**
   * Verifica se é necessário executar limpeza automática
   */
  static async shouldPerformCleanup(): Promise<boolean> {
    await this.initialize();

    const registry = await this.readRegistry();
    const daysSinceLastCleanup = Math.floor(
      (Date.now() - registry.lastCleanup.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Executar limpeza se passou mais de 1 dia desde a última
    return daysSinceLastCleanup >= 1;
  }

  /**
   * Valida a integridade do registry
   */
  static async validateRegistry(): Promise<{
    isValid: boolean;
    issues: string[];
    fixedIssues: string[];
  }> {
    await this.initialize();

    const issues: string[] = [];
    const fixedIssues: string[] = [];

    try {
      const registry = await this.readRegistry();

      // Verificar se arquivos de backup existem
      for (let i = registry.backups.length - 1; i >= 0; i--) {
        const backup = registry.backups[i];

        try {
          await fs.access(backup.filepath);
        } catch {
          issues.push(`Arquivo de backup não encontrado: ${backup.filepath}`);

          // Remover entrada órfã do registry
          registry.backups.splice(i, 1);
          fixedIssues.push(`Removida entrada órfã: ${backup.id}`);
        }
      }

      // Salvar registry corrigido se houve mudanças
      if (fixedIssues.length > 0) {
        await this.writeRegistry(registry);
      }

      return {
        isValid: issues.length === 0,
        issues,
        fixedIssues,
      };
    } catch (error) {
      return {
        isValid: false,
        issues: [
          `Erro ao validar registry: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        ],
        fixedIssues: [],
      };
    }
  }
}
