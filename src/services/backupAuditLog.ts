import { promises as fs } from 'fs';
import path from 'path';
import { Role } from '@prisma/client';

export interface BackupAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userEmail: string;
  userRole: Role;
  operation: 'create' | 'list' | 'download' | 'delete' | 'validate';
  resource?: string; // ID do backup ou nome do arquivo
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface BackupAuditFilter {
  userId?: string;
  operation?: BackupAuditEntry['operation'];
  success?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export class BackupAuditLogger {
  private static auditFilePath = path.join(process.cwd(), 'backups', 'audit.log');
  private static maxLogSize = 10 * 1024 * 1024; // 10MB
  private static maxLogFiles = 5;

  /**
   * Registra uma operação de backup no audit log
   */
  static async logOperation(entry: Omit<BackupAuditEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: BackupAuditEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        ...entry,
      };

      const logLine = JSON.stringify(auditEntry) + '\n';
      
      // Garante que o diretório existe
      await this.ensureAuditDirectory();
      
      // Verifica se precisa rotacionar o log
      await this.rotateLogIfNeeded();
      
      // Escreve a entrada no log
      await fs.appendFile(this.auditFilePath, logLine, 'utf8');
      
      console.log(`[BACKUP AUDIT] ${entry.operation} by ${entry.userEmail} - ${entry.success ? 'SUCCESS' : 'FAILED'}`);
    } catch (error) {
      console.error('Erro ao registrar audit log de backup:', error);
      // Não falha a operação principal se o log falhar
    }
  }

  /**
   * Busca entradas do audit log com filtros
   */
  static async getAuditEntries(filter: BackupAuditFilter = {}): Promise<BackupAuditEntry[]> {
    try {
      const exists = await fs.access(this.auditFilePath).then(() => true).catch(() => false);
      if (!exists) {
        return [];
      }

      const content = await fs.readFile(this.auditFilePath, 'utf8');
      const lines = content.trim().split('\n').filter(line => line.length > 0);
      
      let entries: BackupAuditEntry[] = [];
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line) as BackupAuditEntry;
          entry.timestamp = new Date(entry.timestamp);
          entries.push(entry);
        } catch (parseError) {
          console.warn('Linha inválida no audit log:', line);
        }
      }

      // Aplica filtros
      entries = this.applyFilters(entries, filter);
      
      // Ordena por timestamp (mais recente primeiro)
      entries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      // Aplica limite
      if (filter.limit && filter.limit > 0) {
        entries = entries.slice(0, filter.limit);
      }

      return entries;
    } catch (error) {
      console.error('Erro ao ler audit log:', error);
      return [];
    }
  }

  /**
   * Obtém estatísticas do audit log
   */
  static async getAuditStats(): Promise<{
    totalOperations: number;
    successfulOperations: number;
    failedOperations: number;
    operationsByType: Record<string, number>;
    recentActivity: BackupAuditEntry[];
  }> {
    const entries = await this.getAuditEntries();
    
    const stats = {
      totalOperations: entries.length,
      successfulOperations: entries.filter(e => e.success).length,
      failedOperations: entries.filter(e => !e.success).length,
      operationsByType: {} as Record<string, number>,
      recentActivity: entries.slice(0, 10),
    };

    // Conta operações por tipo
    for (const entry of entries) {
      stats.operationsByType[entry.operation] = (stats.operationsByType[entry.operation] || 0) + 1;
    }

    return stats;
  }

  /**
   * Limpa entradas antigas do audit log
   */
  static async cleanupOldEntries(daysToKeep: number = 90): Promise<number> {
    try {
      const entries = await this.getAuditEntries();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const entriesToKeep = entries.filter(entry => entry.timestamp > cutoffDate);
      const removedCount = entries.length - entriesToKeep.length;

      if (removedCount > 0) {
        // Reescreve o arquivo apenas com as entradas válidas
        const newContent = entriesToKeep
          .map(entry => JSON.stringify(entry))
          .join('\n') + '\n';

        await fs.writeFile(this.auditFilePath, newContent, 'utf8');
        
        console.log(`Limpeza do audit log: ${removedCount} entradas antigas removidas`);
      }

      return removedCount;
    } catch (error) {
      console.error('Erro na limpeza do audit log:', error);
      return 0;
    }
  }

  private static generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static async ensureAuditDirectory(): Promise<void> {
    const auditDir = path.dirname(this.auditFilePath);
    try {
      await fs.access(auditDir);
    } catch {
      await fs.mkdir(auditDir, { recursive: true });
    }
  }

  private static async rotateLogIfNeeded(): Promise<void> {
    try {
      const stats = await fs.stat(this.auditFilePath);
      
      if (stats.size > this.maxLogSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedPath = `${this.auditFilePath}.${timestamp}`;
        
        await fs.rename(this.auditFilePath, rotatedPath);
        
        // Remove arquivos antigos se exceder o limite
        await this.cleanupOldLogFiles();
      }
    } catch (error) {
      // Arquivo não existe ainda, não há problema
      if ((error as any).code !== 'ENOENT') {
        console.warn('Erro na rotação do audit log:', error);
      }
    }
  }

  private static async cleanupOldLogFiles(): Promise<void> {
    try {
      const auditDir = path.dirname(this.auditFilePath);
      const files = await fs.readdir(auditDir);
      
      const logFiles = files
        .filter(file => file.startsWith('audit.log.'))
        .map(file => ({
          name: file,
          path: path.join(auditDir, file),
        }))
        .sort((a, b) => b.name.localeCompare(a.name)); // Mais recente primeiro

      // Remove arquivos excedentes
      if (logFiles.length > this.maxLogFiles) {
        const filesToRemove = logFiles.slice(this.maxLogFiles);
        
        for (const file of filesToRemove) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      console.warn('Erro na limpeza de arquivos de log antigos:', error);
    }
  }

  private static applyFilters(entries: BackupAuditEntry[], filter: BackupAuditFilter): BackupAuditEntry[] {
    return entries.filter(entry => {
      if (filter.userId && entry.userId !== filter.userId) return false;
      if (filter.operation && entry.operation !== filter.operation) return false;
      if (filter.success !== undefined && entry.success !== filter.success) return false;
      if (filter.startDate && entry.timestamp < filter.startDate) return false;
      if (filter.endDate && entry.timestamp > filter.endDate) return false;
      return true;
    });
  }
}

/**
 * Helper para criar entrada de audit log
 */
export function createAuditEntry(
  operation: BackupAuditEntry['operation'],
  user: { id: string; email: string; role: Role },
  success: boolean,
  options: {
    resource?: string;
    error?: string;
    metadata?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
  } = {}
): Omit<BackupAuditEntry, 'id' | 'timestamp'> {
  return {
    userId: user.id,
    userEmail: user.email,
    userRole: user.role,
    operation,
    success,
    ...options,
  };
}