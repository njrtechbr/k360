import { BackupCLI } from '../../scripts/backup-cli';
import { BackupService } from '@/services/backupService';
import { BackupValidator } from '@/services/backupValidator';
import { BackupStorage } from '@/services/backupStorage';

// Mock dos serviços
jest.mock('@/services/backupService');
jest.mock('@/services/backupValidator');
jest.mock('@/services/backupStorage');

const mockBackupService = BackupService as jest.Mocked<typeof BackupService>;
const mockBackupValidator = BackupValidator as jest.Mocked<typeof BackupValidator>;
const mockBackupStorage = BackupStorage as jest.Mocked<typeof BackupStorage>;

describe('BackupCLI', () => {
  let cli: BackupCLI;
  let consoleSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    cli = new BackupCLI();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  describe('Validação de parâmetros', () => {
    it('deve validar opções de criação de backup', async () => {
      // Mock para simular sucesso
      mockBackupService.createBackup.mockResolvedValue({
        success: true,
        filename: 'test-backup.sql',
        filepath: '/path/to/test-backup.sql',
        size: 1024,
        checksum: 'abc123',
        duration: 1000,
        id: 'test-id'
      });

      // Simular argumentos de linha de comando
      process.argv = ['node', 'backup-cli.ts', 'create', '--verbose'];

      await cli.run();

      expect(mockBackupService.createBackup).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('deve rejeitar opções mutuamente exclusivas', async () => {
      // Simular argumentos inválidos
      process.argv = ['node', 'backup-cli.ts', 'create', '--schema-only', '--data-only'];

      await cli.run();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Comando list', () => {
    it('deve listar backups existentes', async () => {
      const mockBackups = [
        {
          id: 'backup-1',
          filename: 'backup_2025-01-09_14-30-00.sql',
          filepath: '/path/to/backup_2025-01-09_14-30-00.sql',
          size: 2048,
          status: 'success' as const,
          createdAt: new Date('2025-01-09T14:30:00Z'),
          duration: 1500,
          checksum: 'def456',
          databaseVersion: '15.0',
          schemaVersion: '1.0',
          createdBy: 'admin'
        }
      ];

      mockBackupService.listBackups.mockResolvedValue(mockBackups);

      process.argv = ['node', 'backup-cli.ts', 'list'];

      await cli.run();

      expect(mockBackupService.listBackups).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('deve listar backups em formato JSON', async () => {
      const mockBackups = [
        {
          id: 'backup-1',
          filename: 'backup.sql',
          filepath: '/path/to/backup.sql',
          size: 1024,
          status: 'success' as const,
          createdAt: new Date(),
          duration: 1000,
          checksum: 'abc123',
          databaseVersion: '15.0',
          schemaVersion: '1.0',
          createdBy: 'admin'
        }
      ];

      mockBackupService.listBackups.mockResolvedValue(mockBackups);

      process.argv = ['node', 'backup-cli.ts', 'list', '--format', 'json'];

      await cli.run();

      expect(mockBackupService.listBackups).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(mockBackups, null, 2));
    });
  });

  describe('Comando validate', () => {
    it('deve validar backup com sucesso', async () => {
      const mockValidationResult = {
        isValid: true,
        size: 1024,
        validationTime: 500,
        checksum: 'abc123',
        warnings: [],
        errors: []
      };

      mockBackupValidator.validateBackup.mockResolvedValue(mockValidationResult);

      // Mock fs.existsSync
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      process.argv = ['node', 'backup-cli.ts', 'validate', '/path/to/backup.sql'];

      await cli.run();

      expect(mockBackupValidator.validateBackup).toHaveBeenCalledWith('/path/to/backup.sql');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('deve falhar para arquivo inexistente', async () => {
      // Mock fs.existsSync para retornar false
      const fs = require('fs');
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      process.argv = ['node', 'backup-cli.ts', 'validate', '/path/to/nonexistent.sql'];

      await cli.run();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Comando cleanup', () => {
    it('deve executar limpeza em modo dry-run', async () => {
      const mockSimulation = {
        wouldRemove: 2,
        backupsToRemove: [
          {
            id: 'old-backup-1',
            filename: 'old-backup-1.sql',
            filepath: '/path/to/old-backup-1.sql',
            size: 1024,
            status: 'success' as const,
            createdAt: new Date('2025-01-01T10:00:00Z'),
            duration: 1000,
            checksum: 'old123',
            databaseVersion: '15.0',
            schemaVersion: '1.0',
            createdBy: 'admin'
          },
          {
            id: 'old-backup-2',
            filename: 'old-backup-2.sql',
            filepath: '/path/to/old-backup-2.sql',
            size: 2048,
            status: 'success' as const,
            createdAt: new Date('2025-01-02T10:00:00Z'),
            duration: 1500,
            checksum: 'old456',
            databaseVersion: '15.0',
            schemaVersion: '1.0',
            createdBy: 'admin'
          }
        ],
        wouldFreeSpace: 3072
      };

      mockBackupStorage.simulateCleanupOldBackups.mockResolvedValue(mockSimulation);

      process.argv = ['node', 'backup-cli.ts', 'cleanup', '--dry-run'];

      await cli.run();

      expect(mockBackupStorage.simulateCleanupOldBackups).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('deve executar limpeza real', async () => {
      const mockResult = {
        removed: 2,
        freedSpace: 3072,
        errors: []
      };

      mockBackupStorage.cleanupOldBackups.mockResolvedValue(mockResult);

      process.argv = ['node', 'backup-cli.ts', 'cleanup'];

      await cli.run();

      expect(mockBackupStorage.cleanupOldBackups).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });

  describe('Comando info', () => {
    it('deve mostrar informações do backup', async () => {
      const mockBackup = {
        id: 'backup-123',
        filename: 'backup.sql',
        filepath: '/path/to/backup.sql',
        size: 1024,
        status: 'success' as const,
        createdAt: new Date('2025-01-09T14:30:00Z'),
        duration: 1000,
        checksum: 'abc123',
        databaseVersion: '15.0',
        schemaVersion: '1.0',
        createdBy: 'admin'
      };

      mockBackupService.getBackupInfo.mockResolvedValue(mockBackup);

      process.argv = ['node', 'backup-cli.ts', 'info', 'backup-123'];

      await cli.run();

      expect(mockBackupService.getBackupInfo).toHaveBeenCalledWith('backup-123');
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('deve falhar para backup inexistente', async () => {
      mockBackupService.getBackupInfo.mockResolvedValue(null);

      process.argv = ['node', 'backup-cli.ts', 'info', 'nonexistent-backup'];

      await cli.run();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('Tratamento de erros', () => {
    it('deve tratar erros durante criação de backup', async () => {
      mockBackupService.createBackup.mockResolvedValue({
        success: false,
        filename: '',
        filepath: '',
        size: 0,
        checksum: '',
        duration: 0,
        error: 'Falha na conexão com o banco'
      });

      process.argv = ['node', 'backup-cli.ts', 'create'];

      await cli.run();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });

    it('deve tratar exceções não capturadas', async () => {
      mockBackupService.createBackup.mockRejectedValue(new Error('Erro inesperado'));

      process.argv = ['node', 'backup-cli.ts', 'create'];

      await cli.run();

      expect(processExitSpy).toHaveBeenCalledWith(1);
    });
  });
});