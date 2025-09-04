import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { LeaderboardService } from '@/services/gamification';

const prisma = new PrismaClient();

// GET /api/gamification/leaderboard/insights
// Buscar insights e análises do leaderboard
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const department = searchParams.get('department');
    const period = searchParams.get('period') || 'current'; // current, previous, all
    const includeComparisons = searchParams.get('includeComparisons') === 'true';
    const includeTrends = searchParams.get('includeTrends') === 'true';
    const includeRecommendations = searchParams.get('includeRecommendations') === 'true';

    let targetSeasonId = seasonId;

    // Se não especificou temporada, buscar baseado no período
    if (!targetSeasonId) {
      let targetSeason;
      
      if (period === 'current') {
        targetSeason = await prisma.gamificationSeason.findFirst({
          where: { isActive: true }
        });
      } else if (period === 'previous') {
        const currentSeason = await prisma.gamificationSeason.findFirst({
          where: { isActive: true }
        });
        
        if (currentSeason) {
          targetSeason = await prisma.gamificationSeason.findFirst({
            where: {
              endDate: { lt: currentSeason.startDate }
            },
            orderBy: { endDate: 'desc' }
          });
        }
      }
      
      targetSeasonId = targetSeason?.id;
    }

    if (!targetSeasonId && period !== 'all') {
      return NextResponse.json(
        { error: 'Nenhuma temporada encontrada para o período especificado' },
        { status: 404 }
      );
    }

    // Construir filtros base
    let xpWhereClause: any = {};
    if (targetSeasonId) {
      const season = await prisma.gamificationSeason.findUnique({
        where: { id: targetSeasonId }
      });
      if (season) {
        xpWhereClause.date = {
          gte: season.startDate,
          lte: season.endDate
        };
      }
    }

    // Buscar dados básicos do leaderboard
    const xpData = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: xpWhereClause,
      _sum: { points: true },
      _count: true,
      _avg: { points: true }
    });

    // Buscar informações dos atendentes
    const attendantIds = xpData.map(x => x.attendantId);
    let attendantsWhereClause: any = {
      id: { in: attendantIds }
    };
    
    if (department) {
      attendantsWhereClause.department = department;
    }

    const attendants = await prisma.user.findMany({
      where: attendantsWhereClause,
      select: {
        id: true,
        name: true,
        department: true,
        createdAt: true
      }
    });

    // Calcular insights básicos
    const leaderboardData = xpData
      .map(xp => {
        const attendant = attendants.find(a => a.id === xp.attendantId);
        if (!attendant) return null;
        
        return {
          attendantId: attendant.id,
          attendantName: attendant.name,
          department: attendant.department,
          totalXp: xp._sum.points || 0,
          eventCount: xp._count,
          averageXp: xp._avg.points || 0,
          level: LeaderboardService.calculateLevel(xp._sum.points || 0)
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalXp - a!.totalXp);

    // Insights gerais
    const totalXps = leaderboardData.map(l => l!.totalXp);
    const totalEvents = leaderboardData.map(l => l!.eventCount);
    
    const generalInsights = {
      totalParticipants: leaderboardData.length,
      totalXpAwarded: totalXps.reduce((a, b) => a + b, 0),
      totalEvents: totalEvents.reduce((a, b) => a + b, 0),
      averageXpPerParticipant: totalXps.length > 0 ? totalXps.reduce((a, b) => a + b, 0) / totalXps.length : 0,
      medianXp: totalXps.length > 0 ? totalXps.sort((a, b) => a - b)[Math.floor(totalXps.length / 2)] : 0,
      topPerformerXp: Math.max(...totalXps, 0),
      xpDistribution: {
        q1: totalXps.length > 0 ? totalXps.sort((a, b) => a - b)[Math.floor(totalXps.length * 0.25)] : 0,
        q2: totalXps.length > 0 ? totalXps.sort((a, b) => a - b)[Math.floor(totalXps.length * 0.5)] : 0,
        q3: totalXps.length > 0 ? totalXps.sort((a, b) => a - b)[Math.floor(totalXps.length * 0.75)] : 0
      }
    };

    // Insights por departamento
    const departmentInsights = leaderboardData.reduce((acc, item) => {
      if (!item || !item.department) return acc;
      
      if (!acc[item.department]) {
        acc[item.department] = {
          department: item.department,
          participantCount: 0,
          totalXp: 0,
          averageXp: 0,
          topPerformer: null,
          levelDistribution: {} as Record<number, number>
        };
      }
      
      acc[item.department].participantCount += 1;
      acc[item.department].totalXp += item.totalXp;
      
      // Atualizar top performer
      if (!acc[item.department].topPerformer || 
          item.totalXp > acc[item.department].topPerformer.totalXp) {
        acc[item.department].topPerformer = {
          attendantId: item.attendantId,
          attendantName: item.attendantName,
          totalXp: item.totalXp,
          level: item.level
        };
      }
      
      // Distribuição de níveis
      if (!acc[item.department].levelDistribution[item.level]) {
        acc[item.department].levelDistribution[item.level] = 0;
      }
      acc[item.department].levelDistribution[item.level] += 1;
      
      return acc;
    }, {} as Record<string, any>);

    // Calcular médias por departamento
    Object.values(departmentInsights).forEach((dept: any) => {
      dept.averageXp = dept.participantCount > 0 ? dept.totalXp / dept.participantCount : 0;
    });

    // Insights de performance
    const performanceInsights = {
      highPerformers: leaderboardData.slice(0, Math.ceil(leaderboardData.length * 0.1)), // Top 10%
      lowPerformers: leaderboardData.slice(-Math.ceil(leaderboardData.length * 0.1)), // Bottom 10%
      averagePerformers: leaderboardData.slice(
        Math.ceil(leaderboardData.length * 0.4),
        Math.ceil(leaderboardData.length * 0.6)
      ), // Middle 20%
      performanceGaps: {
        topToBottom: Math.max(...totalXps, 0) - Math.min(...totalXps, 0),
        topToAverage: Math.max(...totalXps, 0) - generalInsights.averageXpPerParticipant,
        averageToBottom: generalInsights.averageXpPerParticipant - Math.min(...totalXps, 0)
      }
    };

    let result: any = {
      period,
      seasonId: targetSeasonId,
      department: department || 'all',
      generalInsights,
      departmentInsights: Object.values(departmentInsights),
      performanceInsights
    };

    // Incluir comparações se solicitado
    if (includeComparisons && period === 'current') {
      // Buscar temporada anterior para comparação
      const currentSeason = await prisma.gamificationSeason.findUnique({
        where: { id: targetSeasonId! }
      });
      
      if (currentSeason) {
        const previousSeason = await prisma.gamificationSeason.findFirst({
          where: {
            endDate: { lt: currentSeason.startDate }
          },
          orderBy: { endDate: 'desc' }
        });
        
        if (previousSeason) {
          // Buscar dados da temporada anterior
          const previousXpData = await prisma.xpEvent.groupBy({
            by: ['attendantId'],
            where: { seasonId: previousSeason.id },
            _sum: { points: true },
            _count: true
          });
          
          const previousTotalXp = previousXpData.reduce((sum, x) => sum + (x._sum.points || 0), 0);
          const previousParticipants = previousXpData.length;
          const previousAverageXp = previousParticipants > 0 ? previousTotalXp / previousParticipants : 0;
          
          result.comparisons = {
            previousSeason: {
              id: previousSeason.id,
              name: previousSeason.name,
              totalXp: previousTotalXp,
              participants: previousParticipants,
              averageXp: previousAverageXp
            },
            changes: {
              totalXpChange: generalInsights.totalXpAwarded - previousTotalXp,
              participantChange: generalInsights.totalParticipants - previousParticipants,
              averageXpChange: generalInsights.averageXpPerParticipant - previousAverageXp,
              totalXpChangePercent: previousTotalXp > 0 
                ? ((generalInsights.totalXpAwarded - previousTotalXp) / previousTotalXp) * 100 
                : 0,
              participantChangePercent: previousParticipants > 0 
                ? ((generalInsights.totalParticipants - previousParticipants) / previousParticipants) * 100 
                : 0
            }
          };
        }
      }
    }

    // Incluir tendências se solicitado
    if (includeTrends) {
      // Buscar dados de XP por semana nas últimas 8 semanas
      const weeklyData = await prisma.$queryRaw`
        SELECT 
          DATE_TRUNC('week', "createdAt") as week,
          SUM("xpGained") as totalXp,
          COUNT(*) as eventCount,
          COUNT(DISTINCT "attendantId") as uniqueParticipants
        FROM "XpEvent"
        WHERE "createdAt" >= NOW() - INTERVAL '8 weeks'
        ${targetSeasonId ? prisma.$queryRaw`AND "seasonId" = ${targetSeasonId}` : prisma.$queryRaw``}
        ${department ? prisma.$queryRaw`AND "attendantId" IN (
          SELECT id FROM "User" WHERE department = ${department}
        )` : prisma.$queryRaw``}
        GROUP BY DATE_TRUNC('week', "createdAt")
        ORDER BY week ASC
      `;

      result.trends = {
        weekly: weeklyData
      };
    }

    // Incluir recomendações se solicitado
    if (includeRecommendations) {
      const recommendations = [];
      
      // Recomendação baseada na distribuição de performance
      const performanceGap = performanceInsights.performanceGaps.topToBottom;
      if (performanceGap > generalInsights.averageXpPerParticipant * 3) {
        recommendations.push({
          type: 'performance_gap',
          priority: 'high',
          title: 'Grande disparidade de performance detectada',
          description: `A diferença entre o melhor e pior performer é de ${performanceGap} XP, muito acima da média. Considere programas de mentoria ou treinamento adicional.`,
          suggestedActions: [
            'Implementar programa de mentoria',
            'Oferecer treinamentos específicos para baixos performers',
            'Revisar critérios de distribuição de XP'
          ]
        });
      }
      
      // Recomendação baseada na participação por departamento
      const deptParticipation = Object.values(departmentInsights) as any[];
      const avgParticipation = deptParticipation.reduce((sum, d) => sum + d.participantCount, 0) / deptParticipation.length;
      
      const lowParticipationDepts = deptParticipation.filter(d => d.participantCount < avgParticipation * 0.7);
      if (lowParticipationDepts.length > 0) {
        recommendations.push({
          type: 'low_participation',
          priority: 'medium',
          title: 'Baixa participação em alguns departamentos',
          description: `Os departamentos ${lowParticipationDepts.map(d => d.department).join(', ')} têm participação abaixo da média.`,
          suggestedActions: [
            'Investigar barreiras à participação',
            'Criar incentivos específicos por departamento',
            'Melhorar comunicação sobre o programa de gamificação'
          ]
        });
      }
      
      // Recomendação baseada na distribuição de níveis
      const levelCounts = leaderboardData.reduce((acc, item) => {
        if (!item) return acc;
        acc[item.level] = (acc[item.level] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      const maxLevel = Math.max(...Object.keys(levelCounts).map(Number));
      const highLevelCount = Object.entries(levelCounts)
        .filter(([level]) => Number(level) >= maxLevel - 1)
        .reduce((sum, [, count]) => sum + count, 0);
      
      if (highLevelCount > leaderboardData.length * 0.3) {
        recommendations.push({
          type: 'level_ceiling',
          priority: 'medium',
          title: 'Muitos participantes em níveis altos',
          description: `${highLevelCount} participantes estão nos níveis mais altos. Considere adicionar novos níveis ou desafios.`,
          suggestedActions: [
            'Adicionar novos níveis de progressão',
            'Criar achievements mais desafiadores',
            'Implementar sistema de prestígio'
          ]
        });
      }
      
      result.recommendations = recommendations;
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar insights do leaderboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}