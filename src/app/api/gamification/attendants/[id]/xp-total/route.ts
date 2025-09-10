import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GamificationService } from '@/services/gamificationService';
import { handlePrismaError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const attendantId = params.id;
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');

    // Calcular XP total
    const totalXp = await GamificationService.calculateTotalXp(
      attendantId, 
      seasonId || undefined
    );

    return NextResponse.json({ 
      attendantId,
      totalXp,
      seasonId: seasonId || null
    });
  } catch (error) {
    console.error('Erro ao calcular XP total:', error);
    const dbError = handlePrismaError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: 500 }
    );
  }
}