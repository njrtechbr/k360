import { PrismaClient } from '@prisma/client';
import { 
  GamificationMetrics, 
  SatisfactionMetrics, 
  AlertMetrics, 
  DashboardMetrics,
  ActiveUserMetrics 
} from '@/types/dashboard';
import { logError } from '@/lib/errors';

const prisma = new PrismaClient();

export class RealtimeDashboardService {
  // === MÉTRICAS DE GAMIFICAÇÃO ===

  /**
   * Calcula métricas consolidadas de gamificação
   */
  static async getGamificationMetrics(seasonId?: string): Promise<GamificationMetrics> {
    try {
      // Buscar temporada ativa se não especificada
      let targetSeasonId = seasonId;
      if (!targetSeasonId) {
        const activeSeason = await prisma.gamificationSeason.findFirst({
          where: { active: true }
        });
        targetSeasonId = activeSeason?.id;
      }

      // Calcular XP total da temporada
      const totalXpResult = await prisma.xpEvent.aggregate({
        where: targetSeasonId ? { seasonId: targetSeasonId } : {},
        _sum: { points: true }
      });
      const totalXp = totalXpResult._sum.points || 0;

      // Buscar usuários ativos (com atividade nos últimos 7 dias)
      const activeUsersMetrics = await this.getActiveUsers(168); // 7 dias * 24 horas
      const activeUsers = activeUsersMetrics.count;

      // Calcular ranking top 10
      const topRanking = await this.calculateTopRanking(targetSeasonId, 10);

      // Buscar conquistas recentes (últimas 10)
      const recentAchievements = await this.getRecentAchievements(10);

      // Calcular tendência de XP dos últimos 7 dias
      const xpTrend = await this.calculateXpTrend(targetSeasonId, 7);

      return {
        totalXp,
        activeUsers,
        topRanking,
        recentAchievements,
        xpTrend
      };
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getGamificationMetrics');
      throw new Error('Falha ao buscar métricas de gamificação');
    }
  }

  /**
   * Calcula usuários ativos baseado em horas de atividade
   */
  static async getActiveUsers(hours: number = 24): Promise<ActiveUserMetrics> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hours);

      // Buscar atendentes com atividade recente (avaliações ou eventos XP)
      const activeAttendants = await prisma.attendant.findMany({
        where: {
          OR: [
            {
              evaluations: {
                some: {
                  data: { gte: cutoffDate }
                }
              }
            },
            {
              xpGrants: {
                some: {
                  grantedAt: { gte: cutoffDate }
                }
              }
            }
          ]
        },
        select: {
          id: true,
          name: true,
          evaluations: {
            where: { data: { gte: cutoffDate } },
            orderBy: { data: 'desc' },
            take: 1,
            select: { data: true }
          },
          xpGrants: {
            where: { grantedAt: { gte: cutoffDate } },
            orderBy: { grantedAt: 'desc' },
            take: 1,
            select: { grantedAt: true }
          }
        }
      });

      // Calcular XP atual de cada atendente ativo
      const users = await Promise.all(
        activeAttendants.map(async (attendant) => {
          const xpResult = await prisma.xpEvent.aggregate({
            where: { attendantId: attendant.id },
            _sum: { points: true }
          });

          // Determinar última atividade
          const lastEvaluation = attendant.evaluations[0]?.data;
          const lastXpGrant = attendant.xpGrants[0]?.grantedAt;
          
          let lastActivity = lastEvaluation;
          if (lastXpGrant && (!lastActivity || lastXpGrant > lastActivity)) {
            lastActivity = lastXpGrant;
          }

          return {
            attendantId: attendant.id,
            name: attendant.name,
            lastActivity: lastActivity || new Date(),
            currentXp: xpResult._sum.points || 0
          };
        })
      );

      return {
        count: users.length,
        users: users.sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      };
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getActiveUsers');
      throw new Error('Falha ao buscar usuários ativos');
    }
  }

  /**
   * Calcula ranking dos top atendentes
   */
  static async calculateTopRanking(
    seasonId?: string, 
    limit: number = 10
  ): Promise<GamificationMetrics['topRanking']> {
    try {
      const where: any = {};
      if (seasonId) {
        where.seasonId = seasonId;
      }

      // Agrupar XP por atendente
      const xpByAttendant = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        where,
        _sum: { points: true },
        orderBy: { _sum: { points: 'desc' } },
        take: limit
      });

      // Buscar dados dos atendentes
      const attendantIds = xpByAttendant.map(x => x.attendantId);
      const attendants = await prisma.attendant.findMany({
        where: { id: { in: attendantIds } },
        select: {
          id: true,
          name: true,
          avatarUrl: true
        }
      });

      const attendantMap = new Map(attendants.map(a => [a.id, a]));

      // Montar ranking
      return xpByAttendant.map((item, index) => {
        const attendant = attendantMap.get(item.attendantId);
        return {
          attendantId: item.attendantId,
          name: attendant?.name || 'Desconhecido',
          totalXp: item._sum.points || 0,
          position: index + 1,
          avatarUrl: attendant?.avatarUrl
        };
      });
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.calculateTopRanking');
      return [];
    }
  }

  /**
   * Busca conquistas desbloqueadas recentemente
   */
  static async getRecentAchievements(limit: number = 10): Promise<GamificationMetrics['recentAchievements']> {
    try {
      const recentUnlocked = await prisma.unlockedAchievement.findMany({
        take: limit,
        orderBy: { unlockedAt: 'desc' },
        include: {
          attendant: {
            select: { name: true }
          }
        }
      });

      // Buscar configurações das conquistas
      const achievementIds = recentUnlocked.map(u => u.achievementId);
      const achievements = await prisma.achievementConfig.findMany({
        where: { id: { in: achievementIds } },
        select: {
          id: true,
          title: true,
          icon: true,
          color: true
        }
      });

      const achievementMap = new Map(achievements.map(a => [a.id, a]));

      return recentUnlocked.map(unlocked => {
        const config = achievementMap.get(unlocked.achievementId);
        return {
          id: unlocked.id,
          title: config?.title || 'Conquista Desconhecida',
          attendantName: unlocked.attendant.name,
          unlockedAt: unlocked.unlockedAt,
          icon: config?.icon || 'trophy',
          color: config?.color || '#FFD700'
        };
      });
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getRecentAchievements');
      return [];
    }
  }

  /**
   * Calcula tendência de XP dos últimos N dias
   */
  static async calculateXpTrend(
    seasonId?: string, 
    days: number = 7
  ): Promise<GamificationMetrics['xpTrend']> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const where: any = {
        date: {
          gte: startDate,
          lte: endDate
        }
      };
      
      if (seasonId) {
        where.seasonId = seasonId;
      }

      // Buscar eventos XP agrupados por data
      const xpByDate = await prisma.xpEvent.groupBy({
        by: ['date'],
        where,
        _sum: { points: true },
        orderBy: { date: 'asc' }
      });

      // Criar array com todos os dias (preenchendo gaps com 0)
      const trend: GamificationMetrics['xpTrend'] = [];
      let runningTotal = 0;

      for (let i = 0; i < days; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        // Buscar XP do dia
        const dayXp = xpByDate.find(item => {
          const itemDate = new Date(item.date);
          return itemDate.toDateString() === currentDate.toDateString();
        });

        const dailyXp = dayXp?._sum.points || 0;
        runningTotal += dailyXp;

        trend.push({
          date: new Date(currentDate),
          totalXp: runningTotal
        });
      }

      return trend;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.calculateXpTrend');
      return [];
    }
  }

  // === MÉTRICAS DE SATISFAÇÃO ===

  /**
   * Calcula métricas consolidadas de satisfação
   */
  static async getSatisfactionMetrics(period: '24h' | '7d' | '30d' = '24h'): Promise<SatisfactionMetrics> {
    try {
      // Calcular médias de satisfação
      const averageRating = await this.calculateAverageRating();
      const averageRating24h = await this.calculateAverageRating('24h');

      // Contar avaliações por período
      const totalEvaluations = await this.countEvaluationsByPeriod();

      // Calcular distribuição de notas
      const ratingDistribution = await this.calculateRatingDistribution();

      // Contar alertas de satisfação baixa
      const lowRatingAlerts = await this.countLowRatingAlerts();

      // Calcular tendência de satisfação
      const trend = await this.calculateSatisfactionTrend(period);

      return {
        averageRating,
        averageRating24h,
        totalEvaluations,
        ratingDistribution,
        lowRatingAlerts,
        trend
      };
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getSatisfactionMetrics');
      throw new Error('Falha ao buscar métricas de satisfação');
    }
  }

  /**
   * Calcula média de satisfação geral ou por período
   */
  static async calculateAverageRating(period?: '24h' | '7d' | '30d'): Promise<number> {
    try {
      const where: any = {};
      
      if (period) {
        const cutoffDate = new Date();
        switch (period) {
          case '24h':
            cutoffDate.setHours(cutoffDate.getHours() - 24);
            break;
          case '7d':
            cutoffDate.setDate(cutoffDate.getDate() - 7);
            break;
          case '30d':
            cutoffDate.setDate(cutoffDate.getDate() - 30);
            break;
        }
        where.data = { gte: cutoffDate };
      }

      const result = await prisma.evaluation.aggregate({
        where,
        _avg: { nota: true }
      });

      return Number((result._avg.nota || 0).toFixed(2));
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.calculateAverageRating');
      return 0;
    }
  }

  /**
   * Conta avaliações por diferentes períodos
   */
  static async countEvaluationsByPeriod(): Promise<SatisfactionMetrics['totalEvaluations']> {
    try {
      const now = new Date();
      
      // Início do dia atual
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      
      // Início da semana (domingo)
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      
      // Início do mês
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Contar avaliações
      const [todayCount, weekCount, monthCount] = await Promise.all([
        prisma.evaluation.count({
          where: { data: { gte: startOfToday } }
        }),
        prisma.evaluation.count({
          where: { data: { gte: startOfWeek } }
        }),
        prisma.evaluation.count({
          where: { data: { gte: startOfMonth } }
        })
      ]);

      return {
        today: todayCount,
        week: weekCount,
        month: monthCount
      };
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.countEvaluationsByPeriod');
      return { today: 0, week: 0, month: 0 };
    }
  }

  /**
   * Calcula distribuição de notas (1-5)
   */
  static async calculateRatingDistribution(): Promise<SatisfactionMetrics['ratingDistribution']> {
    try {
      const distribution = await prisma.evaluation.groupBy({
        by: ['nota'],
        _count: { nota: true }
      });

      const result = {
        rating1: 0,
        rating2: 0,
        rating3: 0,
        rating4: 0,
        rating5: 0
      };

      distribution.forEach(item => {
        switch (item.nota) {
          case 1:
            result.rating1 = item._count.nota;
            break;
          case 2:
            result.rating2 = item._count.nota;
            break;
          case 3:
            result.rating3 = item._count.nota;
            break;
          case 4:
            result.rating4 = item._count.nota;
            break;
          case 5:
            result.rating5 = item._count.nota;
            break;
        }
      });

      return result;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.calculateRatingDistribution');
      return { rating1: 0, rating2: 0, rating3: 0, rating4: 0, rating5: 0 };
    }
  }

  /**
   * Conta alertas de satisfação baixa (notas 1-2 nas últimas 24h)
   */
  static async countLowRatingAlerts(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const count = await prisma.evaluation.count({
        where: {
          nota: { in: [1, 2] },
          data: { gte: cutoffDate }
        }
      });

      return count;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.countLowRatingAlerts');
      return 0;
    }
  }

  /**
   * Calcula tendência de satisfação ao longo do tempo
   */
  static async calculateSatisfactionTrend(period: '24h' | '7d' | '30d'): Promise<SatisfactionMetrics['trend']> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      let groupByFormat: string;
      let intervals: number;

      switch (period) {
        case '24h':
          startDate.setHours(startDate.getHours() - 24);
          intervals = 24; // Por hora
          groupByFormat = 'hour';
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          intervals = 7; // Por dia
          groupByFormat = 'day';
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          intervals = 30; // Por dia
          groupByFormat = 'day';
          break;
      }

      // Buscar avaliações no período
      const evaluations = await prisma.evaluation.findMany({
        where: {
          data: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          nota: true,
          data: true
        },
        orderBy: { data: 'asc' }
      });

      // Agrupar por intervalo de tempo
      const trend: SatisfactionMetrics['trend'] = [];
      
      for (let i = 0; i < intervals; i++) {
        const intervalStart = new Date(startDate);
        const intervalEnd = new Date(startDate);

        if (groupByFormat === 'hour') {
          intervalStart.setHours(startDate.getHours() + i);
          intervalEnd.setHours(startDate.getHours() + i + 1);
        } else {
          intervalStart.setDate(startDate.getDate() + i);
          intervalEnd.setDate(startDate.getDate() + i + 1);
        }

        // Filtrar avaliações do intervalo
        const intervalEvaluations = evaluations.filter(evaluation => 
          evaluation.data >= intervalStart && evaluation.data < intervalEnd
        );

        // Calcular média do intervalo
        let averageRating = 0;
        if (intervalEvaluations.length > 0) {
          const sum = intervalEvaluations.reduce((acc, evaluation) => acc + evaluation.nota, 0);
          averageRating = Number((sum / intervalEvaluations.length).toFixed(2));
        }

        trend.push({
          date: new Date(intervalStart),
          averageRating,
          evaluationCount: intervalEvaluations.length
        });
      }

      return trend;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.calculateSatisfactionTrend');
      return [];
    }
  } 
 // === SISTEMA DE ALERTAS E NOTIFICAÇÕES ===

  /**
   * Calcula métricas de alertas e notificações
   */
  static async getAlertMetrics(thresholds?: {
    lowSatisfactionThreshold?: number;
    inactivityHours?: number;
  }): Promise<AlertMetrics> {
    try {
      const defaultThresholds = {
        lowSatisfactionThreshold: 3.0,
        inactivityHours: 72,
        ...thresholds
      };

      // Contar alertas de satisfação baixa
      const lowSatisfactionCount = await this.detectLowSatisfactionAlerts(
        defaultThresholds.lowSatisfactionThreshold
      );

      // Contar usuários inativos
      const inactiveUsersCount = await this.detectInactiveUsers(
        defaultThresholds.inactivityHours
      );

      // Buscar alertas do sistema
      const systemAlerts = await this.getSystemAlerts();

      return {
        lowSatisfactionCount,
        inactiveUsersCount,
        systemAlerts
      };
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getAlertMetrics');
      throw new Error('Falha ao buscar métricas de alertas');
    }
  }

  /**
   * Detecta quedas na satisfação baseado em threshold
   */
  static async detectLowSatisfactionAlerts(threshold: number = 3.0): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      // Buscar atendentes com média baixa nas últimas 24h
      const attendantsWithLowRating = await prisma.attendant.findMany({
        where: {
          evaluations: {
            some: {
              data: { gte: cutoffDate }
            }
          }
        },
        include: {
          evaluations: {
            where: {
              data: { gte: cutoffDate }
            },
            select: { nota: true }
          }
        }
      });

      let alertCount = 0;

      for (const attendant of attendantsWithLowRating) {
        if (attendant.evaluations.length === 0) continue;

        const average = attendant.evaluations.reduce((sum, evaluation) => sum + evaluation.nota, 0) / attendant.evaluations.length;
        
        if (average < threshold) {
          alertCount++;
        }
      }

      return alertCount;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.detectLowSatisfactionAlerts');
      return 0;
    }
  }

  /**
   * Detecta usuários inativos baseado em horas de inatividade
   */
  static async detectInactiveUsers(inactivityHours: number = 72): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - inactivityHours);

      // Contar atendentes sem atividade recente
      const inactiveCount = await prisma.attendant.count({
        where: {
          AND: [
            {
              evaluations: {
                none: {
                  data: { gte: cutoffDate }
                }
              }
            },
            {
              xpGrants: {
                none: {
                  grantedAt: { gte: cutoffDate }
                }
              }
            }
          ]
        }
      });

      return inactiveCount;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.detectInactiveUsers');
      return 0;
    }
  }

  /**
   * Busca alertas do sistema (implementação básica)
   */
  static async getSystemAlerts(): Promise<AlertMetrics['systemAlerts']> {
    try {
      const alerts: AlertMetrics['systemAlerts'] = [];

      // Verificar se há temporada ativa
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { active: true }
      });

      if (!activeSeason) {
        alerts.push({
          id: 'no-active-season',
          type: 'system',
          message: 'Nenhuma temporada de gamificação ativa encontrada',
          severity: 'medium',
          createdAt: new Date(),
          resolved: false
        });
      }

      // Verificar se há avaliações recentes (últimas 24h)
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - 24);

      const recentEvaluations = await prisma.evaluation.count({
        where: { data: { gte: cutoffDate } }
      });

      if (recentEvaluations === 0) {
        alerts.push({
          id: 'no-recent-evaluations',
          type: 'system',
          message: 'Nenhuma avaliação registrada nas últimas 24 horas',
          severity: 'low',
          createdAt: new Date(),
          resolved: false
        });
      }

      // Verificar média de satisfação muito baixa (< 2.0)
      const averageRating = await this.calculateAverageRating('24h');
      if (averageRating > 0 && averageRating < 2.0) {
        alerts.push({
          id: 'very-low-satisfaction',
          type: 'satisfaction',
          message: `Média de satisfação crítica: ${averageRating.toFixed(2)}`,
          severity: 'high',
          createdAt: new Date(),
          resolved: false
        });
      }

      return alerts;
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getSystemAlerts');
      return [];
    }
  }

  /**
   * Configuração de thresholds personalizáveis
   */
  static async updateAlertThresholds(userId: string, thresholds: {
    lowSatisfactionThreshold?: number;
    inactivityHours?: number;
  }): Promise<void> {
    try {
      // Por enquanto, apenas validar os valores
      // Em uma implementação futura, isso seria salvo no banco de dados
      if (thresholds.lowSatisfactionThreshold && 
          (thresholds.lowSatisfactionThreshold < 1 || thresholds.lowSatisfactionThreshold > 5)) {
        throw new Error('Threshold de satisfação deve estar entre 1 e 5');
      }

      if (thresholds.inactivityHours && thresholds.inactivityHours < 1) {
        throw new Error('Horas de inatividade deve ser maior que 0');
      }

      // TODO: Implementar persistência das configurações por usuário
      console.log(`Thresholds atualizados para usuário ${userId}:`, thresholds);
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.updateAlertThresholds');
      throw error;
    }
  }

  // === MÉTODO CONSOLIDADO ===

  /**
   * Busca todas as métricas do dashboard de uma vez
   */
  static async getAllDashboardMetrics(options?: {
    seasonId?: string;
    satisfactionPeriod?: '24h' | '7d' | '30d';
    alertThresholds?: {
      lowSatisfactionThreshold?: number;
      inactivityHours?: number;
    };
  }): Promise<DashboardMetrics> {
    try {
      const [gamification, satisfaction, alerts] = await Promise.all([
        this.getGamificationMetrics(options?.seasonId),
        this.getSatisfactionMetrics(options?.satisfactionPeriod),
        this.getAlertMetrics(options?.alertThresholds)
      ]);

      return {
        gamification,
        satisfaction,
        alerts,
        lastUpdated: new Date()
      };
    } catch (error) {
      logError(error as Error, 'RealtimeDashboardService.getAllDashboardMetrics');
      throw new Error('Falha ao buscar métricas do dashboard');
    }
  }
}