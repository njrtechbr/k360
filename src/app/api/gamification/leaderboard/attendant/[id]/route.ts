import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { LeaderboardService } from '@/services/gamification';

const prisma = new PrismaClient();

// GET /api/gamification/leaderboard/attendant/[id]
// Buscar posição e estatísticas de um atendente específico no leaderboard
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const department = searchParams.get('department');
    const includeNearby = searchParams.get('includeNearby') === 'true';
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const includeComparisons = searchParams.get('includeComparisons') === 'true';
    const nearbyRange = parseInt(searchParams.get('nearbyRange') || '5');

    // Verificar se o atendente existe
    const attendant = await prisma.user.findUnique({
      where: { id: attendantId },
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Determinar temporada se não especificada
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { isActive: true }
      });
      targetSeasonId = activeSeason?.id;
    }

    // Construir filtros base
    let xpWhereClause: any = {};
    if (targetSeasonId) {
      xpWhereClause.seasonId = targetSeasonId;
    }

    // Buscar XP do atendente específico
    const attendantXpData = await prisma.xpEvent.aggregate({
      where: {
        ...xpWhereClause,
        attendantId
      },
      _sum: { xpGained: true },
      _count: true,
      _avg: { xpGained: true },
      _max: { xpGained: true },
      _min: { xpGained: true }
    });

    const attendantTotalXp = attendantXpData._sum.xpGained || 0;
    const attendantLevel = LeaderboardService.calculateLevel(attendantTotalXp);

    // Buscar todos os participantes para calcular posição
    let participantsWhereClause: any = {};
    if (department) {
      participantsWhereClause.department = department;
    }

    const allParticipants = await prisma.user.findMany({
      where: participantsWhereClause,
      select: { id: true, department: true }
    });

    const participantIds = allParticipants.map(p => p.id);

    // Buscar XP de todos os participantes
    const allXpData = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: {
        ...xpWhereClause,
        attendantId: { in: participantIds }
      },
      _sum: { xpGained: true }
    });

    // Calcular posição
    const leaderboardData = allXpData
      .map(xp => ({
        attendantId: xp.attendantId,
        totalXp: xp._sum.xpGained || 0
      }))
      .sort((a, b) => b.totalXp - a.totalXp);

    const attendantPosition = leaderboardData.findIndex(l => l.attendantId === attendantId) + 1;
    const totalParticipants = leaderboardData.length;

    // Calcular percentil
    const percentile = totalParticipants > 0 
      ? ((totalParticipants - attendantPosition + 1) / totalParticipants) * 100 
      : 0;

    // Buscar achievements do atendente
    const achievementData = await prisma.attendantAchievement.aggregate({
      where: {
        attendantId,
        isUnlocked: true
      },
      _count: true
    });

    // Estatísticas básicas do atendente
    const attendantStats = {
      totalXp: attendantTotalXp,
      level: attendantLevel,
      position: attendantPosition || null,
      totalParticipants,
      percentile: Math.round(percentile),
      eventCount: attendantXpData._count,
      averageXpPerEvent: attendantXpData._avg.xpGained || 0,
      maxXpEvent: attendantXpData._max.xpGained || 0,
      minXpEvent: attendantXpData._min.xpGained || 0,
      achievementCount: achievementData._count
    };

    let result: any = {
      attendant,
      stats: attendantStats,
      seasonId: targetSeasonId,
      department: department || 'all'
    };

    // Incluir atendentes próximos se solicitado
    if (includeNearby && attendantPosition > 0) {
      const startIndex = Math.max(0, attendantPosition - nearbyRange - 1);
      const endIndex = Math.min(leaderboardData.length, attendantPosition + nearbyRange);
      
      const nearbyAttendantIds = leaderboardData
        .slice(startIndex, endIndex)
        .map(l => l.attendantId);
      
      const nearbyAttendants = await prisma.user.findMany({
        where: { id: { in: nearbyAttendantIds } },
        select: {
          id: true,
          name: true,
          department: true,
          avatar: true
        }
      });

      const nearbyLeaderboard = leaderboardData
        .slice(startIndex, endIndex)
        .map((item, index) => {
          const attendantInfo = nearbyAttendants.find(a => a.id === item.attendantId);
          return {
            position: startIndex + index + 1,
            attendant: attendantInfo,
            totalXp: item.totalXp,
            level: LeaderboardService.calculateLevel(item.totalXp),
            isCurrentAttendant: item.attendantId === attendantId
          };
        });

      result.nearbyLeaderboard = nearbyLeaderboard;
    }

    // Incluir histórico se solicitado
    if (includeHistory) {
      // Histórico de XP por semana nas últimas 12 semanas
      const weeklyHistory = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('week', "createdAt") as week,
          SUM("xpGained") as weeklyXp,
          COUNT(*) as weeklyEvents
        FROM "XpEvent"
        WHERE "attendantId" = ${attendantId}
        AND "createdAt" >= NOW() - INTERVAL '12 weeks'
        ${targetSeasonId ? prisma.$queryRaw`AND "seasonId" = ${targetSeasonId}` : prisma.$queryRaw``}
        GROUP BY DATE_TRUNC('week', "createdAt")
        ORDER BY week ASC
      `;

      // Histórico de posição (simulado baseado em XP acumulado)
      const cumulativeXpHistory = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('week', "createdAt") as week,
          SUM("xpGained") OVER (ORDER BY DATE_TRUNC('week', "createdAt")) as cumulativeXp
        FROM "XpEvent"
        WHERE "attendantId" = ${attendantId}
        ${targetSeasonId ? prisma.$queryRaw`AND "seasonId" = ${targetSeasonId}` : prisma.$queryRaw``}
        GROUP BY DATE_TRUNC('week', "createdAt")
        ORDER BY week ASC
      `;

      result.history = {
        weekly: weeklyHistory,
        cumulative: cumulativeXpHistory
      };
    }

    // Incluir comparações se solicitado
    if (includeComparisons) {
      // Comparação com média do departamento
      const departmentAvg = await prisma.xpEvent.aggregate({
        where: {
          ...xpWhereClause,
          attendantId: {
            in: allParticipants
              .filter(p => p.department === attendant.department)
              .map(p => p.id)
          }
        },
        _avg: { xpGained: true }
      });

      // Comparação com média geral
      const generalAvg = await prisma.xpEvent.aggregate({
        where: xpWhereClause,
        _avg: { xpGained: true }
      });

      // Buscar atendentes do mesmo nível
      const sameLevelAttendants = leaderboardData.filter(l => {
        const level = LeaderboardService.calculateLevel(l.totalXp);
        return level === attendantLevel && l.attendantId !== attendantId;
      });

      const sameLevelAvgXp = sameLevelAttendants.length > 0
        ? sameLevelAttendants.reduce((sum, a) => sum + a.totalXp, 0) / sameLevelAttendants.length
        : 0;

      result.comparisons = {
        departmentAverage: {
          averageXp: departmentAvg._avg.xpGained || 0,
          difference: attendantTotalXp - (departmentAvg._avg.xpGained || 0),
          percentageDifference: (departmentAvg._avg.xpGained || 0) > 0
            ? ((attendantTotalXp - (departmentAvg._avg.xpGained || 0)) / (departmentAvg._avg.xpGained || 0)) * 100
            : 0
        },
        generalAverage: {
          averageXp: generalAvg._avg.xpGained || 0,
          difference: attendantTotalXp - (generalAvg._avg.xpGained || 0),
          percentageDifference: (generalAvg._avg.xpGained || 0) > 0
            ? ((attendantTotalXp - (generalAvg._avg.xpGained || 0)) / (generalAvg._avg.xpGained || 0)) * 100
            : 0
        },
        sameLevelAverage: {
          averageXp: sameLevelAvgXp,
          difference: attendantTotalXp - sameLevelAvgXp,
          participantCount: sameLevelAttendants.length,
          percentageDifference: sameLevelAvgXp > 0
            ? ((attendantTotalXp - sameLevelAvgXp) / sameLevelAvgXp) * 100
            : 0
        }
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar posição do atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// PUT /api/gamification/leaderboard/attendant/[id]
// Recalcular posição e estatísticas de um atendente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const attendantId = params.id;
    const body = await request.json();
    const { seasonId, recalculateAll = false } = body;

    // Verificar se o atendente existe
    const attendant = await prisma.user.findUnique({
      where: { id: attendantId }
    });

    if (!attendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Se recalculateAll for true, recalcular para todos os atendentes
    if (recalculateAll) {
      // Buscar todos os eventos XP e recalcular totais
      let whereClause: any = {};
      if (seasonId) {
        whereClause.seasonId = seasonId;
      }

      const allXpEvents = await prisma.xpEvent.findMany({
        where: whereClause,
        select: {
          attendantId: true,
          xpGained: true
        }
      });

      // Agrupar por atendente
      const attendantTotals = allXpEvents.reduce((acc, event) => {
        if (!acc[event.attendantId]) {
          acc[event.attendantId] = 0;
        }
        acc[event.attendantId] += event.xpGained;
        return acc;
      }, {} as Record<string, number>);

      // Aqui você poderia atualizar uma tabela de cache de leaderboard se existisse
      // Por enquanto, apenas retornamos os dados recalculados
      
      return NextResponse.json({
        message: 'Leaderboard recalculado com sucesso',
        recalculatedAttendants: Object.keys(attendantTotals).length,
        targetAttendant: {
          id: attendantId,
          totalXp: attendantTotals[attendantId] || 0,
          level: LeaderboardService.calculateLevel(attendantTotals[attendantId] || 0)
        }
      });
    }

    // Recalcular apenas para o atendente específico
    let xpWhereClause: any = { attendantId };
    if (seasonId) {
      xpWhereClause.seasonId = seasonId;
    }

    const xpData = await prisma.xpEvent.aggregate({
      where: xpWhereClause,
      _sum: { xpGained: true },
      _count: true
    });

    const totalXp = xpData._sum.xpGained || 0;
    const level = LeaderboardService.calculateLevel(totalXp);

    return NextResponse.json({
      message: 'Estatísticas do atendente recalculadas com sucesso',
      attendant: {
        id: attendantId,
        totalXp,
        level,
        eventCount: xpData._count
      },
      seasonId
    });
  } catch (error) {
    console.error('Erro ao recalcular estatísticas do atendente:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}