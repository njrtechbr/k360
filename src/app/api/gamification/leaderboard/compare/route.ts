import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { LeaderboardService } from '@/services/gamification';

const prisma = new PrismaClient();

// POST /api/gamification/leaderboard/compare
// Comparar performance entre atendentes
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      attendantIds,
      seasonId,
      startDate,
      endDate,
      includeDetails = false,
      includeHistory = false
    } = body;

    if (!attendantIds || !Array.isArray(attendantIds) || attendantIds.length < 2) {
      return NextResponse.json(
        { error: 'É necessário fornecer pelo menos 2 IDs de atendentes para comparação' },
        { status: 400 }
      );
    }

    if (attendantIds.length > 10) {
      return NextResponse.json(
        { error: 'Máximo de 10 atendentes podem ser comparados por vez' },
        { status: 400 }
      );
    }

    // Construir filtros para XP
    let xpWhereClause: any = {
      attendantId: { in: attendantIds }
    };

    if (seasonId) {
      const season = await prisma.gamificationSeason.findUnique({
        where: { id: seasonId }
      });
      if (season) {
        xpWhereClause.date = {
          gte: season.startDate,
          lte: season.endDate
        };
      }
    }

    if (startDate) {
      xpWhereClause.date = { 
        ...xpWhereClause.date,
        gte: new Date(startDate) 
      };
    }

    if (endDate) {
      xpWhereClause.date = {
        ...xpWhereClause.date,
        lte: new Date(endDate)
      };
    }

    // Buscar informações dos atendentes
    const attendants = await prisma.attendant.findMany({
      where: { id: { in: attendantIds } },
      select: {
        id: true,
        name: true,
        email: true,
        setor: true,
        avatarUrl: true,
        createdAt: true
      }
    });

    if (attendants.length !== attendantIds.length) {
      return NextResponse.json(
        { error: 'Um ou mais atendentes não foram encontrados' },
        { status: 404 }
      );
    }

    // Buscar dados de XP agrupados
    const xpData = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: xpWhereClause,
      _sum: { points: true },
      _count: true,
      _avg: { points: true },
      _max: { points: true },
      _min: { points: true }
    });

    // Buscar achievements para cada atendente
    const achievementsData = await prisma.attendantAchievement.groupBy({
      by: ['attendantId'],
      where: {
        attendantId: { in: attendantIds },
        isUnlocked: true
      },
      _count: true
    });

    // Construir dados de comparação
    const comparisonData = attendants.map(attendant => {
      const xpStats = xpData.find(x => x.attendantId === attendant.id);
      const achievementStats = achievementsData.find(a => a.attendantId === attendant.id);
      
      const totalXp = xpStats?._sum.points || 0;
      const level = LeaderboardService.calculateLevel(totalXp);
      
      return {
        attendant,
        stats: {
          totalXp,
          level,
          eventCount: xpStats?._count || 0,
          averageXpPerEvent: xpStats?._avg.points || 0,
          maxXpEvent: xpStats?._max.points || 0,
          minXpEvent: xpStats?._min.points || 0,
          achievementCount: achievementStats?._count || 0
        }
      };
    });

    // Calcular rankings e diferenças
    const sortedByXp = [...comparisonData].sort((a, b) => b.stats.totalXp - a.stats.totalXp);
    const sortedByAchievements = [...comparisonData].sort((a, b) => b.stats.achievementCount - a.stats.achievementCount);
    const sortedByLevel = [...comparisonData].sort((a, b) => b.stats.level - a.stats.level);

    // Adicionar posições
    const dataWithRankings = comparisonData.map(item => {
      const xpRank = sortedByXp.findIndex(x => x.attendant.id === item.attendant.id) + 1;
      const achievementRank = sortedByAchievements.findIndex(x => x.attendant.id === item.attendant.id) + 1;
      const levelRank = sortedByLevel.findIndex(x => x.attendant.id === item.attendant.id) + 1;
      
      return {
        ...item,
        rankings: {
          xpRank,
          achievementRank,
          levelRank,
          overallRank: Math.round((xpRank + achievementRank + levelRank) / 3)
        }
      };
    });

    // Calcular estatísticas de comparação
    const totalXps = comparisonData.map(d => d.stats.totalXp);
    const totalAchievements = comparisonData.map(d => d.stats.achievementCount);
    
    const comparisonStats = {
      xp: {
        highest: Math.max(...totalXps),
        lowest: Math.min(...totalXps),
        average: totalXps.reduce((a, b) => a + b, 0) / totalXps.length,
        difference: Math.max(...totalXps) - Math.min(...totalXps)
      },
      achievements: {
        highest: Math.max(...totalAchievements),
        lowest: Math.min(...totalAchievements),
        average: totalAchievements.reduce((a, b) => a + b, 0) / totalAchievements.length,
        difference: Math.max(...totalAchievements) - Math.min(...totalAchievements)
      },
      levels: {
        highest: Math.max(...comparisonData.map(d => d.stats.level)),
        lowest: Math.min(...comparisonData.map(d => d.stats.level))
      }
    };

    let result: any = {
      attendants: dataWithRankings,
      comparisonStats,
      filters: {
        seasonId,
        startDate,
        endDate
      }
    };

    // Incluir detalhes se solicitado
    if (includeDetails) {
      // Buscar eventos XP detalhados para cada atendente
      const detailedXpEvents = await prisma.xpEvent.findMany({
        where: xpWhereClause,
        select: {
          id: true,
          attendantId: true,
          xpGained: true,
          reason: true,
          createdAt: true,
          seasonId: true
        },
        orderBy: { createdAt: 'desc' }
      });

      // Buscar achievements detalhados
      const detailedAchievements = await prisma.attendantAchievement.findMany({
        where: {
          attendantId: { in: attendantIds },
          isUnlocked: true
        },
        include: {
          achievement: {
            select: {
              id: true,
              name: true,
              description: true,
              category: true,
              difficulty: true,
              xpReward: true
            }
          }
        },
        orderBy: { unlockedAt: 'desc' }
      });

      result.details = {
        xpEvents: detailedXpEvents,
        achievements: detailedAchievements
      };
    }

    // Incluir histórico se solicitado
    if (includeHistory) {
      // Buscar histórico de XP por mês para cada atendente
      const historyData = await prisma.$queryRaw`
        SELECT 
          attendantId,
          DATE_TRUNC('month', "createdAt") as month,
          SUM("xpGained") as totalXp,
          COUNT(*) as eventCount
        FROM "XpEvent"
        WHERE "attendantId" = ANY(${attendantIds})
        ${seasonId ? prisma.$queryRaw`AND "seasonId" = ${seasonId}` : prisma.$queryRaw``}
        ${startDate ? prisma.$queryRaw`AND "createdAt" >= ${new Date(startDate)}` : prisma.$queryRaw``}
        ${endDate ? prisma.$queryRaw`AND "createdAt" <= ${new Date(endDate)}` : prisma.$queryRaw``}
        GROUP BY attendantId, DATE_TRUNC('month', "createdAt")
        ORDER BY month ASC
      `;

      result.history = historyData;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao comparar atendentes:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// GET /api/gamification/leaderboard/compare
// Buscar sugestões de atendentes para comparação
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get('attendantId');
    const seasonId = searchParams.get('seasonId');
    const department = searchParams.get('department');
    const similarLevel = searchParams.get('similarLevel') === 'true';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!attendantId) {
      return NextResponse.json(
        { error: 'ID do atendente é obrigatório' },
        { status: 400 }
      );
    }

    // Buscar informações do atendente base
    const baseAttendant = await prisma.attendant.findUnique({
      where: { id: attendantId },
      select: {
        id: true,
        name: true,
        setor: true
      }
    });

    if (!baseAttendant) {
      return NextResponse.json(
        { error: 'Atendente não encontrado' },
        { status: 404 }
      );
    }

    // Buscar XP do atendente base
    let xpWhereClause: any = { attendantId };
    if (seasonId) {
      xpWhereClause.seasonId = seasonId;
    }

    const baseXpData = await prisma.xpEvent.aggregate({
      where: xpWhereClause,
      _sum: { xpGained: true }
    });

    const baseXp = baseXpData._sum.xpGained || 0;
    const baseLevel = LeaderboardService.calculateLevel(baseXp);

    // Construir filtros para buscar atendentes similares
    let attendantWhereClause: any = {
      id: { not: attendantId }
    };

    if (department) {
      attendantWhereClause.setor = department;
    } else {
      // Se não especificou departamento, buscar do mesmo departamento do atendente base
      attendantWhereClause.setor = baseAttendant.setor;
    }

    // Buscar atendentes candidatos
    const candidateAttendants = await prisma.attendant.findMany({
      where: attendantWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        setor: true,
        avatarUrl: true
      }
    });

    // Buscar XP dos candidatos
    let candidateXpWhereClause: any = {
      attendantId: { in: candidateAttendants.map(a => a.id) }
    };
    if (seasonId) {
      candidateXpWhereClause.seasonId = seasonId;
    }

    const candidateXpData = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: candidateXpWhereClause,
      _sum: { xpGained: true }
    });

    // Calcular similaridade e filtrar
    const suggestions = candidateAttendants
      .map(attendant => {
        const xpData = candidateXpData.find(x => x.attendantId === attendant.id);
        const totalXp = xpData?._sum.xpGained || 0;
        const level = LeaderboardService.calculateLevel(totalXp);
        
        // Calcular score de similaridade
        const xpDifference = Math.abs(totalXp - baseXp);
        const levelDifference = Math.abs(level - baseLevel);
        
        // Score baseado na diferença (menor diferença = maior score)
        const xpScore = Math.max(0, 100 - (xpDifference / Math.max(baseXp, 1)) * 100);
        const levelScore = Math.max(0, 100 - levelDifference * 10);
        const similarityScore = (xpScore + levelScore) / 2;
        
        return {
          attendant,
          stats: {
            totalXp,
            level,
            xpDifference,
            levelDifference
          },
          similarityScore
        };
      })
      .filter(item => {
        // Se similarLevel for true, filtrar apenas níveis próximos
        if (similarLevel) {
          return Math.abs(item.stats.level - baseLevel) <= 2;
        }
        return true;
      })
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, limit);

    return NextResponse.json({
      baseAttendant: {
        ...baseAttendant,
        stats: {
          totalXp: baseXp,
          level: baseLevel
        }
      },
      suggestions,
      filters: {
        seasonId,
        department: department || baseAttendant.setor,
        similarLevel
      }
    });
  } catch (error) {
    console.error('Erro ao buscar sugestões de comparação:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}