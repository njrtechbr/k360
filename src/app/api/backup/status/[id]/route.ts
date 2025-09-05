import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { BackupService } from '@/services/backupService';
import { Role } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// Mapa para rastrear progresso de operações em andamento
const operationProgress = new Map<string, {
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  startTime: number;
  lastUpdate: number;
}>();

// Função para atualizar progresso (chamada pelo BackupService)
export function updateBackupProgress(
  backupId: string, 
  progress: number, 
  message: string, 
  status: 'in_progress' | 'completed' | 'failed' = 'in_progress'
) {
  const existing = operationProgress.get(backupId);
  operationProgress.set(backupId, {
    status,
    progress: Math.min(100, Math.max(0, progress)),
    message,
    startTime: existing?.startTime || Date.now(),
    lastUpdate: Date.now()
  });

  // Log de auditoria para rastreamento de progresso
  console.log(`[BACKUP_PROGRESS] ${backupId}: ${progress}% - ${message} (${status})`);

  // Limpar progresso após completar ou falhar
  if (status === 'completed' || status === 'failed') {
    setTimeout(() => {
      operationProgress.delete(backupId);
      console.log(`[BACKUP_PROGRESS] Progresso limpo para backup ${backupId}`);
    }, 30000); // Manter por 30 segundos após completar
  }
}

// Limpar progresso antigo (operações órfãs)
setInterval(() => {
  const now = Date.now();
  const maxAge = 10 * 60 * 1000; // 10 minutos

  for (const [id, progress] of operationProgress.entries()) {
    if (now - progress.lastUpdate > maxAge) {
      operationProgress.delete(id);
    }
  }
}, 60000); // Verificar a cada minuto

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar permissões - ADMIN, SUPERADMIN e SUPERVISOR podem ver status
    const userRole = session.user.role as Role;
    const allowedRoles = ['ADMIN', 'SUPERADMIN', 'SUPERVISOR'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Permissões insuficientes para acessar status do backup' },
        { status: 403 }
      );
    }

    const backupId = params.id;

    // Validar formato do ID
    if (!backupId || typeof backupId !== 'string') {
      return NextResponse.json(
        { error: 'ID do backup inválido' },
        { status: 400 }
      );
    }

    // Verificar se há progresso em andamento
    const progressInfo = operationProgress.get(backupId);
    
    if (progressInfo) {
      // Calcular tempo decorrido
      const elapsedTime = Date.now() - progressInfo.startTime;
      const elapsedMinutes = Math.floor(elapsedTime / 60000);
      const elapsedSeconds = Math.floor((elapsedTime % 60000) / 1000);

      return NextResponse.json({
        success: true,
        status: progressInfo.status,
        progress: progressInfo.progress,
        message: progressInfo.message,
        elapsedTime: {
          total: elapsedTime,
          formatted: `${elapsedMinutes}:${elapsedSeconds.toString().padStart(2, '0')}`
        },
        lastUpdate: new Date(progressInfo.lastUpdate).toISOString()
      });
    }

    // Se não há progresso em andamento, verificar se o backup existe
    const backupInfo = await BackupService.getBackupInfo(backupId);
    
    if (!backupInfo) {
      return NextResponse.json(
        { error: 'Backup não encontrado' },
        { status: 404 }
      );
    }

    // Determinar status baseado nas informações do backup
    let status: 'in_progress' | 'completed' | 'failed';
    let message: string;
    let progressValue: number;

    switch (backupInfo.status) {
      case 'success':
        status = 'completed';
        message = 'Backup concluído com sucesso';
        progressValue = 100;
        break;
      case 'failed':
        status = 'failed';
        message = 'Backup falhou durante a execução';
        progressValue = 0;
        break;
      case 'in_progress':
        status = 'in_progress';
        message = 'Backup em progresso...';
        progressValue = 50; // Progresso estimado se não temos dados específicos
        break;
      default:
        status = 'failed';
        message = 'Status desconhecido';
        progressValue = 0;
    }

    return NextResponse.json({
      success: true,
      status,
      progress: progressValue,
      message,
      backup: {
        id: backupInfo.id,
        filename: backupInfo.filename,
        size: backupInfo.size,
        createdAt: backupInfo.createdAt,
        duration: backupInfo.duration
      }
    });

  } catch (error) {
    console.error('[BACKUP_STATUS_ERROR]', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}