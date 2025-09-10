import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SeasonsService } from '@/services/gamification';

const prisma = new PrismaClient();

// POST /api/gamification/seasons/[id]/activate
// Ativar uma temporada específica
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const seasonId = params.id;

    // Verificar se a temporada existe
    const season = await prisma.gamificationSeason.findUnique({
      where: { id: seasonId }
    });
    
    if (!season) {
      return NextResponse.json(
        { error: 'Temporada não encontrada' },
        { status: 404 }
      );
    }

    // Verificar se a temporada já está ativa
    if (season.isActive) {
      return NextResponse.json(
        { error: 'Temporada já está ativa' },
        { status: 400 }
      );
    }

    // Validar se a temporada pode ser ativada
    const validation = SeasonsService.validateSeason(season);
    if (!validation.isValid) {
      return NextResponse.json(
        { 
          error: 'Temporada não pode ser ativada',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    // Verificar sobreposição com outras temporadas ativas
    const overlappingSeasons = await prisma.gamificationSeason.findMany({
      where: {
        id: { not: seasonId },
        isActive: true,
        OR: [
          {
            AND: [
              { startDate: { lte: season.startDate } },
              { endDate: { gte: season.startDate } }
            ]
          },
          {
            AND: [
              { startDate: { lte: season.endDate } },
              { endDate: { gte: season.endDate } }
            ]
          },
          {
            AND: [
              { startDate: { gte: season.startDate } },
              { endDate: { lte: season.endDate } }
            ]
          }
        ]
      }
    });

    // Se há sobreposição, desativar temporadas conflitantes
    if (overlappingSeasons.length > 0) {
      const { searchParams } = new URL(request.url);
      const forceActivation = searchParams.get('force') === 'true';
      
      if (!forceActivation) {
        return NextResponse.json(
          {
            error: 'Existem temporadas ativas que se sobrepõem ao período desta temporada',
            conflictingSeasons: overlappingSeasons.map(s => ({
              id: s.id,
              name: s.name,
              startDate: s.startDate,
              endDate: s.endDate
            })),
            suggestion: 'Use o parâmetro ?force=true para desativar automaticamente as temporadas conflitantes'
          },
          { status: 409 }
        );
      }

      // Desativar temporadas conflitantes
      await prisma.gamificationSeason.updateMany({
        where: {
          id: { in: overlappingSeasons.map(s => s.id) }
        },
        data: {
          isActive: false
        }
      });
    }

    // Ativar a temporada
    const activatedSeason = await prisma.gamificationSeason.update({
      where: { id: seasonId },
      data: { isActive: true }
    });

    // Buscar estatísticas da temporada ativada
    const xpStats = await prisma.xpEvent.aggregate({
      where: { seasonId },
      _sum: { xpGained: true },
      _count: true
    });

    const participantsCount = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: { seasonId }
    });

    const seasonProgress = SeasonsService.getSeasonProgress(activatedSeason);
    const remainingDays = SeasonsService.getRemainingDays(activatedSeason);

    return NextResponse.json({
      season: activatedSeason,
      deactivatedSeasons: overlappingSeasons.map(s => ({
        id: s.id,
        name: s.name
      })),
      stats: {
        totalXp: xpStats._sum.xpGained || 0,
        totalEvents: xpStats._count,
        participantsCount: participantsCount.length,
        progressPercentage: seasonProgress,
        remainingDays
      },
      message: 'Temporada ativada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao ativar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}