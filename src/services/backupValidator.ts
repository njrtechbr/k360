import { promises as fs } from "fs";
import crypto from "crypto";
import path from "path";
import {
  ValidationError,
  FileSystemError,
  CorruptionError,
} from "./backupErrorHandler";

// Tipos específicos para validação
export interface ValidationResult {
  isValid: boolean;
  checksum: string;
  size: number;
  errors: string[];
  warnings: string[];
  validationTime: number;
}

export interface ChecksumValidation {
  matches: boolean;
  expected: string;
  actual: string;
}

export interface SqlStructureValidation {
  hasCreateStatements: boolean;
  hasInsertStatements: boolean;
  hasCopyStatements: boolean;
  hasValidHeader: boolean;
  hasValidFooter: boolean;
  tableCount: number;
  estimatedRecords: number;
}

// Re-exportar ValidationError do backupErrorHandler para compatibilidade
export { ValidationError } from "./backupErrorHandler";

/**
 * Classe responsável pela validação de integridade dos backups
 * Implementa verificação de checksums, estrutura SQL e detecção de corrupção
 */
export class BackupValidator {
  private static readonly SUPPORTED_EXTENSIONS = [".sql", ".sql.gz"];
  private static readonly MIN_BACKUP_SIZE = 100; // bytes mínimos para um backup válido
  private static readonly SQL_VALIDATION_PATTERNS = {
    CREATE_TABLE: /CREATE TABLE/gi,
    INSERT_INTO: /INSERT INTO/gi,
    COPY_FROM: /COPY .* FROM/gi,
    POSTGRES_DUMP_HEADER: /-- PostgreSQL database dump/gi,
    DUMP_COMPLETE: /-- PostgreSQL database dump complete/gi,
    SET_STATEMENT: /SET /gi,
    COMMENT: /^--/gm,
  };

  /**
   * Valida completamente um arquivo de backup
   */
  static async validateBackup(
    filepath: string,
    expectedChecksum?: string,
  ): Promise<ValidationResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // 1. Verificar se o arquivo existe e é acessível
      const fileExists = await this.validateFileExists(filepath);
      if (!fileExists.isValid) {
        errors.push(...fileExists.errors);
        return this.createValidationResult(
          false,
          "",
          0,
          errors,
          warnings,
          startTime,
        );
      }

      // 2. Verificar tamanho do arquivo
      const sizeValidation = await this.validateFileSize(filepath);
      if (!sizeValidation.isValid) {
        errors.push(...sizeValidation.errors);
      }
      if (sizeValidation.warnings.length > 0) {
        warnings.push(...sizeValidation.warnings);
      }

      // 3. Calcular e verificar checksum
      const checksum = await this.calculateChecksum(filepath);
      if (expectedChecksum) {
        const checksumValidation = this.validateChecksum(
          checksum,
          expectedChecksum,
        );
        if (!checksumValidation.matches) {
          errors.push(
            `Checksum não confere. Esperado: ${checksumValidation.expected}, Atual: ${checksumValidation.actual}`,
          );
        }
      }

      // 4. Validar estrutura do arquivo baseado na extensão
      const structureValidation = await this.validateFileStructure(filepath);
      if (!structureValidation.isValid) {
        errors.push(...structureValidation.errors);
      }
      if (structureValidation.warnings.length > 0) {
        warnings.push(...structureValidation.warnings);
      }

      // 5. Verificar se o arquivo não está corrompido
      const corruptionCheck = await this.checkFileCorruption(filepath);
      if (!corruptionCheck.isValid) {
        errors.push(...corruptionCheck.errors);
      }

      const isValid = errors.length === 0;
      const fileStats = await fs.stat(filepath);

      return this.createValidationResult(
        isValid,
        checksum,
        fileStats.size,
        errors,
        warnings,
        startTime,
      );
    } catch (error) {
      errors.push(
        `Erro durante validação: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      return this.createValidationResult(
        false,
        "",
        0,
        errors,
        warnings,
        startTime,
      );
    }
  }

  /**
   * Calcula checksum MD5 de um arquivo
   */
  static async calculateChecksum(filepath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const hash = crypto.createHash("md5");
        const fs = require("fs");
        const stream = fs.createReadStream(filepath);

        stream.on("data", (data: Buffer) => hash.update(data));
        stream.on("end", () => resolve(hash.digest("hex")));
        stream.on("error", (error: Error) =>
          reject(
            new ValidationError(`Erro ao calcular checksum: ${error.message}`, {
              filepath,
              error,
            }),
          ),
        );
      } catch (error) {
        reject(
          new ValidationError(
            `Erro ao inicializar cálculo de checksum: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
            { filepath, error },
          ),
        );
      }
    });
  }

  /**
   * Verifica se o checksum calculado confere com o esperado
   */
  static validateChecksum(
    actual: string,
    expected: string,
  ): ChecksumValidation {
    return {
      matches: actual.toLowerCase() === expected.toLowerCase(),
      expected: expected.toLowerCase(),
      actual: actual.toLowerCase(),
    };
  }

  /**
   * Valida a estrutura SQL de um backup
   */
  static async validateSqlStructure(
    filepath: string,
  ): Promise<SqlStructureValidation> {
    try {
      let content: string;

      // Ler conteúdo baseado na extensão
      if (filepath.endsWith(".gz")) {
        content = await this.readCompressedFile(filepath);
      } else {
        content = await fs.readFile(filepath, "utf-8");
      }

      // Analisar estrutura SQL
      const hasCreateStatements =
        this.SQL_VALIDATION_PATTERNS.CREATE_TABLE.test(content);
      const hasInsertStatements =
        this.SQL_VALIDATION_PATTERNS.INSERT_INTO.test(content);
      const hasCopyStatements =
        this.SQL_VALIDATION_PATTERNS.COPY_FROM.test(content);
      const hasValidHeader =
        this.SQL_VALIDATION_PATTERNS.POSTGRES_DUMP_HEADER.test(content);
      const hasValidFooter =
        this.SQL_VALIDATION_PATTERNS.DUMP_COMPLETE.test(content);

      // Contar tabelas e registros estimados
      const createMatches =
        content.match(this.SQL_VALIDATION_PATTERNS.CREATE_TABLE) || [];
      const insertMatches =
        content.match(this.SQL_VALIDATION_PATTERNS.INSERT_INTO) || [];
      const copyMatches =
        content.match(this.SQL_VALIDATION_PATTERNS.COPY_FROM) || [];

      return {
        hasCreateStatements,
        hasInsertStatements,
        hasCopyStatements,
        hasValidHeader,
        hasValidFooter,
        tableCount: createMatches.length,
        estimatedRecords: insertMatches.length + copyMatches.length,
      };
    } catch (error) {
      throw new ValidationError(
        `Erro ao validar estrutura SQL: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
        { filepath, error },
      );
    }
  }

  /**
   * Detecta se um arquivo está corrompido
   */
  static async detectFileCorruption(filepath: string): Promise<boolean> {
    try {
      // Para arquivos .sql, verificar se é texto válido
      if (filepath.endsWith(".sql")) {
        const content = await fs.readFile(filepath, "utf-8");

        // Verificar se contém caracteres de controle inválidos
        const hasInvalidChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(
          content,
        );
        if (hasInvalidChars) {
          return true;
        }

        // Verificar se termina abruptamente (sem footer válido)
        const hasValidEnding = content.trim().length > 0;
        return !hasValidEnding;
      }

      // Para arquivos .gz, tentar descomprimir uma pequena parte
      if (filepath.endsWith(".gz")) {
        try {
          await this.readCompressedFile(filepath, 1024); // Ler apenas 1KB para teste
          return false;
        } catch {
          return true;
        }
      }

      return false;
    } catch (error) {
      // Se não conseguir ler o arquivo, considera corrompido
      return true;
    }
  }

  /**
   * Verifica se o arquivo existe e é acessível
   */
  private static async validateFileExists(
    filepath: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      await fs.access(filepath, fs.constants.F_OK | fs.constants.R_OK);

      // Verificar extensão suportada
      const ext = path.extname(filepath).toLowerCase();
      const hasValidExtension = this.SUPPORTED_EXTENSIONS.some((validExt) =>
        filepath.toLowerCase().endsWith(validExt),
      );

      if (!hasValidExtension) {
        errors.push(
          `Extensão de arquivo não suportada: ${ext}. Suportadas: ${this.SUPPORTED_EXTENSIONS.join(", ")}`,
        );
      }

      return this.createValidationResult(
        errors.length === 0,
        "",
        0,
        errors,
        [],
        Date.now(),
      );
    } catch (error: any) {
      if (error && typeof error === "object" && "code" in error) {
        switch (error.code) {
          case "ENOENT":
            errors.push(`Arquivo não encontrado: ${filepath}`);
            break;
          case "EACCES":
            errors.push(`Sem permissão para acessar o arquivo: ${filepath}`);
            break;
          default:
            errors.push(
              `Erro ao acessar arquivo: ${error.message || "Erro desconhecido"}`,
            );
        }
      } else {
        errors.push(`Erro desconhecido ao acessar arquivo: ${filepath}`);
      }

      return this.createValidationResult(false, "", 0, errors, [], Date.now());
    }
  }

  /**
   * Valida o tamanho do arquivo
   */
  private static async validateFileSize(
    filepath: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const stats = await fs.stat(filepath);

      if (stats.size === 0) {
        errors.push("Arquivo de backup está vazio");
      } else if (stats.size < this.MIN_BACKUP_SIZE) {
        errors.push(
          `Arquivo muito pequeno (${stats.size} bytes). Mínimo esperado: ${this.MIN_BACKUP_SIZE} bytes`,
        );
      }

      // Avisar sobre arquivos muito grandes (>1GB)
      const sizeGB = stats.size / (1024 * 1024 * 1024);
      if (sizeGB > 1) {
        warnings.push(`Arquivo grande detectado: ${sizeGB.toFixed(2)}GB`);
      }

      return this.createValidationResult(
        errors.length === 0,
        "",
        stats.size,
        errors,
        warnings,
        Date.now(),
      );
    } catch (error) {
      errors.push(
        `Erro ao verificar tamanho do arquivo: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      return this.createValidationResult(
        false,
        "",
        0,
        errors,
        warnings,
        Date.now(),
      );
    }
  }

  /**
   * Valida a estrutura do arquivo baseado na extensão
   */
  private static async validateFileStructure(
    filepath: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      if (filepath.endsWith(".sql") || filepath.endsWith(".sql.gz")) {
        const sqlValidation = await this.validateSqlStructure(filepath);

        // Verificar elementos essenciais
        if (!sqlValidation.hasValidHeader) {
          warnings.push("Cabeçalho PostgreSQL não encontrado no backup");
        }

        if (
          !sqlValidation.hasCreateStatements &&
          !sqlValidation.hasInsertStatements &&
          !sqlValidation.hasCopyStatements
        ) {
          errors.push("Backup não contém dados nem estrutura de tabelas");
        }

        if (sqlValidation.tableCount === 0) {
          warnings.push("Nenhuma tabela encontrada no backup");
        }

        if (!sqlValidation.hasValidFooter) {
          warnings.push("Footer de conclusão do dump não encontrado");
        }

        // Informações adicionais
        if (sqlValidation.tableCount > 0) {
          warnings.push(`Backup contém ${sqlValidation.tableCount} tabela(s)`);
        }

        if (sqlValidation.estimatedRecords > 0) {
          warnings.push(
            `Estimativa de ${sqlValidation.estimatedRecords} operação(ões) de dados`,
          );
        }
      }

      return this.createValidationResult(
        errors.length === 0,
        "",
        0,
        errors,
        warnings,
        Date.now(),
      );
    } catch (error) {
      errors.push(
        `Erro ao validar estrutura: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      return this.createValidationResult(
        false,
        "",
        0,
        errors,
        warnings,
        Date.now(),
      );
    }
  }

  /**
   * Verifica corrupção do arquivo
   */
  private static async checkFileCorruption(
    filepath: string,
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const isCorrupted = await this.detectFileCorruption(filepath);

      if (isCorrupted) {
        errors.push("Arquivo parece estar corrompido ou incompleto");
      }

      return this.createValidationResult(
        !isCorrupted,
        "",
        0,
        errors,
        [],
        Date.now(),
      );
    } catch (error) {
      errors.push(
        `Erro ao verificar corrupção: ${error instanceof Error ? error.message : "Erro desconhecido"}`,
      );
      return this.createValidationResult(false, "", 0, errors, [], Date.now());
    }
  }

  /**
   * Lê arquivo comprimido (.gz)
   */
  private static async readCompressedFile(
    filepath: string,
    maxBytes?: number,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const zlib = require("zlib");
      const fs = require("fs");

      const readStream = fs.createReadStream(filepath);
      const gunzip = zlib.createGunzip();

      let content = "";
      let bytesRead = 0;

      gunzip.on("data", (chunk: Buffer) => {
        if (maxBytes && bytesRead + chunk.length > maxBytes) {
          const remainingBytes = maxBytes - bytesRead;
          content += chunk.slice(0, remainingBytes).toString("utf-8");
          gunzip.destroy();
          resolve(content);
          return;
        }

        content += chunk.toString("utf-8");
        bytesRead += chunk.length;
      });

      gunzip.on("end", () => resolve(content));
      gunzip.on("error", (error: Error) =>
        reject(
          new ValidationError(
            `Erro ao descomprimir arquivo: ${error.message}`,
            { filepath, error },
          ),
        ),
      );

      readStream.pipe(gunzip);
    });
  }

  /**
   * Cria resultado de validação padronizado
   */
  private static createValidationResult(
    isValid: boolean,
    checksum: string,
    size: number,
    errors: string[],
    warnings: string[],
    startTime: number,
  ): ValidationResult {
    return {
      isValid,
      checksum,
      size,
      errors: [...errors],
      warnings: [...warnings],
      validationTime: Date.now() - startTime,
    };
  }

  /**
   * Valida múltiplos backups em lote
   */
  static async validateMultipleBackups(
    filepaths: string[],
    expectedChecksums?: Record<string, string>,
  ): Promise<Record<string, ValidationResult>> {
    const results: Record<string, ValidationResult> = {};

    // Processar validações em paralelo (máximo 3 simultâneas para não sobrecarregar)
    const batchSize = 3;
    for (let i = 0; i < filepaths.length; i += batchSize) {
      const batch = filepaths.slice(i, i + batchSize);

      const batchPromises = batch.map(async (filepath) => {
        const expectedChecksum = expectedChecksums?.[filepath];
        const result = await this.validateBackup(filepath, expectedChecksum);
        return { filepath, result };
      });

      const batchResults = await Promise.all(batchPromises);

      for (const { filepath, result } of batchResults) {
        results[filepath] = result;
      }
    }

    return results;
  }

  /**
   * Gera relatório de validação em formato legível
   */
  static generateValidationReport(
    results: Record<string, ValidationResult>,
  ): string {
    const lines: string[] = [];
    lines.push("=== RELATÓRIO DE VALIDAÇÃO DE BACKUPS ===\n");

    let totalFiles = 0;
    let validFiles = 0;
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const [filepath, result] of Object.entries(results)) {
      totalFiles++;
      if (result.isValid) validFiles++;
      totalErrors += result.errors.length;
      totalWarnings += result.warnings.length;

      lines.push(`Arquivo: ${path.basename(filepath)}`);
      lines.push(`Status: ${result.isValid ? "✅ VÁLIDO" : "❌ INVÁLIDO"}`);
      lines.push(`Tamanho: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
      lines.push(`Checksum: ${result.checksum}`);
      lines.push(`Tempo de validação: ${result.validationTime}ms`);

      if (result.errors.length > 0) {
        lines.push("Erros:");
        result.errors.forEach((error) => lines.push(`  - ${error}`));
      }

      if (result.warnings.length > 0) {
        lines.push("Avisos:");
        result.warnings.forEach((warning) => lines.push(`  - ${warning}`));
      }

      lines.push(""); // Linha em branco
    }

    lines.push("=== RESUMO ===");
    lines.push(`Total de arquivos: ${totalFiles}`);
    lines.push(`Arquivos válidos: ${validFiles}`);
    lines.push(`Arquivos inválidos: ${totalFiles - validFiles}`);
    lines.push(`Total de erros: ${totalErrors}`);
    lines.push(`Total de avisos: ${totalWarnings}`);
    lines.push(
      `Taxa de sucesso: ${((validFiles / totalFiles) * 100).toFixed(1)}%`,
    );

    return lines.join("\n");
  }
}
