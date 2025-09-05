import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { XpService, LevelsService } from '@/services/gamification';

const prisma = new PrismaClient();

// GET /api/gamification/xp/attendant/[id]
// Buscar XP total e detalhes de um atendente específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const includeEvents = searchParams.get('includeEvents') === 'true';
    const includeStats = searchParams.get('includeStats') === 'true';

    // Verificar se o atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId },
      select: {
        id: true,
        name: true,
        email: true,
        setor: true
      }
    });
    
    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Construir filtros para eventos de XP
    const where: any = {
      attendantId
    };
    
    // Filtrar por data se seasonId for fornecido (buscar temporada ativa)
    if (seasonId) {
      const season = await prisma.gamificationSeason.findUnique({
        where: { id: seasonId }
      });
      if (season) {
        where.date = {
          gte: season.startDate,
          lte: season.endDate
        };
      }
    }

    // Buscar eventos de XP
    const xpEventsQuery = prisma.xpEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Buscar total de XP
    const totalXpQuery = prisma.xpEvent.aggregate({
      where,
      _sum: {
        points: true
      }
    });

    // Buscar configuração de níveis
    const levelRewardsQuery = prisma.levelReward.findMany({
      orderBy: { level: 'asc' }
    });

    // Executar queries em paralelo
    const [xpEvents, totalXpResult, levelRewards] = await Promise.all([
      includeEvents ? xpEventsQuery : Promise.resolve([]),
      totalXpQuery,
      levelRewardsQuery
    ]);

    const totalXp = totalXpResult._sum.points || 0;

    // Calcular informações de nível
    const currentLevel = LevelsService.getLevelFromXp(totalXp);
    const levelProgress = LevelsService.getLevelProgress(totalXp, levelRewards);
    const levelInfo = LevelsService.getLevelInfo(totalXp, levelRewards);

    // Calcular estatísticas se solicitado
    let stats = null;
    if (includeStats) {
      const eventsByType = xpEvents.reduce((acc, event) => {
        acc[event.type] = (acc[event.type] || 0) + event.points;
        return acc;
      }, {} as Record<string, number>);

      const eventsByMonth = xpEvents.reduce((acc, event) => {
        const month = event.createdAt.toISOString().substring(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + event.points;
        return acc;
      }, {} as Record<string, number>);

      stats = {
        totalEvents: xpEvents.length,
        averageXpPerEvent: xpEvents.length > 0 ? totalXp / xpEvents.length : 0,
        eventsByType,
        eventsByMonth,
        firstEventDate: xpEvents.length > 0 ? xpEvents[xpEvents.length - 1].createdAt : null,
        lastEventDate: xpEvents.length > 0 ? xpEvents[0].createdAt : null
      };
    }

    // Buscar recompensas recentemente desbloqueadas (últimos 7 dias)
    const recentRewards = await LevelsService.getRecentlyUnlockedRewards(
      attendantId,
      levelRewards,
      7
    );

    // Buscar próximas recompensas
    const upcomingRewards = LevelsService.getUpcomingRewards(
      currentLevel,
      levelRewards,
      3
    );

    const response = {
      attendant,
      xp: {
        total: totalXp,
        currentLevel,
        levelProgress,
        levelInfo,
        recentRewards,
        upcomingRewards
      },
      events: includeEvents ? xpEvents : undefined,
      stats
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erro ao buscar XP do atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/xp/attendant/[id]
// Adicionar XP para um atendente específico
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const body = await request.json();
    const {
      xpGained,
      reason,
      source = 'manual',
      seasonId,
      metadata = {}
    } = body;

    // Validar dados obrigatórios
    if (!xpGained || !reason) {
      return NextResponse.json(
        { error: 'Dados obrigatórios: xpGained, reason' },
        { status: 400 }
      );
    }

    // Verificar se o atendente existe
    const attendant = await prisma.attendant.findUnique({
      where: { id: attendantId }
    });
    
    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar temporada ativa se não especificada
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });
      
      if (!activeSeason) {
        return NextResponse.json(
          { error: 'Nenhuma temporada ativa encontrada' },
          { status: 400 }
        );
      }
      
      targetSeasonId = activeSeason.id;
    }

    // Criar evento de XP
    const xpEvent = await prisma.xpEvent.create({
      data: {
        attendantId,
        seasonId: targetSeasonId,
        xpGained: Math.max(0, xpGained),
        reason,
        source,
        metadata
      },
      include: {
        attendant: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        season: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Calcular novo total de XP
    const totalXpResult = await prisma.xpEvent.aggregate({
      where: { attendantId },
      _sum: {
        xpGained: true
      }
    });

    const newTotalXp = totalXpResult._sum.xpGained || 0;

    // Buscar configuração de níveis para calcular novo nível
    const levelRewards = await prisma.levelReward.findMany({
      orderBy: { level: 'asc' }
    });

    const newLevel = LevelsService.getLevelFromXp(newTotalXp, levelRewards);
    const levelProgress = LevelsService.getLevelProgress(newTotalXp, levelRewards);

    return NextResponse.json({
      xpEvent,
      newTotalXp,
      newLevel,
      levelProgress
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao adicionar XP para atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}