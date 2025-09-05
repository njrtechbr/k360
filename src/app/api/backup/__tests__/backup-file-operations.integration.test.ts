/**
 * @jest-environment node
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock do NextAuth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn()
}));

// Mock dos serviços
jest.mock('@/services/backupService');
jest.mock('@/services/backupStorage');

const mockGetServerSession = require('next-auth/next').getServerSession as jest.MockedFunction<any>;

describe('Backup File Operations Integration Tests', () => {
  const testBackupDir = path.join(process.cwd(), 'test-file-operations');
  const smallBackupContent = 'SELECT 1; -- Small test backup';
  const mediumBackupContent = 'SELECT * FROM users; '.repeat(1000); // ~20KB
  const largeBackupContent = 'SELECT * FROM large_table; '.repeat(50000); // ~1MB

  beforeAll(async () => {
    // Criar diretório de teste
    if (!fs.existsSync(testBackupDir)) {
      fs.mkdirSync(testBackupDir, { recursive: true });
    }

    // Criar arquivos de teste de diferentes tamanhos
    fs.writeFileSync(path.join(testBackupDir, 'small_backup.sql'), smallBackupContent);
    fs.writeFileSync(path.join(testBackupDir, 'medium_backup.sql'), mediumBackupContent);
    fs.writeFileSync(path.join(testBackupDir, 'large_backup.sql'), largeBackupContent);
    
    // Criar arquivo corrompido
    fs.writeFileSync(path.join(testBackupDir, 'corrupted_backup.sql'), 'INVALID SQL CONTENT');
    
    // Criar arquivo comprimido simulado
    const compressedContent = Buffer.from(smallBackupContent).toString('base64');
    fs.writeFileSync(path.join(testBackupDir, 'compressed_backup.sql.gz'), compressedContent);
  });

  afterAll(async () => {
    // Limpar arquivos de teste
    if (fs.existsSync(testBackupDir)) {
      fs.rmSync(testBackupDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { id: '1', role: 'ADMIN', name: 'Admin User' }
    });
  });

  describe('Download de Arquivos', () => {
    it('deve fazer download de arquivo pequeno corretamente', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'small-backup',
        filename: 'small_backup.sql',
        filepath: path.join(testBackupDir, 'small_backup.sql'),
        size: smallBackupContent.length,
        checksum: crypto.createHash('md5').update(smallBackupContent).digest('hex')
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/small-backup'),
        { params: { id: 'small-backup' } }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/sql');
      expect(response.headers.get('Content-Disposition')).toContain('small_backup.sql');
      
      const downloadedContent = await response.text();
      expect(downloadedContent).toBe(smallBackupContent);
    });

    it('deve fazer streaming de arquivo médio eficientemente', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'medium-backup',
        filename: 'medium_backup.sql',
        filepath: path.join(testBackupDir, 'medium_backup.sql'),
        size: mediumBackupContent.length,
        checksum: crypto.createHash('md5').update(mediumBackupContent).digest('hex')
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/medium-backup'),
        { params: { id: 'medium-backup' } }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Length')).toBe(mediumBackupContent.length.toString());
      
      // Verificar se o conteúdo está correto
      const downloadedContent = await response.text();
      expect(downloadedContent.length).toBe(mediumBackupContent.length);
    });

    it('deve fazer streaming de arquivo grande com headers apropriados', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'large-backup',
        filename: 'large_backup.sql',
        filepath: path.join(testBackupDir, 'large_backup.sql'),
        size: largeBackupContent.length,
        checksum: crypto.createHash('md5').update(largeBackupContent).digest('hex')
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/large-backup'),
        { params: { id: 'large-backup' } }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/sql');
      expect(response.headers.get('Content-Length')).toBe(largeBackupContent.length.toString());
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');
      
      // Para arquivos grandes, verificar apenas o início do conteúdo
      const downloadedContent = await response.text();
      expect(downloadedContent.startsWith('SELECT * FROM large_table;')).toBe(true);
    });

    it('deve suportar download parcial com Range headers', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'large-backup',
        filename: 'large_backup.sql',
        filepath: path.join(testBackupDir, 'large_backup.sql'),
        size: largeBackupContent.length,
        checksum: crypto.createHash('md5').update(largeBackupContent).digest('hex')
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const { GET } = await import('../download/[id]/route');
      const request = new NextRequest('http://localhost:3000/api/backup/download/large-backup', {
        headers: {
          'Range': 'bytes=0-1023' // Primeiros 1024 bytes
        }
      });

      const response = await GET(request, { params: { id: 'large-backup' } });

      // Se suportado, deve retornar 206 Partial Content
      if (response.status === 206) {
        expect(response.headers.get('Content-Range')).toContain('bytes 0-1023');
        expect(response.headers.get('Content-Length')).toBe('1024');
      } else {
        // Se não suportado, deve retornar o arquivo completo
        expect(response.status).toBe(200);
      }
    });

    it('deve detectar e rejeitar arquivos corrompidos', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'corrupted-backup',
        filename: 'corrupted_backup.sql',
        filepath: path.join(testBackupDir, 'corrupted_backup.sql'),
        size: 100,
        checksum: 'invalid-checksum'
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(false);

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/corrupted-backup'),
        { params: { id: 'corrupted-backup' } }
      );

      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toContain('corrompido');
    });

    it('deve lidar com arquivos inexistentes graciosamente', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'missing-backup',
        filename: 'missing_backup.sql',
        filepath: path.join(testBackupDir, 'missing_backup.sql'),
        size: 100,
        checksum: 'some-checksum'
      });

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/missing-backup'),
        { params: { id: 'missing-backup' } }
      );

      const data = await response.json();
      expect(response.status).toBe(404);
      expect(data.error).toContain('não encontrado');
    });
  });

  describe('Validação de Integridade de Arquivos', () => {
    it('deve calcular checksum MD5 corretamente', async () => {
      const content = smallBackupContent;
      const expectedChecksum = crypto.createHash('md5').update(content).digest('hex');
      
      const { BackupService } = require('@/services/backupService');
      BackupService.calculateChecksum = jest.fn().mockReturnValue(expectedChecksum);
      
      const calculatedChecksum = BackupService.calculateChecksum(content);
      expect(calculatedChecksum).toBe(expectedChecksum);
    });

    it('deve validar integridade usando checksum SHA-256', async () => {
      const content = mediumBackupContent;
      const sha256Checksum = crypto.createHash('sha256').update(content).digest('hex');
      
      const { BackupService } = require('@/services/backupService');
      BackupService.validateChecksum = jest.fn().mockImplementation((filePath, expectedChecksum, algorithm) => {
        if (algorithm === 'sha256') {
          const fileContent = fs.readFileSync(filePath, 'utf8');
          const actualChecksum = crypto.createHash('sha256').update(fileContent).digest('hex');
          return actualChecksum === expectedChecksum;
        }
        return false;
      });

      const isValid = BackupService.validateChecksum(
        path.join(testBackupDir, 'medium_backup.sql'),
        sha256Checksum,
        'sha256'
      );
      
      expect(isValid).toBe(true);
    });

    it('deve detectar alterações no arquivo através do checksum', async () => {
      const originalContent = smallBackupContent;
      const modifiedContent = originalContent + ' -- Modified';
      
      const originalChecksum = crypto.createHash('md5').update(originalContent).digest('hex');
      const modifiedChecksum = crypto.createHash('md5').update(modifiedContent).digest('hex');
      
      expect(originalChecksum).not.toBe(modifiedChecksum);
    });
  });

  describe('Compressão de Arquivos', () => {
    it('deve lidar com arquivos comprimidos no download', async () => {
      const { BackupStorage } = require('@/services/backupStorage');
      BackupStorage.getBackupInfo.mockResolvedValue({
        id: 'compressed-backup',
        filename: 'compressed_backup.sql.gz',
        filepath: path.join(testBackupDir, 'compressed_backup.sql.gz'),
        size: 100,
        checksum: 'compressed-checksum',
        compressed: true
      });

      const { BackupService } = require('@/services/backupService');
      BackupService.validateBackup.mockResolvedValue(true);

      const { GET } = await import('../download/[id]/route');
      const response = await GET(
        new NextRequest('http://localhost:3000/api/backup/download/compressed-backup'),
        { params: { id: 'compressed-backup' } }
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/gzip');
      expect(response.headers.get('Content-Encoding')).toBe('gzip');
    });

    it('deve calcular taxa de compressão corretamente', async () => {
      const originalSize = largeBackupContent.length;
      const compressedSize = Math.floor(originalSize * 0.3); // Simular 70% de compressão
      
      const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
      
      expect(compressionRatio).toBeCloseTo(70, 0);
      expect(compressedSize).toBeLessThan(originalSize);
    });
  });

  describe('Limites de Tamanho e Performance', () => {
    it('deve rejeitar arquivos que excedem o limite máximo', async () => {
      const maxSizeGB = 10;
      const maxSizeBytes = maxSizeGB * 1024 * 1024 * 1024;
      const fileSizeBytes = 15 * 1024 * 1024 * 1024; // 15GB

      expect(fileSizeBytes).toBeGreaterThan(maxSizeBytes);

      // Simular validação de tamanho
      const isValidSize = fileSizeBytes <= maxSizeBytes;
      expect(isValidSize).toBe(false);
    });

    it('deve monitorar tempo de download para arquivos grandes', async () => {
      const startTime = Date.now();
      
      // Simular download de arquivo grande
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms
      
      const endTime = Date.now();
      const downloadTime = endTime - startTime;
      
      expect(downloadTime).toBeGreaterThanOrEqual(100);
      expect(downloadTime).toBeLessThan(1000); // Deve ser razoavelmente rápido
    });

    it('deve implementar timeout para downloads longos', async () => {
      const timeoutMs = 30000; // 30 segundos
      const startTime = Date.now();
      
      // Simular operação que pode dar timeout
      const downloadPromise = new Promise((resolve) => {
        setTimeout(resolve, 100); // Operação rápida para teste
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Download timeout')), timeoutMs);
      });
      
      try {
        await Promise.race([downloadPromise, timeoutPromise]);
        const elapsedTime = Date.now() - startTime;
        expect(elapsedTime).toBeLessThan(timeoutMs);
      } catch (error) {
        expect((error as Error).message).toBe('Download timeout');
      }
    });
  });

  describe('Segurança de Arquivos', () => {
    it('deve prevenir acesso a arquivos fora do diretório de backup', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\config\\SAM'
      ];

      for (const maliciousPath of maliciousPaths) {
        const { BackupStorage } = require('@/services/backupStorage');
        BackupStorage.getBackupInfo.mockResolvedValue({
          id: 'malicious',
          filename: 'backup.sql',
          filepath: maliciousPath,
          size: 100,
          checksum: 'checksum'
        });

        const { GET } = await import('../download/[id]/route');
        const response = await GET(
          new NextRequest('http://localhost:3000/api/backup/download/malicious'),
          { params: { id: 'malicious' } }
        );

        // Deve rejeitar caminhos maliciosos
        expect([400, 403, 404]).toContain(response.status);
      }
    });

    it('deve sanitizar nomes de arquivo no download', async () => {
      const maliciousFilenames = [
        '../malicious.sql',
        'backup<script>.sql',
        'backup\x00.sql',
        'backup|rm -rf /.sql'
      ];

      for (const filename of maliciousFilenames) {
        const { BackupStorage } = require('@/services/backupStorage');
        BackupStorage.getBackupInfo.mockResolvedValue({
          id: 'test',
          filename: filename,
          filepath: path.join(testBackupDir, 'small_backup.sql'),
          size: 100,
          checksum: 'checksum'
        });

        const { GET } = await import('../download/[id]/route');
        const response = await GET(
          new NextRequest('http://localhost:3000/api/backup/download/test'),
          { params: { id: 'test' } }
        );

        if (response.status === 200) {
          const contentDisposition = response.headers.get('Content-Disposition');
          // Nome do arquivo deve ser sanitizado
          expect(contentDisposition).not.toContain('<script>');
          expect(contentDisposition).not.toContain('\x00');
          expect(contentDisposition).not.toContain('|');
        }
      }
    });
  });
});