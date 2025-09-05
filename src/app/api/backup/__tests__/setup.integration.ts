import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';

// Configuração global para testes de integração
beforeAll(() => {
  // Configurar variáveis de ambiente para testes
  process.env.NODE_ENV = 'test';
  process.env.BACKUP_DIRECTORY = path.join(process.cwd(), 'test-backups');
  process.env.BACKUP_MAX_SIZE_GB = '1'; // Limite menor para testes
  process.env.BACKUP_RETENTION_DAYS = '7';
  process.env.BACKUP_MAX_CONCURRENT = '2';
  
  // Criar diretório de backup de teste se não existir
  const testBackupDir = process.env.BACKUP_DIRECTORY;
  if (!fs.existsSync(testBackupDir)) {
    fs.mkdirSync(testBackupDir, { recursive: true });
  }
});

afterAll(() => {
  // Limpar diretório de teste após todos os testes
  const testBackupDir = process.env.BACKUP_DIRECTORY;
  if (testBackupDir && fs.existsSync(testBackupDir)) {
    fs.rmSync(testBackupDir, { recursive: true, force: true });
  }
});

// Mock global do console para reduzir ruído nos testes
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: originalConsole.error // Manter errors visíveis
};

// Configurar timeouts mais longos para testes de performance
jest.setTimeout(30000);

// Mock de fetch global se necessário
global.fetch = jest.fn();

// Utilitários de teste compartilhados
export const testUtils = {
  createTestBackupFile: (filename: string, content: string = 'SELECT 1;') => {
    const filepath = path.join(process.env.BACKUP_DIRECTORY!, filename);
    fs.writeFileSync(filepath, content);
    return filepath;
  },
  
  cleanupTestFiles: (filenames: string[]) => {
    filenames.forEach(filename => {
      const filepath = path.join(process.env.BACKUP_DIRECTORY!, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    });
  },
  
  generateLargeContent: (sizeInBytes: number) => {
    const baseContent = 'SELECT * FROM test_table WHERE id = 1;\n';
    const repetitions = Math.ceil(sizeInBytes / baseContent.length);
    return baseContent.repeat(repetitions).substring(0, sizeInBytes);
  },
  
  measureExecutionTime: async <T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    return { result, duration: end - start };
  }
};

// Declarar tipos globais para TypeScript
declare global {
  var testUtils: typeof testUtils;
}

global.testUtils = testUtils;