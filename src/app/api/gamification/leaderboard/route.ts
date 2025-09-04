import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { LeaderboardService } from '@/services/gamification';

const prisma = new PrismaClient();

// GET /api/gamification/leaderboard
// Buscar leaderboard com filtros e estatísticas
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get('seasonId');
    const department = searchParams.get('department');
    const period = searchParams.get('period') || 'current'; // current, previous, all
    const limit = parseInt(searchParams.get('limit') || '50');
    const includeStats = searchParams.get('includeStats') === 'true';
    const includeInsights = searchParams.get('includeInsights') === 'true';
    const attendantId = searchParams.get('attendantId'); // Para buscar posição específica

    let targetSeasonId = seasonId;

    // Se não especificou temporada, buscar baseado no período
    if (!targetSeasonId) {
      let targetSeason;
      
      if (period === 'current') {
        targetSeason = await prisma.gamificationSeason.findFirst({
          where: { active: true }
        });
      } else if (period === 'previous') {
        const currentSeason = await prisma.gamificationSeason.findFirst({
          where: { active: true }
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

    // Construir query base para XP
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

    // Buscar dados de XP agrupados por atendente
    const xpData = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: xpWhereClause,
      _sum: { points: true },
      _count: true
    });

    // Buscar informações dos atendentes
    const attendantIds = xpData.map(x => x.attendantId);
    let attendantsWhereClause: any = {
      id: { in: attendantIds }
    };
    
    if (department) {
      attendantsWhereClause.setor = department;
    }

    const attendants = await prisma.attendant.findMany({
      where: attendantsWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        setor: true,
        avatarUrl: true
      }
    });

    // Combinar dados e calcular leaderboard
    const leaderboardData = xpData
      .map(xp => {
        const attendant = attendants.find(a => a.id === xp.attendantId);
        if (!attendant) return null;
        
        return {
          attendant,
          totalXp: xp._sum.points || 0,
          eventCount: xp._count,
          level: LeaderboardService.calculateLevel(xp._sum.points || 0),
          position: 0 // Será calculado após ordenação
        };
      })
      .filter(Boolean)
      .sort((a, b) => b!.totalXp - a!.totalXp)
      .slice(0, limit)
      .map((item, index) => ({
        ...item!,
        position: index + 1
      }));

    let result: any = {
      leaderboard: leaderboardData,
      period,
      seasonId: targetSeasonId,
      department: department || 'all',
      totalParticipants: attendants.length
    };

    // Buscar posição específica de um atendente se solicitado
    if (attendantId) {
      const attendantPosition = await LeaderboardService.getAttendantPosition(
        attendantId,
        targetSeasonId,
        department
      );
      result.attendantPosition = attendantPosition;
    }

    // Incluir estatísticas se solicitado
    if (includeStats) {
      const stats = await LeaderboardService.generateLeaderboardStats(
        leaderboardData.map(l => l.attendant.id),
        targetSeasonId
      );
      
      // Estatísticas por departamento
      const departmentStats = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        where: xpWhereClause,
        _sum: { xpGained: true }
      });

      const attendantsWithDept = await prisma.user.findMany({
        where: { id: { in: departmentStats.map(d => d.attendantId) } },
        select: { id: true, department: true }
      });

      const deptStats = departmentStats.reduce((acc, stat) => {
        const attendant = attendantsWithDept.find(a => a.id === stat.attendantId);
        if (!attendant?.department) return acc;
        
        if (!acc[attendant.department]) {
          acc[attendant.department] = {
            department: attendant.department,
            totalXp: 0,
            participantCount: 0,
            averageXp: 0
          };
        }
        
        acc[attendant.department].totalXp += stat._sum.points || 0;
        acc[attendant.department].participantCount += 1;
        
        return acc;
      }, {} as Record<string, any>);

      // Calcular médias
      Object.values(deptStats).forEach((dept: any) => {
        dept.averageXp = dept.participantCount > 0 
          ? dept.totalXp / dept.participantCount 
          : 0;
      });

      result.stats = {
        ...stats,
        departmentStats: Object.values(deptStats)
      };
    }

    // Incluir insights se solicitado
    if (includeInsights) {
      const insights = await LeaderboardService.generateLeaderboardInsights(
        leaderboardData.map(l => l.attendant.id),
        targetSeasonId
      );
      
      // Buscar atendentes que mais melhoraram
      const mostImproved = await LeaderboardService.findMostImprovedAttendants(
        targetSeasonId,
        5
      );

      result.insights = {
        ...insights,
        mostImproved
      };
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erro ao buscar leaderboard:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

// POST /api/gamification/leaderboard
// Gerar leaderboard personalizado
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      seasonIds,
      departments,
      attendantIds,
      startDate,
      endDate,
      groupBy = 'attendant', // attendant, department, level
      limit = 50
    } = body;

    // Construir filtros
    let whereClause: any = {};
    
    if (seasonIds && seasonIds.length > 0) {
      // Buscar datas das temporadas para filtrar por data
      const seasons = await prisma.gamificationSeason.findMany({
        where: { id: { in: seasonIds } },
        select: { startDate: true, endDate: true }
      });
      
      if (seasons.length > 0) {
        const minStartDate = Math.min(...seasons.map(s => s.startDate.getTime()));
        const maxEndDate = Math.max(...seasons.map(s => s.endDate.getTime()));
        
        whereClause.date = {
          gte: new Date(minStartDate),
          lte: new Date(maxEndDate)
        };
      }
    }
    
    if (attendantIds && attendantIds.length > 0) {
      whereClause.attendantId = { in: attendantIds };
    }
    
    if (startDate) {
      whereClause.date = { 
        ...whereClause.date,
        gte: new Date(startDate) 
      };
    }
    
    if (endDate) {
      whereClause.date = {
        ...whereClause.date,
        lte: new Date(endDate)
      };
    }

    // Buscar dados de XP
    const xpData = await prisma.xpEvent.groupBy({
      by: ['attendantId'],
      where: whereClause,
      _sum: { points: true },
      _count: true,
      _avg: { points: true }
    });

    // Buscar informações dos atendentes
    const attendantIds_filtered = xpData.map(x => x.attendantId);
    let attendantsWhereClause: any = {
      id: { in: attendantIds_filtered }
    };
    
    if (departments && departments.length > 0) {
      attendantsWhereClause.department = { in: departments };
    }

    const attendants = await prisma.user.findMany({
      where: attendantsWhereClause,
      select: {
        id: true,
        name: true,
        email: true,
        department: true,
        avatar: true
      }
    });

    // Processar dados baseado no agrupamento
    let result: any;

    if (groupBy === 'attendant') {
      const leaderboardData = xpData
        .map(xp => {
          const attendant = attendants.find(a => a.id === xp.attendantId);
          if (!attendant) return null;
          
          return {
            attendant,
            totalXp: xp._sum.points || 0,
            eventCount: xp._count,
            averageXp: xp._avg.points || 0,
            level: LeaderboardService.calculateLevel(xp._sum.points || 0)
          };
        })
        .filter(Boolean)
        .sort((a, b) => b!.totalXp - a!.totalXp)
        .slice(0, limit)
        .map((item, index) => ({
          ...item!,
          position: index + 1
        }));

      result = {
        type: 'attendant',
        data: leaderboardData
      };
    } else if (groupBy === 'department') {
      const deptData = xpData.reduce((acc, xp) => {
        const attendant = attendants.find(a => a.id === xp.attendantId);
        if (!attendant?.department) return acc;
        
        if (!acc[attendant.department]) {
          acc[attendant.department] = {
            department: attendant.department,
            totalXp: 0,
            participantCount: 0,
            eventCount: 0,
            averageXpPerParticipant: 0
          };
        }
        
        acc[attendant.department].totalXp += xp._sum.points || 0;
        acc[attendant.department].participantCount += 1;
        acc[attendant.department].eventCount += xp._count;
        
        return acc;
      }, {} as Record<string, any>);

      // Calcular médias e ordenar
      const departmentLeaderboard = Object.values(deptData)
        .map((dept: any) => ({
          ...dept,
          averageXpPerParticipant: dept.participantCount > 0 
            ? dept.totalXp / dept.participantCount 
            : 0
        }))
        .sort((a, b) => b.totalXp - a.totalXp)
        .slice(0, limit)
        .map((item, index) => ({
          ...item,
          position: index + 1
        }));

      result = {
        type: 'department',
        data: departmentLeaderboard
      };
    } else if (groupBy === 'level') {
      const levelData = xpData.reduce((acc, xp) => {
        const level = LeaderboardService.calculateLevel(xp._sum.xpGained || 0);
        
        if (!acc[level]) {
          acc[level] = {
            level,
            participantCount: 0,
            totalXp: 0,
            averageXp: 0
          };
        }
        
        acc[level].participantCount += 1;
        acc[level].totalXp += xp._sum.xpGained || 0;
        
        return acc;
      }, {} as Record<number, any>);

      // Calcular médias e ordenar
      const levelLeaderboard = Object.values(levelData)
        .map((lvl: any) => ({
          ...lvl,
          averageXp: lvl.participantCount > 0 
            ? lvl.totalXp / lvl.participantCount 
            : 0
        }))
        .sort((a, b) => b.level - a.level);

      result = {
        type: 'level',
        data: levelLeaderboard
      };
    }

    return NextResponse.json({
      ...result,
      filters: {
        seasonIds,
        departments,
        attendantIds,
        startDate,
        endDate,
        groupBy
      },
      totalParticipants: attendants.length
    });
  } catch (error) {
    console.error('Erro ao gerar leaderboard personalizado:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}