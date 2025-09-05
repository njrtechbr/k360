import { PrismaClient } from '@prisma/client';
import { subDays, subMonths, startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const prisma = new PrismaClient();

export interface DashboardStats {
  totalEvaluations: number;
  totalAttendants: number;
  averageRating: number;
  totalXp: number;
  activeSeasons: number;
  unlockedAchievements: number;
}

export interface EvaluationTrend {
  date: string;
  count: number;
  averageRating: number;
}

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface TopPerformers {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  evaluationCount: number;
  averageRating: number;
  position: number;
}

export interface GamificationOverview {
  totalXpDistributed: number;
  activeAchievements: number;
  totalUnlocked: number;
  topAchievement: {
    id: string;
    title: string;
    unlockedCount: number;
  } | null;
}

export class DashboardService {
  // Estatísticas gerais do dashboard
  static async getGeneralStats(): Promise<DashboardStats> {
    try {
      const [
        totalEvaluations,
        totalAttendants,
        averageRatingResult,
        totalXpResult,
        activeSeasons,
        unlockedAchievements
      ] = await Promise.all([
        prisma.evaluation.count(),
        prisma.attendant.count(),
        prisma.evaluation.aggregate({
          _avg: { nota: true }
        }),
        prisma.xpEvent.aggregate({
          _sum: { points: true }
        }),
        prisma.gamificationSeason.count({
          where: { active: true }
        }),
        prisma.unlockedAchievement.count()
      ]);

      return {
        totalEvaluations,
        totalAttendants,
        averageRating: averageRatingResult._avg.nota || 0,
        totalXp: totalXpResult._sum.points || 0,
        activeSeasons,
        unlockedAchievements
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas gerais:', error);
      throw new Error('Falha ao buscar estatísticas gerais');
    }
  }

  // Tendência de avaliações nos últimos 30 dias
  static async getEvaluationTrend(days: number = 30): Promise<EvaluationTrend[]> {
    try {
      const startDate = subDays(new Date(), days);
      
      const evaluations = await prisma.evaluation.findMany({
        where: {
          data: {
            gte: startDate
          }
        },
        select: {
          data: true,
          nota: true
        }
      });

      // Agrupar por data
      const groupedByDate = evaluations.reduce((acc, evaluation) => {
        const dateKey = format(evaluation.data, 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = { ratings: [], count: 0 };
        }
        acc[dateKey].ratings.push(evaluation.nota);
        acc[dateKey].count++;
        return acc;
      }, {} as Record<string, { ratings: number[], count: number }>);

      // Converter para array e calcular médias
      const trend: EvaluationTrend[] = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i);
        const dateKey = format(date, 'yyyy-MM-dd');
        const data = groupedByDate[dateKey];
        
        trend.push({
          date: format(date, 'dd/MM', { locale: ptBR }),
          count: data?.count || 0,
          averageRating: data ? 
            data.ratings.reduce((sum, rating) => sum + rating, 0) / data.ratings.length : 0
        });
      }

      return trend;
    } catch (error) {
      console.error('Erro ao buscar tendência de avaliações:', error);
      throw new Error('Falha ao buscar tendência de avaliações');
    }
  }

  // Distribuição de notas
  static async getRatingDistribution(): Promise<RatingDistribution[]> {
    try {
      const ratings = await prisma.evaluation.groupBy({
        by: ['nota'],
        _count: {
          nota: true
        },
        orderBy: {
          nota: 'asc'
        }
      });

      const totalEvaluations = ratings.reduce((sum, rating) => sum + rating._count.nota, 0);

      return ratings.map(rating => ({
        rating: rating.nota,
        count: rating._count.nota,
        percentage: totalEvaluations > 0 ? (rating._count.nota / totalEvaluations) * 100 : 0
      }));
    } catch (error) {
      console.error('Erro ao buscar distribuição de notas:', error);
      throw new Error('Falha ao buscar distribuição de notas');
    }
  }

  // Top performers (ranking de atendentes)
  static async getTopPerformers(limit: number = 10): Promise<TopPerformers[]> {
    try {
      // Buscar XP por atendente
      const xpByAttendant = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        _sum: {
          points: true
        },
        orderBy: {
          _sum: {
            points: 'desc'
          }
        },
        take: limit
      });

      // Buscar dados dos atendentes e suas avaliações
      const attendantIds = xpByAttendant.map(x => x.attendantId);
      
      const [attendants, evaluationStats] = await Promise.all([
        prisma.attendant.findMany({
          where: {
            id: { in: attendantIds }
          },
          select: {
            id: true,
            name: true
          }
        }),
        prisma.evaluation.groupBy({
          by: ['attendantId'],
          where: {
            attendantId: { in: attendantIds }
          },
          _count: {
            id: true
          },
          _avg: {
            nota: true
          }
        })
      ]);

      const attendantMap = new Map(attendants.map(a => [a.id, a.name]));
      const evaluationMap = new Map(evaluationStats.map(e => [
        e.attendantId, 
        { count: e._count.id, average: e._avg.nota || 0 }
      ]));

      return xpByAttendant.map((item, index) => ({
        attendantId: item.attendantId,
        attendantName: attendantMap.get(item.attendantId) || 'Desconhecido',
        totalXp: item._sum.points || 0,
        evaluationCount: evaluationMap.get(item.attendantId)?.count || 0,
        averageRating: evaluationMap.get(item.attendantId)?.average || 0,
        position: index + 1
      }));
    } catch (error) {
      console.error('Erro ao buscar top performers:', error);
      throw new Error('Falha ao buscar top performers');
    }
  }

  // Visão geral da gamificação
  static async getGamificationOverview(): Promise<GamificationOverview> {
    try {
      const [
        totalXpResult,
        activeAchievements,
        totalUnlocked,
        achievementStats
      ] = await Promise.all([
        prisma.xpEvent.aggregate({
          _sum: { points: true }
        }),
        prisma.achievementConfig.count({
          where: { active: true }
        }),
        prisma.unlockedAchievement.count(),
        prisma.unlockedAchievement.groupBy({
          by: ['achievementId'],
          _count: {
            achievementId: true
          },
          orderBy: {
            _count: {
              achievementId: 'desc'
            }
          },
          take: 1
        })
      ]);

      let topAchievement = null;
      if (achievementStats.length > 0) {
        const topAchievementConfig = await prisma.achievementConfig.findUnique({
          where: { id: achievementStats[0].achievementId },
          select: { id: true, title: true }
        });

        if (topAchievementConfig) {
          topAchievement = {
            id: topAchievementConfig.id,
            title: topAchievementConfig.title,
            unlockedCount: achievementStats[0]._count.achievementId
          };
        }
      }

      return {
        totalXpDistributed: totalXpResult._sum.points || 0,
        activeAchievements,
        totalUnlocked,
        topAchievement
      };
    } catch (error) {
      console.error('Erro ao buscar visão geral da gamificação:', error);
      throw new Error('Falha ao buscar visão geral da gamificação');
    }
  }

  // Estatísticas mensais de avaliações
  static async getMonthlyEvaluationStats(months: number = 6): Promise<Array<{
    month: string;
    evaluations: number;
    averageRating: number;
    xpGenerated: number;
  }>> {
    try {
      const results = [];
      
      for (let i = months - 1; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        
        const [evaluationStats, xpStats] = await Promise.all([
          prisma.evaluation.aggregate({
            where: {
              data: {
                gte: startDate,
                lte: endDate
              }
            },
            _count: { id: true },
            _avg: { nota: true }
          }),
          prisma.xpEvent.aggregate({
            where: {
              date: {
                gte: startDate,
                lte: endDate
              },
              type: 'evaluation'
            },
            _sum: { points: true }
          })
        ]);

        results.push({
          month: format(date, 'MMM/yy', { locale: ptBR }),
          evaluations: evaluationStats._count.id,
          averageRating: evaluationStats._avg.nota || 0,
          xpGenerated: xpStats._sum.points || 0
        });
      }

      return results;
    } catch (error) {
      console.error('Erro ao buscar estatísticas mensais:', error);
      throw new Error('Falha ao buscar estatísticas mensais');
    }
  }

  // Conquistas mais populares
  static async getPopularAchievements(limit: number = 5): Promise<Array<{
    achievementId: string;
    title: string;
    description: string;
    unlockedCount: number;
    icon: string;
    color: string;
  }>> {
    try {
      const achievementStats = await prisma.unlockedAchievement.groupBy({
        by: ['achievementId'],
        _count: {
          achievementId: true
        },
        orderBy: {
          _count: {
            achievementId: 'desc'
          }
        },
        take: limit
      });

      const achievementIds = achievementStats.map(stat => stat.achievementId);
      const achievements = await prisma.achievementConfig.findMany({
        where: {
          id: { in: achievementIds }
        },
        select: {
          id: true,
          title: true,
          description: true,
          icon: true,
          color: true
        }
      });

      const achievementMap = new Map(achievements.map(a => [a.id, a]));

      return achievementStats.map(stat => {
        const achievement = achievementMap.get(stat.achievementId);
        return {
          achievementId: stat.achievementId,
          title: achievement?.title || 'Conquista Desconhecida',
          description: achievement?.description || '',
          unlockedCount: stat._count.achievementId,
          icon: achievement?.icon || 'trophy',
          color: achievement?.color || '#gold'
        };
      });
    } catch (error) {
      console.error('Erro ao buscar conquistas populares:', error);
      throw new Error('Falha ao buscar conquistas populares');
    }
  }
}