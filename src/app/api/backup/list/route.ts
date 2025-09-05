import { NextRequest } from 'next/server';
import { BackupService } from '@/services/backupService';
import { withBackupSecurity } from '@/lib/middleware/backupSecurityMiddleware';

interface ListBackupsQuery {
  page?: string;
  limit?: string;
  status?: 'success' | 'failed' | 'in_progress';
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'size' | 'filename';
  sortOrder?: 'asc' | 'desc';
}

export async function GET(request: NextRequest) {
  return withBackupSecurity(request, 'canList', async (context) => {
    try {

      // Parse dos parâmetros de query
      const { searchParams } = new URL(request.url);
      const query: ListBackupsQuery = {
        page: searchParams.get('page') || '1',
        limit: searchParams.get('limit') || '10',
        status: searchParams.get('status') as any,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        sortBy: (searchParams.get('sortBy') as any) || 'createdAt',
        sortOrder: (searchParams.get('sortOrder') as any) || 'desc'
      };

      // Validar parâmetros
      const page = parseInt(query.page);
      const limit = parseInt(query.limit);

      if (isNaN(page) || page < 1) {
        throw new Error('Página deve ser um número maior que 0');
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new Error('Limite deve ser um número entre 1 e 100');
      }

      // Validar datas se fornecidas
      let startDate: Date | undefined;
      let endDate: Date | undefined;

      if (query.startDate) {
        startDate = new Date(query.startDate);
        if (isNaN(startDate.getTime())) {
          throw new Error('Data de início inválida');
        }
      }

      if (query.endDate) {
        endDate = new Date(query.endDate);
        if (isNaN(endDate.getTime())) {
          throw new Error('Data de fim inválida');
        }
      }

      // Validar campos de ordenação
      const validSortFields = ['createdAt', 'size', 'filename'];
      if (!validSortFields.includes(query.sortBy!)) {
        throw new Error('Campo de ordenação inválido');
      }

      // Buscar backups usando o serviço
      const backups = await BackupService.listBackups();

      // Aplicar filtros
      let filteredBackups = backups;

      // Filtro por status
      if (query.status) {
        filteredBackups = filteredBackups.filter(backup => backup.status === query.status);
      }

      // Filtro por data
      if (startDate) {
        filteredBackups = filteredBackups.filter(backup => 
          new Date(backup.createdAt) >= startDate!
        );
      }

      if (endDate) {
        filteredBackups = filteredBackups.filter(backup => 
          new Date(backup.createdAt) <= endDate!
        );
      }

      // Aplicar ordenação
      filteredBackups.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (query.sortBy) {
          case 'createdAt':
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
            break;
          case 'size':
            aValue = a.size;
            bValue = b.size;
            break;
          case 'filename':
            aValue = a.filename.toLowerCase();
            bValue = b.filename.toLowerCase();
            break;
          default:
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
        }

        if (query.sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      // Aplicar paginação
      const totalItems = filteredBackups.length;
      const totalPages = Math.ceil(totalItems / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedBackups = filteredBackups.slice(startIndex, endIndex);

      // Filtrar dados sensíveis baseado no role
      const sanitizedBackups = paginatedBackups.map(backup => {
        const sanitized = { ...backup };
        
        // SUPERVISOR não pode ver informações de criação
        if (context.user.role === 'SUPERVISOR') {
          delete sanitized.createdBy;
        }

        return sanitized;
      });

      return {
        success: true,
        data: {
          backups: sanitizedBackups,
          pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            itemsPerPage: limit,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1
          },
          filters: {
            status: query.status,
            startDate: query.startDate,
            endDate: query.endDate,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder
          }
        }
      };

    } catch (error) {
      console.error('[BACKUP_LIST_ERROR]', error);
      throw error;
    }
  });
}