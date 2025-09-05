import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { handlePrismaError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const attendantId = params.id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const seasonId = searchParams.get('seasonId');

    // Verificar se atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId }
    });

    if (!attendant) {
      return NextResponse.json({ error: 'Atendente não encontrado' }, { status: 404 });
    }

    // Construir filtros
    const where: any = {
      attendantId
    };

    if (type) {
      where.type = type;
    }

    if (seasonId) {
      where.seasonId = seasonId;
    }

    // Buscar eventos XP
    const xpEvents = await prisma.xpEvent.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      include: {
        season: {
          select: {
            id: true,
            name: true,
            xpMultiplier: true
          }
        }
      }
    });

    return NextResponse.json(xpEvents);
  } catch (error) {
    console.error('Erro ao buscar eventos XP:', error);
    const dbError = handlePrismaError(error);
    return NextResponse.json(
      { error: dbError.message },
      { status: 500 }
    );
  }
}