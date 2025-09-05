import { NextRequest } from 'next/server';
import { BackupService, setProgressCallback } from '@/services/backupService';
import { withBackupSecurity } from '@/lib/middleware/backupSecurityMiddleware';

// Importar função de atualização de progresso
import { updateBackupProgress } from '../status/[id]/route';

interface CreateBackupRequest {
  options?: {
    filename?: string;
    directory?: string;
    includeData?: boolean;
    includeSchema?: boolean;
    compress?: boolean;
  };
}

export async function POST(request: NextRequest) {
  return withBackupSecurity(request, 'canCreate', async (context) => {
    let body: CreateBackupRequest = {};
    
    try {
      // Parse do body da requisição
      try {
        body = await request.json();
      } catch (error) {
        // Body vazio é válido, usar opções padrão
        body = {};
      }

      // Validar opções de entrada
      const options = body.options || {};
      
      // Validações básicas
      if (options.filename) {
        if (typeof options.filename !== 'string' || options.filename.length === 0) {
          throw new Error('Nome do arquivo deve ser uma string não vazia');
        }
        
        if (!/^[a-zA-Z0-9_-]+(\.(sql|gz))?$/.test(options.filename)) {
          throw new Error('Nome do arquivo contém caracteres inválidos. Use apenas letras, números, _ e -');
        }
        
        if (options.filename.length > 100) {
          throw new Error('Nome do arquivo muito longo (máximo 100 caracteres)');
        }
      }

      if (options.directory) {
        if (typeof options.directory !== 'string' || options.directory.length === 0) {
          throw new Error('Diretório deve ser uma string não vazia');
        }
        
        if (!/^[a-zA-Z0-9_.\/-]+$/.test(options.directory)) {
          throw new Error('Diretório contém caracteres inválidos');
        }
        
        if (options.directory.includes('..')) {
          throw new Error('Diretório não pode conter navegação de diretório (..)');
        }
      }

      // Validar tipos booleanos
      if (options.includeData !== undefined && typeof options.includeData !== 'boolean') {
        throw new Error('includeData deve ser um valor booleano');
      }

      if (options.includeSchema !== undefined && typeof options.includeSchema !== 'boolean') {
        throw new Error('includeSchema deve ser um valor booleano');
      }

      if (options.compress !== undefined && typeof options.compress !== 'boolean') {
        throw new Error('compress deve ser um valor booleano');
      }

      // Validar que pelo menos um tipo de conteúdo seja incluído
      if (options.includeData === false && options.includeSchema === false) {
        throw new Error('Pelo menos um de includeData ou includeSchema deve ser true');
      }

      // Configurar callback de progresso
      setProgressCallback(updateBackupProgress);

      // Criar backup usando o serviço
      const result = await BackupService.createBackup({
        ...options,
        createdBy: context.user.id,
        createdByEmail: context.user.email,
      });

      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar backup');
      }

      return {
        success: true,
        backup: {
          id: result.id,
          filename: result.filename,
          size: result.size,
          checksum: result.checksum,
          duration: result.duration,
          createdAt: new Date().toISOString(),
          createdBy: context.user.email,
          options: {
            includeData: options.includeData !== false,
            includeSchema: options.includeSchema !== false,
            compress: options.compress || false
          }
        },
        message: 'Backup criado com sucesso'
      };

    } catch (error) {
      console.error('[BACKUP_CREATE_ERROR]', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined,
        userId: context.user.id,
        timestamp: new Date().toISOString(),
        requestBody: body
      });
      
      throw error;
    }
  });
}