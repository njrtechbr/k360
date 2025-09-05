import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { SeasonsService } from '@/services/gamification';

const prisma = new PrismaClient();

// GET /api/gamification/seasons/[id]
// Buscar uma temporada específica com detalhes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seasonId = params.id;
    const { searchParams } = new URL(request.url);
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeParticipants = searchParams.get('includeParticipants') === 'true';

    // Buscar temporada
    const season = await prisma.gamificationSeason.findUnique({
      where: { id: seasonId }
    });
    
    if (!season) {
      return NextResponse.json(
        { error: 'Temporada não encontrada' },
        { status: 404 }
      );
    }

    // Calcular informações básicas da temporada
    const isActive = SeasonsService.isSeasonActive(season);
    const progress = SeasonsService.getSeasonProgress(season);
    const remainingDays = SeasonsService.getRemainingDays(season);
    const totalDuration = SeasonsService.getTotalDuration(season);
    const daysSinceStart = SeasonsService.getDaysSinceStart(season);

    let stats = null;
    let participants = null;

    if (includeStats) {
      // Buscar estatísticas de XP
      const xpStats = await prisma.xpEvent.aggregate({
        where: { seasonId },
        _sum: { xpGained: true },
        _count: true,
        _avg: { xpGained: true }
      });

      // Buscar eventos por fonte
      const eventsBySource = await prisma.xpEvent.groupBy({
        by: ['source'],
        where: { seasonId },
        _sum: { xpGained: true },
        _count: true
      });

      // Buscar eventos por dia (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const dailyEvents = await prisma.xpEvent.groupBy({
        by: ['createdAt'],
        where: {
          seasonId,
          createdAt: { gte: thirtyDaysAgo }
        },
        _sum: { xpGained: true },
        _count: true
      });

      // Processar eventos diários
      const dailyStats = dailyEvents.reduce((acc, event) => {
        const date = event.createdAt.toISOString().split('T')[0];
        acc[date] = {
          totalXp: event._sum.xpGained || 0,
          eventCount: event._count
        };
        return acc;
      }, {} as Record<string, { totalXp: number; eventCount: number }>);

      stats = {
        totalXp: xpStats._sum.xpGained || 0,
        totalEvents: xpStats._count,
        averageXpPerEvent: xpStats._avg.xpGained || 0,
        eventsBySource: eventsBySource.map(item => ({
          source: item.source,
          totalXp: item._sum.xpGained || 0,
          eventCount: item._count
        })),
        dailyStats
      };
    }

    if (includeParticipants) {
      // Buscar participantes com suas estatísticas
      const participantStats = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        where: { seasonId },
        _sum: { xpGained: true },
        _count: true
      });

      // Buscar informações dos atendentes
      const attendantIds = participantStats.map(p => p.attendantId);
      const attendants = await prisma.attendant.findMany({
        where: { id: { in: attendantIds } },
        select: {
          id: true,
          name: true,
          email: true,
          setor: true
        }
      });

      // Combinar dados
      participants = participantStats.map(stat => {
        const attendant = attendants.find(a => a.id === stat.attendantId);
        return {
          attendant,
          totalXp: stat._sum.xpGained || 0,
          eventCount: stat._count
        };
      }).sort((a, b) => b.totalXp - a.totalXp);
    }

    return NextResponse.json({
      season,
      info: {
        isActive,
        progress,
        remainingDays,
        totalDuration,
        daysSinceStart
      },
      stats,
      participants
    });
  } catch (error) {
    console.error('Erro ao buscar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/gamification/seasons/[id]
// Deletar uma temporada específica
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seasonId = params.id;
    const { searchParams } = new URL(request.url);
    const forceDelete = searchParams.get('force') === 'true';

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

    // Verificar se a temporada está ativa
    if (season.active && !forceDelete) {
      return NextResponse.json(
        {
          error: 'Não é possível deletar uma temporada ativa',
          suggestion: 'Desative a temporada primeiro ou use o parâmetro ?force=true'
        },
        { status: 400 }
      );
    }

    // Verificar se há eventos de XP associados
    const xpEventsCount = await prisma.xpEvent.count({
      where: { seasonId }
    });

    if (xpEventsCount > 0 && !forceDelete) {
      return NextResponse.json(
        {
          error: `Não é possível deletar temporada com ${xpEventsCount} eventos de XP associados`,
          suggestion: 'Use o parâmetro ?force=true para deletar todos os eventos associados',
          eventsCount: xpEventsCount
        },
        { status: 400 }
      );
    }

    // Se forceDelete, deletar todos os eventos associados primeiro
    if (forceDelete && xpEventsCount > 0) {
      await prisma.xpEvent.deleteMany({
        where: { seasonId }
      });
    }

    // Deletar temporada
    await prisma.gamificationSeason.delete({
      where: { id: seasonId }
    });

    return NextResponse.json({
      message: 'Temporada deletada com sucesso',
      deletedEventsCount: forceDelete ? xpEventsCount : 0
    });
  } catch (error) {
    console.error('Erro ao deletar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/gamification/seasons/[id]
// Atualizar uma temporada específica
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const seasonId = params.id;
    const body = await request.json();
    const updateData = { ...body };
    delete updateData.id; // Remover ID dos dados de atualização

    // Verificar se a temporada existe
    const existingSeason = await prisma.gamificationSeason.findUnique({
      where: { id: seasonId }
    });
    
    if (!existingSeason) {
      return NextResponse.json(
        { error: 'Temporada não encontrada' },
        { status: 404 }
      );
    }

    // Validar datas se fornecidas
    if (updateData.startDate || updateData.endDate) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingSeason.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : existingSeason.endDate;
      
      if (startDate >= endDate) {
        return NextResponse.json(
          { error: 'Data de início deve ser anterior à data de fim' },
          { status: 400 }
        );
      }
    }

    // Verificar sobreposição se ativando temporada
    if (updateData.active === true && !existingSeason.active) {
      const startDate = updateData.startDate ? new Date(updateData.startDate) : existingSeason.startDate;
      const endDate = updateData.endDate ? new Date(updateData.endDate) : existingSeason.endDate;
      
      const overlappingSeasons = await prisma.gamificationSeason.findMany({
        where: {
          id: { not: seasonId },
          active: true,
          OR: [
            {
              AND: [
                { startDate: { lte: startDate } },
                { endDate: { gte: startDate } }
              ]
            },
            {
              AND: [
                { startDate: { lte: endDate } },
                { endDate: { gte: endDate } }
              ]
            },
            {
              AND: [
                { startDate: { gte: startDate } },
                { endDate: { lte: endDate } }
              ]
            }
          ]
        }
      });

      if (overlappingSeasons.length > 0) {
        return NextResponse.json(
          {
            error: 'Já existe uma temporada ativa no período especificado',
            conflictingSeasons: overlappingSeasons.map(s => ({
              id: s.id,
              name: s.name,
              startDate: s.startDate,
              endDate: s.endDate
            }))
          },
          { status: 400 }
        );
      }
    }

    // Atualizar temporada
    const updatedSeason = await prisma.gamificationSeason.update({
      where: { id: seasonId },
      data: {
        ...updateData,
        startDate: updateData.startDate ? new Date(updateData.startDate) : undefined,
        endDate: updateData.endDate ? new Date(updateData.endDate) : undefined
      }
    });

    // Validar temporada atualizada
    const validation = SeasonsService.validateSeason(updatedSeason);
    if (!validation.isValid) {
      return NextResponse.json(
        {
          warning: 'Temporada atualizada mas com problemas de validação',
          validationErrors: validation.errors,
          season: updatedSeason
        },
        { status: 200 }
      );
    }

    return NextResponse.json(updatedSeason);
  } catch (error) {
    console.error('Erro ao atualizar temporada:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}