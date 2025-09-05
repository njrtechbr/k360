import { promises as fs } from 'fs';
import path from 'path';

/**
 * Tipos de erro específicos para operações de backup
 */
export enum BackupErrorType {
  DATABASE_CONNECTION = 'DATABASE_CONNECTION',
  BACKUP_CREATION = 'BACKUP_CREATION',
  FILE_SYSTEM = 'FILE_SYSTEM',
  VALIDATION = 'VALIDATION',
  PERMISSION = 'PERMISSION',
  DISK_SPACE = 'DISK_SPACE',
  TIMEOUT = 'TIMEOUT',
  CORRUPTION = 'CORRUPTION',
  REGISTRY = 'REGISTRY',
  COMPRESSION = 'COMPRESSION',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Severidade dos erros
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

/**
 * Interface para configuração de retry
 */
export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: BackupErrorType[];
}

/**
 * Interface para log de erro
 */
export interface ErrorLog {
  id: string;
  timestamp: Date;
  errorType: BackupErrorType;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context: Record<string, any>;
  attemptNumber: number;
  resolved: boolean;
  resolutionStrategy?: string;
}

/**
 * Interface para estratégia de fallback
 */
export interface FallbackStrategy {
  errorType: BackupErrorType;
  strategy: string;
  action: () => Promise<any>;
  description: string;
}

/**
 * Classe base para erros de backup
 */
export class BackupError extends Error {
  public readonly id: string;
  public readonly timestamp: Date;
  public readonly context: Record<string, any>;
  public readonly severity: ErrorSeverity;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    public readonly errorType: BackupErrorType,
    context: Record<string, any> = {},
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'BackupError';
    this.id = this.generateErrorId();
    this.timestamp = new Date();
    this.context = context;
    this.severity = severity;
    this.isRetryable = isRetryable;
  }

  private generateErrorId(): string {
    return `backup_error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      message: this.message,
      errorType: this.errorType,
      severity: this.severity,
      timestamp: this.timestamp,
      context: this.context,
      isRetryable: this.isRetryable,
      stack: this.stack
    };
  }
}

/**
 * Erros específicos para diferentes tipos de falha
 */
export class DatabaseConnectionError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.DATABASE_CONNECTION, context, ErrorSeverity.HIGH, true);
  }
}

export class BackupCreationError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.BACKUP_CREATION, context, ErrorSeverity.HIGH, true);
  }
}

export class FileSystemError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.FILE_SYSTEM, context, ErrorSeverity.MEDIUM, true);
  }
}

export class ValidationError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.VALIDATION, context, ErrorSeverity.MEDIUM, false);
  }
}

export class PermissionError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.PERMISSION, context, ErrorSeverity.HIGH, false);
  }
}

export class DiskSpaceError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.DISK_SPACE, context, ErrorSeverity.CRITICAL, false);
  }
}

export class TimeoutError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.TIMEOUT, context, ErrorSeverity.HIGH, true);
  }
}

export class CorruptionError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.CORRUPTION, context, ErrorSeverity.CRITICAL, false);
  }
}

export class RegistryError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.REGISTRY, context, ErrorSeverity.MEDIUM, true);
  }
}

export class CompressionError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.COMPRESSION, context, ErrorSeverity.MEDIUM, true);
  }
}

export class NetworkError extends BackupError {
  constructor(message: string, context: Record<string, any> = {}) {
    super(message, BackupErrorType.NETWORK, context, ErrorSeverity.MEDIUM, true);
  }
}

/**
 * Classe principal para tratamento de erros de backup
 */
export class BackupErrorHandler {
  private static readonly LOG_FILE = path.join(process.cwd(), 'backups', 'error-logs.json');
  private static readonly MAX_LOG_ENTRIES = 1000;
  
  private static readonly DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      BackupErrorType.DATABASE_CONNECTION,
      BackupErrorType.BACKUP_CREATION,
      BackupErrorType.FILE_SYSTEM,
      BackupErrorType.TIMEOUT,
      BackupErrorType.REGISTRY,
      BackupErrorType.COMPRESSION,
      BackupErrorType.NETWORK
    ]
  };

  private static fallbackStrategies: FallbackStrategy[] = [
    {
      errorType: BackupErrorType.DISK_SPACE,
      strategy: 'cleanup_old_backups',
      description: 'Limpar backups antigos para liberar espaço',
      action: async () => {
        const { BackupStorage } = await import('./backupStorage');
        return await BackupStorage.cleanupOldBackups();
      }
    },
    {
      errorType: BackupErrorType.COMPRESSION,
      strategy: 'fallback_uncompressed',
      description: 'Criar backup sem compressão',
      action: async () => {
        return { compress: false };
      }
    },
    {
      errorType: BackupErrorType.PERMISSION,
      strategy: 'alternative_directory',
      description: 'Tentar diretório alternativo',
      action: async () => {
        const tempDir = path.join(process.cwd(), 'temp-backups');
        await fs.mkdir(tempDir, { recursive: true });
        return { directory: tempDir };
      }
    },
    {
      errorType: BackupErrorType.DATABASE_CONNECTION,
      strategy: 'connection_retry',
      description: 'Tentar reconexão com timeout aumentado',
      action: async () => {
        return { timeout: 60000 };
      }
    }
  ];

  /**
   * Executa uma operação com retry automático e tratamento de erros
   */
  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    context: Record<string, any> = {},
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<T> {
    const config = { ...this.DEFAULT_RETRY_CONFIG, ...retryConfig };
    let lastError: BackupError | null = null;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Se chegou aqui, a operação foi bem-sucedida
        if (lastError) {
          await this.logErrorResolution(lastError, attempt, 'retry_success');
        }
        
        return result;
        
      } catch (error) {
        const backupError = this.normalizeError(error, context);
        lastError = backupError;
        
        // Log do erro
        await this.logError(backupError, attempt, operationName);
        
        // Verificar se o erro é retryable
        if (!config.retryableErrors.includes(backupError.errorType) || attempt === config.maxAttempts) {
          // Tentar estratégias de fallback antes de falhar definitivamente
          const fallbackResult = await this.tryFallbackStrategies(backupError, operationName, context);
          if (fallbackResult.success) {
            await this.logErrorResolution(backupError, attempt, fallbackResult.strategy);
            return fallbackResult.result;
          }
          
          throw backupError;
        }
        
        // Calcular delay para próxima tentativa
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        console.warn(`Tentativa ${attempt}/${config.maxAttempts} falhou para ${operationName}. Tentando novamente em ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Normaliza diferentes tipos de erro para BackupError
   */
  static normalizeError(error: any, context: Record<string, any> = {}): BackupError {
    if (error instanceof BackupError) {
      return error;
    }
    
    const message = error?.message || 'Erro desconhecido';
    const errorContext = { ...context, originalError: error };
    
    // Detectar tipo de erro baseado na mensagem ou propriedades
    if (message.includes('ECONNREFUSED') || message.includes('connection')) {
      return new DatabaseConnectionError(message, errorContext);
    }
    
    if (message.includes('ENOENT') || message.includes('file not found')) {
      return new FileSystemError(message, errorContext);
    }
    
    if (message.includes('EACCES') || message.includes('permission')) {
      return new PermissionError(message, errorContext);
    }
    
    if (message.includes('ENOSPC') || message.includes('disk space')) {
      return new DiskSpaceError(message, errorContext);
    }
    
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return new TimeoutError(message, errorContext);
    }
    
    if (message.includes('pg_dump') || message.includes('backup creation')) {
      return new BackupCreationError(message, errorContext);
    }
    
    if (message.includes('validation') || message.includes('checksum')) {
      return new ValidationError(message, errorContext);
    }
    
    if (message.includes('registry') || message.includes('metadata')) {
      return new RegistryError(message, errorContext);
    }
    
    if (message.includes('compression') || message.includes('gzip')) {
      return new CompressionError(message, errorContext);
    }
    
    // Erro genérico
    return new BackupError(message, BackupErrorType.UNKNOWN, errorContext);
  }

  /**
   * Tenta estratégias de fallback para recuperar de erros
   */
  private static async tryFallbackStrategies(
    error: BackupError,
    operationName: string,
    context: Record<string, any>
  ): Promise<{ success: boolean; result?: any; strategy?: string }> {
    const applicableStrategies = this.fallbackStrategies.filter(
      strategy => strategy.errorType === error.errorType
    );
    
    for (const strategy of applicableStrategies) {
      try {
        console.log(`Tentando estratégia de fallback: ${strategy.description}`);
        
        const fallbackResult = await strategy.action();
        
        // Se a estratégia retornou configurações, tentar a operação novamente
        if (fallbackResult && typeof fallbackResult === 'object') {
          return {
            success: true,
            result: fallbackResult,
            strategy: strategy.strategy
          };
        }
        
        return {
          success: true,
          result: fallbackResult,
          strategy: strategy.strategy
        };
        
      } catch (fallbackError) {
        console.warn(`Estratégia de fallback ${strategy.strategy} falhou:`, fallbackError);
        await this.logError(
          this.normalizeError(fallbackError, { 
            ...context, 
            fallbackStrategy: strategy.strategy,
            originalError: error 
          }),
          1,
          `fallback_${strategy.strategy}`
        );
      }
    }
    
    return { success: false };
  }

  /**
   * Registra um erro no log
   */
  static async logError(
    error: BackupError,
    attemptNumber: number,
    operationName: string
  ): Promise<void> {
    try {
      const errorLog: ErrorLog = {
        id: error.id,
        timestamp: error.timestamp,
        errorType: error.errorType,
        severity: error.severity,
        message: error.message,
        stack: error.stack,
        context: {
          ...error.context,
          operationName,
          attemptNumber
        },
        attemptNumber,
        resolved: false
      };
      
      await this.appendToErrorLog(errorLog);
      
      // Log no console baseado na severidade
      const logMethod = this.getLogMethod(error.severity);
      logMethod(`[${error.errorType}] ${error.message}`, {
        id: error.id,
        attempt: attemptNumber,
        operation: operationName,
        context: error.context
      });
      
    } catch (logError) {
      console.error('Falha ao registrar erro:', logError);
    }
  }

  /**
   * Registra a resolução de um erro
   */
  static async logErrorResolution(
    error: BackupError,
    finalAttempt: number,
    strategy: string
  ): Promise<void> {
    try {
      const logs = await this.readErrorLogs();
      const logIndex = logs.findIndex(log => log.id === error.id);
      
      if (logIndex >= 0) {
        logs[logIndex].resolved = true;
        logs[logIndex].resolutionStrategy = strategy;
        await this.writeErrorLogs(logs);
      }
      
      console.info(`Erro ${error.id} resolvido usando estratégia: ${strategy} (tentativa ${finalAttempt})`);
      
    } catch (logError) {
      console.error('Falha ao registrar resolução de erro:', logError);
    }
  }

  /**
   * Lê os logs de erro do arquivo
   */
  private static async readErrorLogs(): Promise<ErrorLog[]> {
    try {
      const data = await fs.readFile(this.LOG_FILE, 'utf8');
      const logs = JSON.parse(data) as ErrorLog[];
      
      // Converter strings de data de volta para objetos Date
      return logs.map(log => ({
        ...log,
        timestamp: new Date(log.timestamp)
      }));
    } catch {
      return [];
    }
  }

  /**
   * Escreve os logs de erro no arquivo
   */
  private static async writeErrorLogs(logs: ErrorLog[]): Promise<void> {
    // Manter apenas os logs mais recentes
    const recentLogs = logs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, this.MAX_LOG_ENTRIES);
    
    await fs.writeFile(this.LOG_FILE, JSON.stringify(recentLogs, null, 2), 'utf8');
  }

  /**
   * Adiciona um log de erro ao arquivo
   */
  private static async appendToErrorLog(errorLog: ErrorLog): Promise<void> {
    const logs = await this.readErrorLogs();
    logs.push(errorLog);
    await this.writeErrorLogs(logs);
  }

  /**
   * Obtém o método de log apropriado baseado na severidade
   */
  private static getLogMethod(severity: ErrorSeverity): typeof console.log {
    switch (severity) {
      case ErrorSeverity.LOW:
        return console.info;
      case ErrorSeverity.MEDIUM:
        return console.warn;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return console.error;
      default:
        return console.log;
    }
  }

  /**
   * Utilitário para sleep
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Obtém estatísticas dos erros
   */
  static async getErrorStats(days: number = 7): Promise<{
    totalErrors: number;
    errorsByType: Record<BackupErrorType, number>;
    errorsBySeverity: Record<ErrorSeverity, number>;
    resolvedErrors: number;
    unresolvedErrors: number;
    mostCommonErrors: Array<{ type: BackupErrorType; count: number }>;
  }> {
    const logs = await this.readErrorLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const recentLogs = logs.filter(log => log.timestamp >= cutoffDate);
    
    const errorsByType: Record<BackupErrorType, number> = {} as any;
    const errorsBySeverity: Record<ErrorSeverity, number> = {} as any;
    
    let resolvedErrors = 0;
    let unresolvedErrors = 0;
    
    for (const log of recentLogs) {
      errorsByType[log.errorType] = (errorsByType[log.errorType] || 0) + 1;
      errorsBySeverity[log.severity] = (errorsBySeverity[log.severity] || 0) + 1;
      
      if (log.resolved) {
        resolvedErrors++;
      } else {
        unresolvedErrors++;
      }
    }
    
    const mostCommonErrors = Object.entries(errorsByType)
      .map(([type, count]) => ({ type: type as BackupErrorType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    return {
      totalErrors: recentLogs.length,
      errorsByType,
      errorsBySeverity,
      resolvedErrors,
      unresolvedErrors,
      mostCommonErrors
    };
  }

  /**
   * Limpa logs antigos
   */
  static async cleanupOldLogs(daysToKeep: number = 30): Promise<number> {
    const logs = await this.readErrorLogs();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    const recentLogs = logs.filter(log => log.timestamp >= cutoffDate);
    const removedCount = logs.length - recentLogs.length;
    
    if (removedCount > 0) {
      await this.writeErrorLogs(recentLogs);
    }
    
    return removedCount;
  }

  /**
   * Obtém logs de erro com filtros
   */
  static async getErrorLogs(options: {
    errorType?: BackupErrorType;
    severity?: ErrorSeverity;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<ErrorLog[]> {
    let logs = await this.readErrorLogs();
    
    // Aplicar filtros
    if (options.errorType) {
      logs = logs.filter(log => log.errorType === options.errorType);
    }
    
    if (options.severity) {
      logs = logs.filter(log => log.severity === options.severity);
    }
    
    if (options.resolved !== undefined) {
      logs = logs.filter(log => log.resolved === options.resolved);
    }
    
    if (options.startDate) {
      logs = logs.filter(log => log.timestamp >= options.startDate!);
    }
    
    if (options.endDate) {
      logs = logs.filter(log => log.timestamp <= options.endDate!);
    }
    
    // Ordenar por data (mais recente primeiro)
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    // Aplicar limite
    if (options.limit) {
      logs = logs.slice(0, options.limit);
    }
    
    return logs;
  }

  /**
   * Gera relatório de erros
   */
  static async generateErrorReport(days: number = 7): Promise<string> {
    const stats = await this.getErrorStats(days);
    const recentErrors = await this.getErrorLogs({ limit: 10 });
    
    const lines: string[] = [];
    lines.push(`=== RELATÓRIO DE ERROS DE BACKUP (${days} dias) ===\n`);
    
    lines.push('RESUMO GERAL:');
    lines.push(`Total de erros: ${stats.totalErrors}`);
    lines.push(`Erros resolvidos: ${stats.resolvedErrors}`);
    lines.push(`Erros não resolvidos: ${stats.unresolvedErrors}`);
    lines.push(`Taxa de resolução: ${stats.totalErrors > 0 ? ((stats.resolvedErrors / stats.totalErrors) * 100).toFixed(1) : 0}%\n`);
    
    lines.push('ERROS POR TIPO:');
    for (const [type, count] of Object.entries(stats.errorsByType)) {
      lines.push(`  ${type}: ${count}`);
    }
    lines.push('');
    
    lines.push('ERROS POR SEVERIDADE:');
    for (const [severity, count] of Object.entries(stats.errorsBySeverity)) {
      lines.push(`  ${severity}: ${count}`);
    }
    lines.push('');
    
    lines.push('ERROS MAIS COMUNS:');
    for (const error of stats.mostCommonErrors) {
      lines.push(`  ${error.type}: ${error.count} ocorrências`);
    }
    lines.push('');
    
    if (recentErrors.length > 0) {
      lines.push('ERROS RECENTES:');
      for (const error of recentErrors.slice(0, 5)) {
        lines.push(`  [${error.timestamp.toISOString()}] ${error.errorType}: ${error.message}`);
        if (!error.resolved) {
          lines.push(`    Status: NÃO RESOLVIDO`);
        }
      }
    }
    
    return lines.join('\n');
  }
}