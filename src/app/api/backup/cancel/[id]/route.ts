import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

interface RouteParams {
  params: {
    id: string;
  };
}

// Mapa para rastrear operações canceladas
const cancelledOperations = new Set<string>();

export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      );
    }

    // Verificar permissões - apenas ADMIN e SUPERADMIN podem cancelar
    const userRole = session.user.role as Role;
    const allowedRoles = ['ADMIN', 'SUPERADMIN'];
    
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json(
        { error: 'Permissões insuficientes para cancelar backup' },
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

    // Marcar operação como cancelada
    cancelledOperations.add(backupId);
    
    // Log da operação de cancelamento
    console.log(`[BACKUP_CANCEL] Backup ${backupId} cancelado por ${session.user.email}`);

    // Limpar da lista após 5 minutos (para evitar acúmulo de memória)
    setTimeout(() => {
      cancelledOperations.delete(backupId);
    }, 5 * 60 * 1000);

    return NextResponse.json({
      success: true,
      message: 'Solicitação de cancelamento registrada',
      backupId
    });

  } catch (error) {
    console.error('[BACKUP_CANCEL_ERROR]', error);
    
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// Função para verificar se uma operação foi cancelada
export function isOperationCancelled(backupId: string): boolean {
  return cancelledOperations.has(backupId);
}