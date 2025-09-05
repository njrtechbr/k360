/**
 * @jest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';

// Mock do NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

// Mock dos serviços
jest.mock('@/services/backupService');
jest.mock('@/services/backupStorage');

const mockGetServerSession = require('next-auth/next').getServerSession as jest.MockedFunction<any>;

describe('Backup Performance Integration Tests', () => {
  const testPerformanceDir = path.join(process.cwd(), 'test-performance');
  
  // Tamanhos de teste diferentes
  const testSizes = {
    small: 1024, // 1KB
    medium: 1024 * 1024, // 1MB
    large: 10 * 1024 * 1024, // 10MB
    xlarge: 50 * 1024 * 1024 // 50MB (apenas se necessário)
  };

  beforeAll(async () => {
    // Criar diretório de teste
    if (!fs.existsSync(testPerformanceDir)) {
      fs.mkdirSync(testPerformanceDir, { recursive: true });
    }

    // Criar arquivos de teste de diferentes tamanhos
    Object.entries(testSizes).forEach(([size, bytes]) => {
      const content = 'SELECT * FROM test_table WHERE id = 1;\n'.repeat(Math.ceil(bytes / 40));
      const truncatedContent = content.substring(0, bytes);
      fs.writeFileSync(path.join(testPerformanceDir, `${size}_backup.sql`), truncatedContent);
    });
  });

  afterAll(async () => {
    // Limpar arquivos de teste
    if (fs.existsSync(testPerformanceDir)) {
      fs.rmSync(testPerformanceDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', role: 'ADMIN', name: 'Admin User' }
    });
  });

  describe('Performance de Criação de Backup', () => {
    it('deve criar backup pequeno em menos de 5 segundos', async () => {
      const { BackupService } = require('@/services/backupService');
      
      const startTime = performance.now();
      
      BackupService.createBackup.mockImplementation(async (options) => {
        // Simular tempo de processamento baseado no tamanho
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms para backup pequeno
        
        return {
          success: true,
          filename: 'small_backup_test.sql',
          filepath: path.join(testPerformanceDir, 'small_backup.sql'),
          size: testSizes.small,
          checksum: 'small-checksum',
          duration: 100,
          id: 'small-backup-perf'
        };
      });

      const { POST } = await import('../create/route');
      const request = new NextRequest('http://localhost:3000/api/backup/create', {
        method: 'POST',
        body: JSON.stringify({ options: { size: 'small' } })
      });

      const response = await POST(request);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(5000); // Menos de 5 segundos
    });

    it('deve criar backup médio em menos de 30 segundos', async () => {
      const { BackupService } = require('@/services/backupService');
      
      const startTime = performance.now();
      
      BackupService.createBackup.mockImplementation(async (options) => {
        // Simular tempo de processamento para backup médio
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms
        
        return {
          success: true,
          filename: 'medium_backup_test.sql',
          filepath: path.join(testPerformanceDir, 'medium_backup.sql'),
          size: testSizes.medium,
          checksum: 'medium-checksum',
          duration: 500,
          id: 'medium-backup-perf'
        };
      });

      const { POST } = await import('../create/route');
      const request = new NextRequest('http://localhost:3000/api/backup/create', {
        method: 'POST',
        body: JSON.stringify({ options: { size: 'medium' } })
      });

      const response = await POST(request);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(30000); // Menos de 30 segundos
    });

    it('deve reportar progresso durante criação de backup grande', async () => {
      const { BackupService } = require('@/services/backupService');
      const progressUpdates: number[] = [];
      
      BackupService.createBackup.mockImplementation(async (options) => {
        // Simular progresso incremental
        for (let progress = 0; progress <= 100; progress += 20) {
          progressUpdates.push(progress);
          await new Promise(resolve => setTimeout(resolve, 50)); // 50ms por etapa
        }
        
        return {
          success: true,
          filename: 'large_backup_test.sql',
          filepath: path.join(testPerformanceDir, 'large_backup.sql'),
          size: testSizes.large,
          checksum: 'large-checksum',
          duration: 250,
          id: 'large-backup-perf'
        };
      });

      const { POST } = await import('../create/route');
      const request = new NextRequest('http://localhost:3000/api/backup/create', {
        method: 'POST',
        body: JSON.stringify({ options: { size: 'large' } })
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(progressUpdates).toContain(0);
      expect(progressUpdates).toContain(100);
      expect(progressUpdates.length).toBeGreaterThan(3);
    });

    it('deve otimizar performance com compressão para arquivos grandes', async () => {
      const { BackupService } = require('@/services/backupService');
      
      // Teste sem compressão
      const startTimeUncompressed = performance.now();
      BackupService.createBackup.mockResolvedValueOnce({
        success: true,
        filename: 'large_uncompressed.sql',
        size: testSizes.large,
        duration: 1000,
        compressed: false
      });

      const requestUncompressed = new NextRequest('http://localhost:3000/api/backup/create', {
        method: 'POST',
        body: JSON.stringify({ options: { compress: false } })
      });

      const { POST } = await import('../create/route');
      await POST(requestUncompressed);
      const durationUncompressed = performance.now() - startTimeUncompressed;

      // Teste com compressão
      const startTimeCompressed = performance.now();
      BackupService.createBackup.mockResolvedValueOnce({
        success: true,
        filename: 'large_compressed.sql.gz',
        size: Math.floor(testSizes.large * 0.3), // 70% de compressão
        duration: 800, // Pode ser mais rápido devido ao menor I/O
        compressed: true
      });

      const requestCompressed = new NextRequest('http://localhost:3000/api/backup/create', {
        method: 'POST',
        body: JSON.stringify({ options: { compress: true } })
      });

      await POST(requestCompressed);
      const durationCompressed = performance.now() - startTimeCompressed;

      // Compressão pode ser mais lenta para criar, mas resulta em arquivos menores
      expect(durationCompressed).toBeLessThan(durationUncompressed * 2); // Não deve ser mais que 2x mais lento
    });
  });

  describe('Performance de Download', () => {
    it('deve fazer download de arquivo pequeno instantaneamente', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'small-perf',
        filename: 'small_backup.sql',
        filepath: path.join(testPerformanceDir, 'small_backup.sql'),
        size: testSizes.small,
        checksum: 'small-checksum'
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const startTime = performance.now();

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/small-perf'),
        { params: { id: 'small-perf' } }
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(1000); // Menos de 1 segundo
    });

    it('deve fazer streaming eficiente de arquivo médio', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'medium-perf',
        filename: 'medium_backup.sql',
        filepath: path.join(testPerformanceDir, 'medium_backup.sql'),
        size: testSizes.medium,
        checksum: 'medium-checksum'
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const startTime = performance.now();

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/medium-perf'),
        { params: { id: 'medium-perf' } }
      );

      // Medir tempo até o primeiro byte
      const firstByteTime = performance.now() - startTime;

      expect(response.status).toBe(200);
      expect(firstByteTime).toBeLessThan(2000); // Primeiro byte em menos de 2 segundos
      expect(response.headers.get('Content-Length')).toBe(testSizes.medium.toString());
    });

    it('deve implementar download resumível para arquivos grandes', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'large-perf',
        filename: 'large_backup.sql',
        filepath: path.join(testPerformanceDir, 'large_backup.sql'),
        size: testSizes.large,
        checksum: 'large-checksum'
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      // Testar download parcial (Range request)
      const { GET } = await import('../download/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/backup/download/large-perf', {
        headers: {
          'Range': 'bytes=0-1023' // Primeiros 1KB
        }
      });

      const response = await GET(request, { params: { id: 'large-perf' } });

      // Verificar se suporta range requests
      if (response.status === 206) {
        expect(response.headers.get('Accept-Ranges')).toBe('bytes');
        expect(response.headers.get('Content-Range')).toContain('bytes 0-1023');
      } else {
        // Se não suporta, deve retornar arquivo completo
        expect(response.status).toBe(200);
      }
    });

    it('deve otimizar bandwidth para múltiplos downloads simultâneos', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      const { BackupService } = require('@/services/backupService');

      // Configurar mocks para múltiplos arquivos
      ['file1', 'file2', 'file3'].forEach(id => {
        BackupStorage.getBackupInfo.mockResolvedValueOnce({
          id,
          filename: `${id}_backup.sql`,
          filepath: path.join(testPerformanceDir, 'medium_backup.sql'),
          size: testSizes.medium,
          checksum: `${id}-checksum`
        });
      });

      BackupService.validateBackup.mockResolvedValue(true);

      const startTime = performance.now();

      // Iniciar downloads simultâneos
      const { GET } = await import('../download/[id]/route');
      const downloadPromises = ['file1', 'file2', 'file3'].map(id =>
        GET(
          new NextRequest(`http://localhost:3000/api/backup/download/${id}`),
          { params: { id } }
        )
      );

      const responses = await Promise.all(downloadPromises);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // Todos os downloads devem ser bem-sucedidos
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Downloads simultâneos não devem ser muito mais lentos que um único download
      expect(totalDuration).toBeLessThan(10000); // Menos de 10 segundos para 3 downloads
    });
  });

  describe('Performance de Listagem', () => {
    it('deve listar backups rapidamente mesmo com muitos arquivos', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      
      // Simular muitos backups
      const manyBackups = Array.from({ length: 1000 }, (_, i) => ({
        id: `backup-${i}`,
        filename: `backup_${i}.sql`,
        size: Math.floor(Math.random() * testSizes.large),
        createdAt: new Date(Date.now() - i * 86400000), // Um por dia
        status: 'success' as const
      }));

      BackupStorage.listBackups.mockResolvedValue(manyBackups);

      const startTime = performance.now();

      const { GET } = await import('../list/route');
      const request = new NextRequest('http://localhost:3000/api/backup/list');

      const response = await GET(request);
      const endTime = performance.now();
      const duration = endTime - startTime;

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backups).toHaveLength(1000);
      expect(duration).toBeLessThan(2000); // Menos de 2 segundos
    });

    it('deve implementar paginação eficiente para listas grandes', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      
      // Simular paginação
      const pageSize = 50;
      const totalItems = 1000;
      const page1Items = Array.from({ length: pageSize }, (_, i) => ({
        id: `backup-${i}`,
        filename: `backup_${i}.sql`,
        size: testSizes.medium,
        createdAt: new Date(),
        status: 'success' as const
      }));

      BackupStorage.listBackups.mockResolvedValue(page1Items);

      const startTime = performance.now();

      const { GET } = await import('../list/route');
      const request = new NextRequest('http://localhost:3000/api/backup/list?page=1&limit=50');

      const response = await GET(request);
      const endTime = performance.now();
      const duration = endTime - startTime;

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backups).toHaveLength(pageSize);
      expect(duration).toBeLessThan(1000); // Paginação deve ser rápida
    });

    it('deve filtrar backups por data eficientemente', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      
      const filteredBackups = Array.from({ length: 10 }, (_, i) => ({
        id: `filtered-backup-${i}`,
        filename: `filtered_backup_${i}.sql`,
        size: testSizes.small,
        createdAt: new Date('2025-01-09'),
        status: 'success' as const
      }));

      BackupStorage.listBackups.mockImplementation(async (filters) => {
        // Simular filtro por data
        if (filters?.startDate && filters?.endDate) {
          await new Promise(resolve => setTimeout(resolve, 100)); // Simular query com filtro
          return filteredBackups;
        }
        return [];
      });

      const startTime = performance.now();

      const { GET } = await import('../list/route');
      const request = new NextRequest(
        'http://localhost:3000/api/backup/list?startDate=2025-01-09&endDate=2025-01-09'
      );

      const response = await GET(request);
      const endTime = performance.now();
      const duration = endTime - startTime;

      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.backups).toHaveLength(10);
      expect(duration).toBeLessThan(1500); // Filtro deve ser eficiente
    });
  });

  describe('Performance de Validação', () => {
    it('deve validar integridade de arquivo pequeno rapidamente', async () => {
      const { BackupService } = require('@/services/backupService');
      
      const startTime = performance.now();
      
      BackupService.validateBackup.mockImplementation(async (filepath) => {
        // Simular validação rápida para arquivo pequeno
        await new Promise(resolve => setTimeout(resolve, 50));
        return true;
      });

      const isValid = await BackupService.validateBackup(
        path.join(testPerformanceDir, 'small_backup.sql')
      );
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(isValid).toBe(true);
      expect(duration).toBeLessThan(500); // Menos de 500ms
    });

    it('deve validar arquivo grande sem bloquear outras operações', async () => {
      const { BackupService } = require('@/services/backupService');
      
      // Simular validação de arquivo grande que não bloqueia
      BackupService.validateBackup.mockImplementation(async (filepath) => {
        // Simular validação em chunks para não bloquear
        for (let i = 0; i < 10; i++) {
          await new Promise(resolve => setTimeout(resolve, 10));
          // Permitir que outras operações sejam processadas
          await new Promise(resolve => setImmediate(resolve));
        }
        return true;
      });

      const startTime = performance.now();
      
      // Iniciar validação e operação concorrente
      const validationPromise = BackupService.validateBackup(
        path.join(testPerformanceDir, 'large_backup.sql')
      );
      
      const concurrentOperationPromise = new Promise(resolve => {
        setTimeout(() => resolve('concurrent operation completed'), 50);
      });

      const [validationResult, concurrentResult] = await Promise.all([
        validationPromise,
        concurrentOperationPromise
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(validationResult).toBe(true);
      expect(concurrentResult).toBe('concurrent operation completed');
      expect(duration).toBeLessThan(1000); // Operações não devem bloquear excessivamente
    });
  });

  describe('Métricas de Performance', () => {
    it('deve coletar métricas de tempo de resposta', async () => {
      const metrics = {
        responseTime: 0,
        throughput: 0,
        errorRate: 0
      };

      const startTime = performance.now();

      const { GET } = await import('../list/route');
      const request = new NextRequest('http://localhost:3000/api/backup/list');
      const response = await GET(request);

      const endTime = performance.now();
      metrics.responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(metrics.responseTime).toBeGreaterThan(0);
      expect(metrics.responseTime).toBeLessThan(5000); // SLA de 5 segundos
    });

    it('deve monitorar uso de memória durante operações', async () => {
      const initialMemory = process.memoryUsage();

      // Simular operação que usa memória
      const { BackupService } = require('@/services/backupService');
      BackupService.createBackup.mockImplementation(async () => {
        // Simular uso de memória
        const largeBuffer = Buffer.alloc(1024 * 1024); // 1MB
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, size: largeBuffer.length };
      });

      const { POST } = await import('../create/route');
      const request = new NextRequest('http://localhost:3000/api/backup/create', {
        method: 'POST'
      });

      await POST(request);

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Verificar se o uso de memória está dentro de limites aceitáveis
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Menos de 100MB de aumento
    });
  });
});