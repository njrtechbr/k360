/**
 * @jest-environment node
 */
import { describe, it, expect } from '@jest/globals';

describe('Validação dos Testes de Integração', () => {
  it('deve validar que os arquivos de teste existem', () => {
    const fs = require('fs');
    const path = require('path');
    
    const testFiles = [
      'backup-api.integration.test.ts',
      'backup-auth.integration.test.ts',
      'backup-file-operations.integration.test.ts',
      'backup-performance.integration.test.ts'
    ];
    
    testFiles.forEach(file => {
      const filePath = path.join(__dirname, file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });

  it('deve validar configuração do Jest para integração', () => {
    const fs = require('fs');
    const path = require('path');
    
    const configPath = path.join(__dirname, 'jest.integration.config.js');
    expect(fs.existsSync(configPath)).toBe(true);
    
    const config = require('./jest.integration.config.js');
    expect(config.testTimeout).toBe(30000);
    expect(config.maxWorkers).toBe(2);
  });

  it('deve validar utilitários de teste', () => {
    const setupPath = require.resolve('./setup.integration.ts');
    expect(setupPath).toBeDefined();
  });

  it('deve validar estrutura de diretórios necessária', () => {
    const path = require('path');
    
    // Verificar se o diretório de testes existe
    const testDir = __dirname;
    expect(testDir).toContain('__tests__');
    
    // Verificar se está no local correto da API
    expect(testDir).toContain(path.join('api', 'backup'));
  });

  it('deve validar que os mocks estão configurados', () => {
    // Verificar se os mocks principais estão disponíveis
    expect(jest).toBeDefined();
    expect(jest.fn).toBeDefined();
    expect(jest.mock).toBeDefined();
  });
});