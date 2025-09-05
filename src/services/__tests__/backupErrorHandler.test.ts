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
  CompressionError,
  NetworkError,
  BackupErrorType,
  ErrorSeverity
} from '../backupErrorHandler';
import { promises as fs } from 'fs';
import path from 'path';

// Mock do fs para testes
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('BackupErrorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods para evitar spam nos testes
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Classes de Erro', () => {
    it('deve criar BackupError com propriedades corretas', () => {
      const context = { test: 'value' };
      const error = new BackupError(
        'Mensagem de teste',
        BackupErrorType.BACKUP_CREATION,
        context,
        ErrorSeverity.HIGH,
        true
      );

      expect(error.message).toBe('Mensagem de teste');
      expect(error.errorType).toBe(BackupErrorType.BACKUP_CREATION);
      expect(error.context).toEqual(context);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.isRetryable).toBe(true);
      expect(error.id).toBeDefined();
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('deve criar DatabaseConnectionError com configurações corretas', () => {
      const error = new DatabaseConnectionError('Conexão falhou');
      
      expect(error.errorType).toBe(BackupErrorType.DATABASE_CONNECTION);
      expect(error.severity).toBe(ErrorSeverity.HIGH);
      expect(error.isRetryable).toBe(true);
    });

    it('deve criar DiskSpaceError como não retryable', () => {
      const error = new DiskSpaceError('Espaço insuficiente');
      
      expect(error.errorType).toBe(BackupErrorType.DISK_SPACE);
      expect(error.severity).toBe(ErrorSeverity.CRITICAL);
      expect(error.isRetryable).toBe(false);
    });

    it('deve serializar erro para JSON corretamente', () => {
      const error = new BackupError('Teste', BackupErrorType.VALIDATION);
      const json = error.toJSON();

      expect(json).toHaveProperty('id');
      expect(json).toHaveProperty('name', 'BackupError');
      expect(json).toHaveProperty('message', 'Teste');
      expect(json).toHaveProperty('errorType', BackupErrorType.VALIDATION);
      expect(json).toHaveProperty('timestamp');
    });
  });

  describe('executeWithRetry', () => {
    it('deve executar operação com sucesso na primeira tentativa', async () => {
      const mockOperation = jest.fn().mockResolvedValue('sucesso');
      
      const result = await BackupErrorHandler.executeWithRetry(
        mockOperation,
        'testOperation'
      );

      expect(result).toBe('sucesso');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('deve fazer retry em erro retryable', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new DatabaseConnectionError('Falha temporária'))
        .mockResolvedValue('sucesso');

      mockFs.readFile.mockResolvedValue('[]');
      mockFs.writeFile.mockResolvedValue(undefined);

      const result = await BackupErrorHandler.executeWithRetry(
        mockOperation,
        'testOperation',
        {},
        { maxAttempts: 2, baseDelay: 10 }
      );

      expect(result).toBe('sucesso');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('deve falhar imediatamente em erro não retryable', async () => {
      const error = new ValidationError('Erro de validação');
      const mockOperation = jest.fn().mockRejectedValue(error);

      mockFs.readFile.mockResolvedValue('[]');
      mockFs.writeFile.mockResolvedValue(undefined);

      await expect(
        BackupErrorHandler.executeWithRetry(
          mockOperation,
          'testOperation',
          {},
          { maxAttempts: 3 }
        )
      ).rejects.toThrow('Erro de validação');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('deve esgotar tentativas e falhar', async () => {
      const error = new DatabaseConnectionError('Falha persistente');
      const mockOperation = jest.fn().mockRejectedValue(error);

      mockFs.readFile.mockResolvedValue('[]');
      mockFs.writeFile.mockResolvedValue(undefined);

      // Mock para evitar que estratégias de fallback sejam executadas
      jest.spyOn(BackupErrorHandler as any, 'tryFallbackStrategies').mockResolvedValue({ success: false });

      await expect(
        BackupErrorHandler.executeWithRetry(
          mockOperation,
          'testOperation',
          {},
          { maxAttempts: 2, baseDelay: 10 }
        )
      ).rejects.toThrow('Falha persistente');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('normalizeError', () => {
    it('deve retornar BackupError inalterado', () => {
      const originalError = new BackupError('Teste', BackupErrorType.VALIDATION);
      const normalized = BackupErrorHandler.normalizeError(originalError);
      
      expect(normalized).toBe(originalError);
    });

    it('deve detectar erro de conexão', () => {
      const error = new Error('ECONNREFUSED connection failed');
      const normalized = BackupErrorHandler.normalizeError(error);
      
      expect(normalized).toBeInstanceOf(DatabaseConnectionError);
      expect(normalized.errorType).toBe(BackupErrorType.DATABASE_CONNECTION);
    });

    it('deve detectar erro de arquivo não encontrado', () => {
      const error = new Error('ENOENT file not found');
      const normalized = BackupErrorHandler.normalizeError(error);
      
      expect(normalized).toBeInstanceOf(FileSystemError);
      expect(normalized.errorType).toBe(BackupErrorType.FILE_SYSTEM);
    });

    it('deve detectar erro de permissão', () => {
      const error = new Error('EACCES permission denied');
      const normalized = BackupErrorHandler.normalizeError(error);
      
      expect(normalized).toBeInstanceOf(PermissionError);
      expect(normalized.errorType).toBe(BackupErrorType.PERMISSION);
    });

    it('deve detectar erro de espaço em disco', () => {
      const error = new Error('ENOSPC no space left on device');
      const normalized = BackupErrorHandler.normalizeError(error);
      
      expect(normalized).toBeInstanceOf(DiskSpaceError);
      expect(normalized.errorType).toBe(BackupErrorType.DISK_SPACE);
    });

    it('deve detectar timeout', () => {
      const error = new Error('ETIMEDOUT operation timed out');
      const normalized = BackupErrorHandler.normalizeError(error);
      
      expect(normalized).toBeInstanceOf(TimeoutError);
      expect(normalized.errorType).toBe(BackupErrorType.TIMEOUT);
    });

    it('deve criar erro genérico para erro desconhecido', () => {
      const error = new Error('Erro desconhecido');
      const normalized = BackupErrorHandler.normalizeError(error);
      
      expect(normalized).toBeInstanceOf(BackupError);
      expect(normalized.errorType).toBe(BackupErrorType.UNKNOWN);
    });
  });

  describe('getErrorStats', () => {
    it('deve calcular estatísticas corretamente', async () => {
      const mockLogs = [
        {
          id: '1',
          timestamp: new Date(),
          errorType: BackupErrorType.DATABASE_CONNECTION,
          severity: ErrorSeverity.HIGH,
          message: 'Erro 1',
          context: {},
          attemptNumber: 1,
          resolved: true
        },
        {
          id: '2',
          timestamp: new Date(),
          errorType: BackupErrorType.DATABASE_CONNECTION,
          severity: ErrorSeverity.HIGH,
          message: 'Erro 2',
          context: {},
          attemptNumber: 1,
          resolved: false
        },
        {
          id: '3',
          timestamp: new Date(),
          errorType: BackupErrorType.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          message: 'Erro 3',
          context: {},
          attemptNumber: 1,
          resolved: true
        }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLogs));

      const stats = await BackupErrorHandler.getErrorStats(7);

      expect(stats.totalErrors).toBe(3);
      expect(stats.resolvedErrors).toBe(2);
      expect(stats.unresolvedErrors).toBe(1);
      expect(stats.errorsByType[BackupErrorType.DATABASE_CONNECTION]).toBe(2);
      expect(stats.errorsByType[BackupErrorType.VALIDATION]).toBe(1);
      expect(stats.errorsBySeverity[ErrorSeverity.HIGH]).toBe(2);
      expect(stats.errorsBySeverity[ErrorSeverity.MEDIUM]).toBe(1);
      expect(stats.mostCommonErrors[0]).toEqual({
        type: BackupErrorType.DATABASE_CONNECTION,
        count: 2
      });
    });

    it('deve retornar estatísticas vazias quando não há logs', async () => {
      mockFs.readFile.mockRejectedValue(new Error('File not found'));

      const stats = await BackupErrorHandler.getErrorStats(7);

      expect(stats.totalErrors).toBe(0);
      expect(stats.resolvedErrors).toBe(0);
      expect(stats.unresolvedErrors).toBe(0);
      expect(stats.mostCommonErrors).toEqual([]);
    });
  });

  describe('cleanupOldLogs', () => {
    it('deve remover logs antigos', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 40);
      
      const recentDate = new Date();
      recentDate.setDate(recentDate.getDate() - 10);

      const mockLogs = [
        {
          id: '1',
          timestamp: oldDate,
          errorType: BackupErrorType.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          message: 'Erro antigo',
          context: {},
          attemptNumber: 1,
          resolved: true
        },
        {
          id: '2',
          timestamp: recentDate,
          errorType: BackupErrorType.VALIDATION,
          severity: ErrorSeverity.MEDIUM,
          message: 'Erro recente',
          context: {},
          attemptNumber: 1,
          resolved: true
        }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLogs));
      mockFs.writeFile.mockResolvedValue(undefined);

      const removedCount = await BackupErrorHandler.cleanupOldLogs(30);

      expect(removedCount).toBe(1);
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Erro recente'),
        'utf8'
      );
    });
  });

  describe('generateErrorReport', () => {
    it('deve gerar relatório formatado', async () => {
      const mockLogs = [
        {
          id: '1',
          timestamp: new Date(),
          errorType: BackupErrorType.DATABASE_CONNECTION,
          severity: ErrorSeverity.HIGH,
          message: 'Erro de conexão',
          context: {},
          attemptNumber: 1,
          resolved: true
        }
      ];

      mockFs.readFile.mockResolvedValue(JSON.stringify(mockLogs));

      const report = await BackupErrorHandler.generateErrorReport(7);

      expect(report).toContain('RELATÓRIO DE ERROS DE BACKUP');
      expect(report).toContain('Total de erros: 1');
      expect(report).toContain('Erros resolvidos: 1');
      expect(report).toContain('DATABASE_CONNECTION: 1');
      expect(report).toContain('HIGH: 1');
      expect(report).toContain('Erro de conexão');
    });
  });
});