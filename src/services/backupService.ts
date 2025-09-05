import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { 
  BackupOptions, 
  BackupResult, 
  BackupMetadata, 
  BackupRegistry 
} from '@/types/backup';
import { BackupValidator } from './backupValidator';
import { 
  BackupErrorHandler,
  BackupError,
  DatabaseConnectionError,
  BackupCreationError,
  FileSystemError,
  ValidationError,
  PermissionError,
  DiskSpaceError,
  TimeoutError,
  RegistryError,
  CompressionError
} from './backupErrorHandler';

// Função para atualizar progresso (importada do endpoint de status)
type ProgressCallback = (
  backupId: string, 
  progress: number, 
  message: string, 
  status?: 'in_progress' | 'completed' | 'failed'
) => void;

let updateProgressCallback: ProgressCallback | null = null;

export function setProgressCallback(callback: ProgressCallback) {
  updateProgressCallback = callback;
}

export class BackupService {
  private static readonly REGISTRY_PATH = path.join(process.cwd(), 'backups', 'registry.json');
  private static readonly DEFAULT_BACKUP_DIR = process.env.BACKUP_DIRECTORY || './backups/files';
  private static readonly PGDUMP_PATH = process.env.PGDUMP_PATH || 'pg_dump';
  private static readonly PGDUMP_TIMEOUT = parseInt(process.env.PGDUMP_TIMEOUT || '3600') * 1000;
  private static readonly MAX_SIZE_GB = parseInt(process.env.BACKUP_MAX_SIZE_GB || '10');

  /**
   * Cria um backup completo do banco de dados com tratamento robusto de erros
   */
  static async createBackup(options: BackupOptions & { createdBy?: string } = {}): Promise<BackupResult & { id?: string }> {
    const backupId = crypto.randomUUID();
    const context = { backupId, options };
    
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        const startTime = Date.now();
        
        // Atualizar progresso inicial
        if (updateProgressCallback) {
          updateProgressCallback(backupId, 0, 'Iniciando backup...', 'in_progress');
        }
        
        try {
          // Validar parâmetros de entrada
          await this.validateBackupOptionsWithRetry(options);
          
          if (updateProgressCallback) {
            updateProgressCallback(backupId, 10, 'Validando parâmetros...', 'in_progress');
          }

          // Gerar nome do arquivo com timestamp se não fornecido
          const filename = options.filename || this.generateTimestampFilename();
          const directory = options.directory || this.DEFAULT_BACKUP_DIR;
          
          // Garantir que o diretório existe
          await this.ensureDirectoryExistsWithRetry(directory);
          
          const filepath = path.join(directory, filename);
          
          if (updateProgressCallback) {
            updateProgressCallback(backupId, 20, 'Verificando espaço em disco...', 'in_progress');
          }
          
          // Verificar espaço em disco disponível
          await this.checkDiskSpaceWithRetry(directory);

          if (updateProgressCallback) {
            updateProgressCallback(backupId, 30, 'Executando pg_dump...', 'in_progress');
          }

          // Executar pg_dump com retry
          const dumpResult = await this.executePgDumpWithRetry(filepath, options, (progress) => {
            if (updateProgressCallback) {
              updateProgressCallback(backupId, 30 + (progress * 0.4), 'Criando backup...', 'in_progress');
            }
          });
          
          if (!dumpResult.success) {
            if (updateProgressCallback) {
              updateProgressCallback(backupId, 0, dumpResult.error || 'Falha na execução do pg_dump', 'failed');
            }
            throw new BackupCreationError(dumpResult.error || 'Falha na execução do pg_dump', { filepath, options });
          }

          if (updateProgressCallback) {
            updateProgressCallback(backupId, 70, 'Calculando checksum...', 'in_progress');
          }

          // Calcular tamanho e checksum do arquivo
          const stats = await fs.stat(filepath);
          const checksum = await BackupValidator.calculateChecksum(filepath);
          
          if (updateProgressCallback) {
            updateProgressCallback(backupId, 80, 'Validando integridade...', 'in_progress');
          }
          
          // Validar integridade do backup criado
          const validationResult = await BackupValidator.validateBackup(filepath, checksum);
          if (!validationResult.isValid) {
            // Log detalhado dos erros de validação
            console.error('Falha na validação do backup:', {
              filepath,
              errors: validationResult.errors,
              warnings: validationResult.warnings,
              validationTime: validationResult.validationTime
            });
            
            if (updateProgressCallback) {
              updateProgressCallback(backupId, 0, `Falha na validação: ${validationResult.errors.join(', ')}`, 'failed');
            }
            
            throw new ValidationError(
              `Backup criado falhou na validação: ${validationResult.errors.join(', ')}`,
              { filepath, validationResult }
            );
          }
          
          // Log avisos se houver
          if (validationResult.warnings.length > 0) {
            console.warn('Avisos na validação do backup:', validationResult.warnings);
          }
          
          // Comprimir se solicitado
          let finalFilepath = filepath;
          let finalSize = stats.size;
          
          if (options.compress) {
            if (updateProgressCallback) {
              updateProgressCallback(backupId, 85, 'Comprimindo arquivo...', 'in_progress');
            }
            
            finalFilepath = await this.compressBackupWithRetry(filepath);
            const compressedStats = await fs.stat(finalFilepath);
            finalSize = compressedStats.size;
            
            // Remover arquivo original após compressão
            await fs.unlink(filepath);
          }

          if (updateProgressCallback) {
            updateProgressCallback(backupId, 95, 'Salvando metadados...', 'in_progress');
          }

          const duration = Date.now() - startTime;
          
          // Obter informações do banco de dados
          const dbInfo = await this.getDatabaseInfoWithRetry();
          
          // Criar metadados do backup
          const metadata: BackupMetadata = {
            id: backupId,
            filename: path.basename(finalFilepath),
            filepath: finalFilepath,
            size: finalSize,
            checksum,
            createdAt: new Date(),
            createdBy: options.createdBy,
            status: 'success',
            duration,
            databaseVersion: dbInfo.version,
            schemaVersion: dbInfo.schemaVersion
          };

          // Salvar no registry com retry
          await this.saveBackupMetadataWithRetry(metadata);

          if (updateProgressCallback) {
            updateProgressCallback(backupId, 100, 'Backup concluído com sucesso!', 'completed');
          }

          return {
            success: true,
            id: backupId,
            filename: metadata.filename,
            filepath: finalFilepath,
            size: finalSize,
            checksum,
            duration
          };

        } catch (error) {
          const duration = Date.now() - startTime;
          
          if (updateProgressCallback) {
            updateProgressCallback(backupId, 0, error instanceof Error ? error.message : 'Erro desconhecido', 'failed');
          }
          
          // Re-throw para que o BackupErrorHandler possa processar
          throw error;
        }
      },
      'createBackup',
      context,
      {
        maxAttempts: 3,
        baseDelay: 2000,
        maxDelay: 30000
      }
    ).catch(error => {
      // Se todas as tentativas falharam, retornar resultado de erro
      return {
        success: false,
        id: backupId,
        filename: '',
        filepath: '',
        size: 0,
        checksum: '',
        duration: 0,
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    });
  }

  /**
   * Valida as opções de backup fornecidas com retry
   */
  private static async validateBackupOptionsWithRetry(options: BackupOptions): Promise<void> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        if (options.filename && !/^[a-zA-Z0-9_-]+\.sql(\.gz)?$/.test(options.filename)) {
          throw new ValidationError('Nome do arquivo inválido. Use apenas letras, números, _ e -', { filename: options.filename });
        }

        if (options.directory && !path.isAbsolute(options.directory) && !options.directory.startsWith('./')) {
          throw new ValidationError('Diretório deve ser um caminho absoluto ou relativo válido', { directory: options.directory });
        }

        // Validar se includeData e includeSchema não são ambos false
        if (options.includeData === false && options.includeSchema === false) {
          throw new ValidationError('Pelo menos um de includeData ou includeSchema deve ser true', { options });
        }
      },
      'validateBackupOptions',
      { options },
      { maxAttempts: 1 } // Validação não precisa de retry
    );
  }

  /**
   * Valida as opções de backup fornecidas (método legado)
   */
  private static validateBackupOptions(options: BackupOptions): void {
    if (options.filename && !/^[a-zA-Z0-9_-]+\.sql(\.gz)?$/.test(options.filename)) {
      throw new ValidationError('Nome do arquivo inválido. Use apenas letras, números, _ e -', { filename: options.filename });
    }

    if (options.directory && !path.isAbsolute(options.directory) && !options.directory.startsWith('./')) {
      throw new ValidationError('Diretório deve ser um caminho absoluto ou relativo válido', { directory: options.directory });
    }

    // Validar se includeData e includeSchema não são ambos false
    if (options.includeData === false && options.includeSchema === false) {
      throw new ValidationError('Pelo menos um de includeData ou includeSchema deve ser true', { options });
    }
  }

  /**
   * Gera nome de arquivo com timestamp automático
   */
  private static generateTimestampFilename(): string {
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/:/g, '-')
      .replace(/\./g, '-')
      .replace('T', '_')
      .slice(0, 19);
    
    return `backup_${timestamp}.sql`;
  }

  /**
   * Garante que o diretório existe com retry
   */
  private static async ensureDirectoryExistsWithRetry(directory: string): Promise<void> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        try {
          await fs.access(directory);
        } catch (error: any) {
          if (error?.code === 'ENOENT') {
            try {
              await fs.mkdir(directory, { recursive: true });
            } catch (mkdirError: any) {
              if (mkdirError?.code === 'EACCES') {
                throw new PermissionError(`Sem permissão para criar diretório: ${directory}`, { directory, error: mkdirError });
              }
              throw new FileSystemError(`Falha ao criar diretório: ${directory}`, { directory, error: mkdirError });
            }
          } else if (error?.code === 'EACCES') {
            throw new PermissionError(`Sem permissão para acessar diretório: ${directory}`, { directory, error });
          } else {
            throw new FileSystemError(`Erro ao acessar diretório: ${directory}`, { directory, error });
          }
        }
      },
      'ensureDirectoryExists',
      { directory }
    );
  }

  /**
   * Garante que o diretório existe (método legado)
   */
  private static async ensureDirectoryExists(directory: string): Promise<void> {
    try {
      await fs.access(directory);
    } catch {
      await fs.mkdir(directory, { recursive: true });
    }
  }

  /**
   * Verifica espaço disponível em disco com retry
   */
  private static async checkDiskSpaceWithRetry(directory: string): Promise<void> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        try {
          const stats = await fs.statfs(directory);
          const availableGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
          
          if (availableGB < this.MAX_SIZE_GB) {
            throw new DiskSpaceError(
              `Espaço insuficiente em disco. Disponível: ${availableGB.toFixed(2)}GB, Necessário: ${this.MAX_SIZE_GB}GB`,
              { directory, availableGB, requiredGB: this.MAX_SIZE_GB }
            );
          }
        } catch (error) {
          if (error instanceof DiskSpaceError) throw error;
          // Se não conseguir verificar o espaço, continua (pode não estar disponível em todos os sistemas)
          console.warn('Não foi possível verificar espaço em disco:', error);
        }
      },
      'checkDiskSpace',
      { directory }
    );
  }

  /**
   * Verifica espaço disponível em disco (método legado)
   */
  private static async checkDiskSpace(directory: string): Promise<void> {
    try {
      const stats = await fs.statfs(directory);
      const availableGB = (stats.bavail * stats.bsize) / (1024 * 1024 * 1024);
      
      if (availableGB < this.MAX_SIZE_GB) {
        throw new DiskSpaceError(
          `Espaço insuficiente em disco. Disponível: ${availableGB.toFixed(2)}GB, Necessário: ${this.MAX_SIZE_GB}GB`,
          { directory, availableGB, requiredGB: this.MAX_SIZE_GB }
        );
      }
    } catch (error) {
      if (error instanceof DiskSpaceError) throw error;
      // Se não conseguir verificar o espaço, continua (pode não estar disponível em todos os sistemas)
      console.warn('Não foi possível verificar espaço em disco:', error);
    }
  }

  /**
   * Executa o comando pg_dump com retry
   */
  private static async executePgDumpWithRetry(
    filepath: string, 
    options: BackupOptions,
    progressCallback?: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        const result = await this.executePgDump(filepath, options, progressCallback);
        if (!result.success) {
          // Determinar tipo de erro baseado na mensagem
          if (result.error?.includes('connection') || result.error?.includes('ECONNREFUSED')) {
            throw new DatabaseConnectionError(result.error, { filepath, options });
          } else if (result.error?.includes('timeout') || result.error?.includes('Timeout')) {
            throw new TimeoutError(result.error, { filepath, options });
          } else if (result.error?.includes('permission') || result.error?.includes('EACCES')) {
            throw new PermissionError(result.error, { filepath, options });
          } else {
            throw new BackupCreationError(result.error || 'Falha desconhecida no pg_dump', { filepath, options });
          }
        }
        return result;
      },
      'executePgDump',
      { filepath, options },
      {
        maxAttempts: 3,
        baseDelay: 5000,
        maxDelay: 30000
      }
    );
  }

  /**
   * Executa o comando pg_dump (método legado)
   */
  private static async executePgDump(
    filepath: string, 
    options: BackupOptions,
    progressCallback?: (progress: number) => void
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const args = this.buildPgDumpArgs(options);
      
      const pgDump = spawn(this.PGDUMP_PATH, args, {
        env: {
          ...process.env,
          PGPASSWORD: this.extractPasswordFromDatabaseUrl()
        }
      });

      const outputFile = require('fs').createWriteStream(filepath);
      pgDump.stdout.pipe(outputFile);

      let errorOutput = '';
      let progressEstimate = 0;
      
      pgDump.stderr.on('data', (data) => {
        const output = data.toString();
        errorOutput += output;
        
        // Simular progresso baseado na saída do pg_dump
        if (progressCallback && output.includes('COPY')) {
          progressEstimate = Math.min(progressEstimate + 5, 90);
          progressCallback(progressEstimate);
        }
      });

      const timeout = setTimeout(() => {
        pgDump.kill('SIGTERM');
        resolve({
          success: false,
          error: `Timeout: pg_dump excedeu ${this.PGDUMP_TIMEOUT / 1000} segundos`
        });
      }, this.PGDUMP_TIMEOUT);

      pgDump.on('close', (code) => {
        clearTimeout(timeout);
        outputFile.close();
        
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({
            success: false,
            error: `pg_dump falhou com código ${code}: ${errorOutput}`
          });
        }
      });

      pgDump.on('error', (error) => {
        clearTimeout(timeout);
        outputFile.close();
        resolve({
          success: false,
          error: `Erro ao executar pg_dump: ${error.message}`
        });
      });
    });
  }

  /**
   * Constrói argumentos para o comando pg_dump
   */
  private static buildPgDumpArgs(options: BackupOptions): string[] {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new DatabaseConnectionError('DATABASE_URL não configurada', { options });
    }

    try {
      const url = new URL(databaseUrl);
      const args = [
        '--host', url.hostname,
        '--port', url.port || '5432',
        '--username', url.username,
        '--dbname', url.pathname.slice(1), // Remove leading slash
        '--verbose',
        '--no-password'
      ];

      // Configurar opções de conteúdo
      if (options.includeSchema === false) {
        args.push('--data-only');
      } else if (options.includeData === false) {
        args.push('--schema-only');
      }

      // Adicionar opções padrão para backup completo
      if (options.includeSchema !== false) {
        args.push('--create', '--clean');
      }

      return args;
    } catch (error) {
      throw new DatabaseConnectionError('URL do banco de dados inválida', { databaseUrl, error, options });
    }
  }

  /**
   * Extrai a senha da URL do banco de dados
   */
  private static extractPasswordFromDatabaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return '';
    
    try {
      const url = new URL(databaseUrl);
      return url.password || '';
    } catch {
      return '';
    }
  }



  /**
   * Comprime o arquivo de backup usando gzip com retry
   */
  private static async compressBackupWithRetry(filepath: string): Promise<string> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        return await this.compressBackup(filepath);
      },
      'compressBackup',
      { filepath },
      {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 5000
      }
    );
  }

  /**
   * Comprime o arquivo de backup usando gzip (método legado)
   */
  private static async compressBackup(filepath: string): Promise<string> {
    const compressedPath = `${filepath}.gz`;
    
    return new Promise(async (resolve, reject) => {
      try {
        // Import dinâmico para evitar problemas em testes
        const archiver = (await import('archiver')).default;
        
        const output = require('fs').createWriteStream(compressedPath);
        const archive = archiver('gzip', { level: 9 });

        output.on('close', () => resolve(compressedPath));
        archive.on('error', (error) => {
          reject(new CompressionError(`Falha na compressão: ${error.message}`, { filepath, error }));
        });

        archive.pipe(output);
        archive.file(filepath, { name: path.basename(filepath) });
        archive.finalize();
      } catch (error) {
        reject(new CompressionError(`Erro ao inicializar compressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { filepath, error }));
      }
    });
  }

  /**
   * Obtém informações do banco de dados com retry
   */
  private static async getDatabaseInfoWithRetry(): Promise<{ version: string; schemaVersion: string }> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        return await this.getDatabaseInfo();
      },
      'getDatabaseInfo',
      {},
      {
        maxAttempts: 2,
        baseDelay: 1000,
        maxDelay: 5000
      }
    );
  }

  /**
   * Obtém informações do banco de dados (método legado)
   */
  private static async getDatabaseInfo(): Promise<{ version: string; schemaVersion: string }> {
    try {
      // Para simplicidade, retornamos valores padrão
      // Em uma implementação completa, isso faria queries no banco
      return {
        version: 'PostgreSQL 15.0',
        schemaVersion: '1.0.0'
      };
    } catch (error) {
      throw new DatabaseConnectionError(`Falha ao obter informações do banco: ${error instanceof Error ? error.message : 'Erro desconhecido'}`, { error });
    }
  }

  /**
   * Salva metadados do backup no registry com retry
   */
  private static async saveBackupMetadataWithRetry(metadata: BackupMetadata): Promise<void> {
    return await BackupErrorHandler.executeWithRetry(
      async () => {
        await this.saveBackupMetadata(metadata);
      },
      'saveBackupMetadata',
      { metadata },
      {
        maxAttempts: 3,
        baseDelay: 1000,
        maxDelay: 5000
      }
    );
  }

  /**
   * Salva metadados do backup no registry (método legado)
   */
  private static async saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
    try {
      const registry = await this.loadRegistry();
      registry.backups.push(metadata);
      
      // Manter apenas os backups mais recentes conforme configuração
      if (registry.backups.length > registry.settings.maxBackups) {
        registry.backups = registry.backups
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, registry.settings.maxBackups);
      }

      await fs.writeFile(this.REGISTRY_PATH, JSON.stringify(registry, null, 2));
    } catch (error) {
      console.error('Erro ao salvar metadados do backup:', error);
      throw new RegistryError('Falha ao salvar metadados do backup', { metadata, error });
    }
  }

  /**
   * Carrega o registry de backups
   */
  private static async loadRegistry(): Promise<BackupRegistry> {
    try {
      const data = await fs.readFile(this.REGISTRY_PATH, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Se o arquivo não existe, retorna registry padrão
      return {
        backups: [],
        lastCleanup: new Date(),
        settings: {
          maxBackups: 50,
          retentionDays: 30,
          defaultDirectory: this.DEFAULT_BACKUP_DIR
        }
      };
    }
  }

  /**
   * Lista todos os backups disponíveis
   */
  static async listBackups(): Promise<BackupMetadata[]> {
    const registry = await this.loadRegistry();
    return registry.backups.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Valida a integridade de um backup usando BackupValidator
   */
  static async validateBackup(filepath: string, expectedChecksum?: string): Promise<boolean> {
    try {
      const validationResult = await BackupValidator.validateBackup(filepath, expectedChecksum);
      return validationResult.isValid;
    } catch (error) {
      console.error('Erro durante validação de backup:', error);
      return false;
    }
  }

  /**
   * Obtém resultado detalhado da validação de um backup
   */
  static async getBackupValidationDetails(filepath: string, expectedChecksum?: string) {
    return await BackupValidator.validateBackup(filepath, expectedChecksum);
  }

  /**
   * Valida múltiplos backups e retorna relatório
   */
  static async validateMultipleBackups(backupIds: string[]) {
    try {
      const registry = await this.loadRegistry();
      const backupsToValidate: string[] = [];
      const expectedChecksums: Record<string, string> = {};

      // Mapear IDs para caminhos e checksums
      for (const backupId of backupIds) {
        const backup = registry.backups.find(b => b.id === backupId);
        if (backup) {
          backupsToValidate.push(backup.filepath);
          expectedChecksums[backup.filepath] = backup.checksum;
        }
      }

      if (backupsToValidate.length === 0) {
        throw new BackupError('Nenhum backup válido encontrado para validação', 'NO_BACKUPS_FOUND');
      }

      const results = await BackupValidator.validateMultipleBackups(backupsToValidate, expectedChecksums);
      return {
        results,
        report: BackupValidator.generateValidationReport(results)
      };

    } catch (error) {
      console.error('Erro durante validação múltipla:', error);
      throw error;
    }
  }

  /**
   * Executa verificação de integridade em todos os backups
   */
  static async runIntegrityCheck() {
    try {
      const registry = await this.loadRegistry();
      
      if (registry.backups.length === 0) {
        return {
          success: true,
          message: 'Nenhum backup encontrado para verificação',
          results: {}
        };
      }

      console.log(`Iniciando verificação de integridade de ${registry.backups.length} backup(s)...`);

      const filepaths = registry.backups.map(b => b.filepath);
      const expectedChecksums = registry.backups.reduce((acc, backup) => {
        acc[backup.filepath] = backup.checksum;
        return acc;
      }, {} as Record<string, string>);

      const results = await BackupValidator.validateMultipleBackups(filepaths, expectedChecksums);
      
      // Contar resultados
      const totalBackups = Object.keys(results).length;
      const validBackups = Object.values(results).filter(r => r.isValid).length;
      const invalidBackups = totalBackups - validBackups;

      // Atualizar status no registry se necessário
      for (const backup of registry.backups) {
        const result = results[backup.filepath];
        if (result && !result.isValid) {
          console.warn(`Backup ${backup.filename} falhou na verificação de integridade:`, result.errors);
        }
      }

      return {
        success: invalidBackups === 0,
        message: `Verificação concluída: ${validBackups}/${totalBackups} backups válidos`,
        results,
        report: BackupValidator.generateValidationReport(results),
        summary: {
          total: totalBackups,
          valid: validBackups,
          invalid: invalidBackups,
          successRate: totalBackups > 0 ? (validBackups / totalBackups) * 100 : 0
        }
      };

    } catch (error) {
      console.error('Erro durante verificação de integridade:', error);
      return {
        success: false,
        message: `Erro durante verificação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        results: {},
        summary: { total: 0, valid: 0, invalid: 0, successRate: 0 }
      };
    }
  }

  /**
   * Detecta e reporta backups corrompidos
   */
  static async detectCorruptedBackups() {
    try {
      const registry = await this.loadRegistry();
      const corruptedBackups: BackupMetadata[] = [];

      for (const backup of registry.backups) {
        try {
          const isCorrupted = await BackupValidator.detectFileCorruption(backup.filepath);
          if (isCorrupted) {
            corruptedBackups.push(backup);
          }
        } catch (error) {
          // Se não conseguir acessar o arquivo, considera corrompido
          corruptedBackups.push(backup);
        }
      }

      return {
        corruptedCount: corruptedBackups.length,
        totalCount: registry.backups.length,
        corruptedBackups: corruptedBackups.map(b => ({
          id: b.id,
          filename: b.filename,
          createdAt: b.createdAt,
          size: b.size
        }))
      };

    } catch (error) {
      console.error('Erro ao detectar backups corrompidos:', error);
      throw new BackupError('Falha ao detectar backups corrompidos', 'CORRUPTION_DETECTION_FAILED');
    }
  }

  /**
   * Exclui um backup pelo ID
   */
  static async deleteBackup(backupId: string): Promise<boolean> {
    try {
      const registry = await this.loadRegistry();
      const backupIndex = registry.backups.findIndex(b => b.id === backupId);
      
      if (backupIndex === -1) {
        return false;
      }

      const backup = registry.backups[backupIndex];
      
      // Remover arquivo físico
      try {
        await fs.unlink(backup.filepath);
      } catch (error) {
        console.warn(`Arquivo não encontrado: ${backup.filepath}`, error);
      }

      // Remover do registry
      registry.backups.splice(backupIndex, 1);
      await fs.writeFile(this.REGISTRY_PATH, JSON.stringify(registry, null, 2));

      return true;
    } catch (error) {
      console.error('Erro ao excluir backup:', error);
      return false;
    }
  }

  /**
   * Obtém informações de um backup específico
   */
  static async getBackupInfo(backupId: string): Promise<BackupMetadata | null> {
    const registry = await this.loadRegistry();
    return registry.backups.find(b => b.id === backupId) || null;
  }
}