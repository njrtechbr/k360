import { NextRequest } from 'next/server';
import { BackupAuditLogger, BackupAuditFilter } from '@/services/backupAuditLog';
import { withBackupSecurity } from '@/lib/middleware/backupSecurityMiddleware';

interface AuditQuery {
  userId?: string;
  operation?: string;
  success?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  page?: string;
}

export async function GET(request: NextRequest) {
  return withBackupSecurity(request, 'canList', async (context) => {
    try {
      // Apenas ADMIN e SUPERADMIN podem ver audit logs
      if (!['ADMIN', 'SUPERADMIN'].includes(context.user.role)) {
        throw new Error('Permissões insuficientes para visualizar audit logs');
      }

      // Parse dos parâmetros de query
      const { searchParams } = new URL(request.url);
      const query: AuditQuery = {
        userId: searchParams.get('userId') || undefined,
        operation: searchParams.get('operation') || undefined,
        success: searchParams.get('success') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        limit: searchParams.get('limit') || '50',
        page: searchParams.get('page') || '1',
      };

      // Validar parâmetros
      const page = parseInt(query.page);
      const limit = parseInt(query.limit);

      if (isNaN(page) || page < 1) {
        throw new Error('Página deve ser um número maior que 0');
      }

      if (isNaN(limit) || limit < 1 || limit > 1000) {
        throw new Error('Limite deve ser um número entre 1 e 1000');
      }

      // Construir filtros
      const filter: BackupAuditFilter = {
        limit: limit * page, // Buscar mais entradas para paginação
      };

      if (query.userId) {
        filter.userId = query.userId;
      }

      if (query.operation) {
        filter.operation = query.operation as any;
      }

      if (query.success !== undefined) {
        filter.success = query.success === 'true';
      }

      if (query.startDate) {
        filter.startDate = new Date(query.startDate);
        if (isNaN(filter.startDate.getTime())) {
          throw new Error('Data de início inválida');
        }
      }

      if (query.endDate) {
        filter.endDate = new Date(query.endDate);
        if (isNaN(filter.endDate.getTime())) {
          throw new Error('Data de fim inválida');
        }
      }

      // Buscar entradas do audit log
      const allEntries = await BackupAuditLogger.getAuditEntries(filter);

      // Aplicar paginação
      const totalItems = allEntries.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedEntries = allEntries.slice(startIndex, endIndex);

      // Obter estatísticas
      const stats = await BackupAuditLogger.getAuditStats();

      return {
        success: true,
        data: {
          entries: paginatedEntries,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
          stats,
          filters: {
            userId: query.userId,
            operation: query.operation,
            success: query.success,
            startDate: query.startDate,
            endDate: query.endDate,
          },
        },
      };

    } catch (error) {
      console.error('[BACKUP_AUDIT_ERROR]', error);
      throw error;
    }
  });
}

/**
 * Endpoint para obter estatísticas do audit log
 */
export async function POST(request: NextRequest) {
  return withBackupSecurity(request, 'canList', async (context) => {
    try {
      // Apenas ADMIN e SUPERADMIN podem executar operações de manutenção
      if (!['ADMIN', 'SUPERLADMIN'].includes(context.user.role)) {
        throw new Error('Permissões insuficientes para operações de manutenção');
      }

      const body = await request.json().catch(() => ({}));
      const action = body.action;

      switch (action) {
        case 'cleanup':
          const daysToKeep = body.daysToKeep || 90;
          if (typeof daysToKeep !== 'number' || daysToKeep < 1 || daysToKeep > 365) {
            throw new Error('daysToKeep deve ser um número entre 1 e 365');
          }

          const removedCount = await BackupAuditLogger.cleanupOldEntries(daysToKeep);
          
          return {
            success: true,
            message: `${removedCount} entradas antigas removidas`,
            removedCount,
          };

        case 'stats':
          const stats = await BackupAuditLogger.getAuditStats();
          return {
            success: true,
            stats,
          };

        default:
          throw new Error('Ação não reconhecida');
      }

    } catch (error) {
      console.error('[BACKUP_AUDIT_MAINTENANCE_ERROR]', error);
      throw error;
    }
  });
}