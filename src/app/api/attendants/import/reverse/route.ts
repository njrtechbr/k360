import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AttendantService } from '@/services/attendantService';

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !['SUPERADMIN', 'ADMIN'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const { importId } = await request.json();
    
    if (!importId) {
      return NextResponse.json({ error: 'ID da importação é obrigatório' }, { status: 400 });
    }

    await AttendantService.deleteByImportId(importId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao reverter importação de atendentes:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}