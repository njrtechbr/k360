import { NextRequest, NextResponse } from 'next/server';
import { BackupService } from '@/services/backupService';
import { BackupValidator } from '@/services/backupValidator';
import { applyBackupSecurity } from '@/lib/middleware/backupSecurityMiddleware';
import { createReadStream, statSync } from 'fs';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  // Aplicar segurança
  const securityResult = await applyBackupSecurity(request, 'canDownload');
  
  if (!securityResult.success || !securityResult.user) {
    return securityResult.response || new NextResponse('Acesso negado', { status: 401 });
  }

  const context = {
    user: securityResult.user,
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  };

  try {

    const backupId = params.id;

    // Validar formato do ID
    if (!backupId || typeof backupId !== 'string') {
      return NextResponse.json(
        { error: 'ID do backup inválido' },
        { status: 400 }
      );
    }

    // Buscar informações do backup
    const backupInfo = await BackupService.getBackupInfo(backupId);
    
    if (!backupInfo) {
      return NextResponse.json(
        { error: 'Backup não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se o backup foi criado com sucesso
    if (backupInfo.status !== 'success') {
      return NextResponse.json(
        { error: 'Backup não está disponível para download' },
        { status: 400 }
      );
    }

    // Verificar se o arquivo existe fisicamente
    try {
      const fileStats = statSync(backupInfo.filepath);
      
      // Verificar se o tamanho do arquivo bate com o registrado
      if (fileStats.size !== backupInfo.size) {
        console.error(`[BACKUP_INTEGRITY_ERROR] Tamanho do arquivo não confere: esperado ${backupInfo.size}, encontrado ${fileStats.size}`);
        return NextResponse.json(
          { error: 'Arquivo de backup corrompido' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error(`[BACKUP_FILE_ERROR] Arquivo não encontrado: ${backupInfo.filepath}`, error);
      return NextResponse.json(
        { error: 'Arquivo de backup não encontrado' },
        { status: 404 }
      );
    }

    // Validar integridade do backup antes do download
    try {
      const isValid = await BackupValidator.validateBackup(backupInfo.filepath);
      if (!isValid) {
        console.error(`[BACKUP_INTEGRITY_ERROR] Falha na validação de integridade: ${backupInfo.filepath}`);
        return NextResponse.json(
          { error: 'Backup falhou na validação de integridade' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error(`[BACKUP_VALIDATION_ERROR] Erro ao validar backup: ${backupInfo.filepath}`, error);
      return NextResponse.json(
        { error: 'Erro ao validar integridade do backup' },
        { status: 500 }
      );
    }

    // Log de auditoria detalhado
    const auditInfo = {
      action: 'BACKUP_DOWNLOAD',
      userId: context.user.id,
      userRole: context.user.role,
      backupId: backupInfo.id,
      filename: backupInfo.filename,
      fileSize: backupInfo.size,
      timestamp: new Date().toISOString(),
      clientIP: context.ipAddress
    };
    
    console.log(`[BACKUP_AUDIT] ${JSON.stringify(auditInfo)}`);

    // Preparar headers para download
    const headers = new Headers();
    headers.set('Content-Type', 'application/octet-stream');
    headers.set('Content-Disposition', `attachment; filename="${backupInfo.filename}"`);
    headers.set('Content-Length', backupInfo.size.toString());
    headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    headers.set('Pragma', 'no-cache');
    headers.set('Expires', '0');

    // Para arquivos pequenos (< 50MB), retornar diretamente
    if (backupInfo.size < 50 * 1024 * 1024) {
      try {
        const fs = await import('fs/promises');
        const fileBuffer = await fs.readFile(backupInfo.filepath);
        
        // Log de conclusão do download direto
        console.log(`[BACKUP_AUDIT] Download direto concluído para backup ${backupInfo.id} - ${backupInfo.filename}`);

        return new NextResponse(fileBuffer, {
          status: 200,
          headers
        });
      } catch (error) {
        console.error(`[BACKUP_READ_ERROR] Erro ao ler arquivo: ${backupInfo.filepath}`, error);
        return NextResponse.json(
          { error: 'Erro ao ler arquivo de backup' },
          { status: 500 }
        );
      }
    }

    // Para arquivos grandes, usar streaming
    try {
      const stream = createReadStream(backupInfo.filepath);
      
      // Converter Node.js ReadableStream para Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on('data', (chunk: Buffer) => {
            controller.enqueue(new Uint8Array(chunk));
          });
          
          stream.on('end', () => {
            controller.close();
          });
          
          stream.on('error', (error) => {
            console.error(`[BACKUP_STREAM_ERROR] Erro no streaming: ${backupInfo.filepath}`, error);
            controller.error(error);
          });
        },
        
        cancel() {
          stream.destroy();
        }
      });

      // Log de conclusão do streaming
      console.log(`[BACKUP_AUDIT] Streaming iniciado para backup ${backupInfo.id} - ${backupInfo.filename}`);

      return new NextResponse(webStream, {
        status: 200,
        headers
      });

    } catch (error) {
      console.error(`[BACKUP_STREAM_ERROR] Erro ao criar stream: ${backupInfo.filepath}`, error);
      return NextResponse.json(
        { error: 'Erro ao transmitir arquivo de backup' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[BACKUP_DOWNLOAD_ERROR]', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}