import type { Evaluation, Attendant } from '@/lib/types';

export interface RatingDistribution {
  rating: number;
  count: number;
  percentage: number;
}

export interface TrendData {
  period: string;
  averageRating: number;
  totalEvaluations: number;
  satisfactionRate: number;
}

export interface AnalyticsData {
  totalEvaluations: number;
  averageRating: number;
  satisfactionRate: number;
  ratingDistribution: RatingDistribution[];
  monthlyTrends: TrendData[];
  topAttendants: {
    attendantId: string;
    attendantName: string;
    averageRating: number;
    totalEvaluations: number;
  }[];
  recentEvaluations: Evaluation[];
}

export class AnalyticsService {
  /**
   * Calcula a distribuição de notas
   */
  static calculateRatingDistribution(evaluations: Evaluation[]): RatingDistribution[] {
    const distribution: Record<number, number> = {};
    const total = evaluations.length;

    // Inicializar todas as notas de 1 a 5
    for (let i = 1; i <= 5; i++) {
      distribution[i] = 0;
    }

    // Contar avaliações por nota
    evaluations.forEach(evaluation => {
      distribution[evaluation.nota] = (distribution[evaluation.nota] || 0) + 1;
    });

    // Converter para array com percentuais
    return Object.entries(distribution).map(([rating, count]) => ({
      rating: parseInt(rating),
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }));
  }

  /**
   * Calcula tendências mensais
   */
  static calculateMonthlyTrends(
    evaluations: Evaluation[],
    months: number = 12
  ): TrendData[] {
    const trends: TrendData[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      
      const monthEvaluations = evaluations.filter(evaluation => {
      const evalDate = new Date(evaluation.data);
        return evalDate >= date && evalDate < nextDate;
      });

      const totalEvaluations = monthEvaluations.length;
      const averageRating = totalEvaluations > 0 
        ? monthEvaluations.reduce((sum, evaluation) => sum + evaluation.nota, 0) / totalEvaluations
        : 0;
      
      const satisfiedCount = monthEvaluations.filter(evaluation => evaluation.nota >= 4).length;
      const satisfactionRate = totalEvaluations > 0 
        ? (satisfiedCount / totalEvaluations) * 100
        : 0;

      trends.push({
        period: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        averageRating,
        totalEvaluations,
        satisfactionRate
      });
    }

    return trends;
  }

  /**
   * Calcula dados analíticos completos
   */
  static calculateAnalyticsData(
    evaluations: Evaluation[],
    attendants: Attendant[]
  ): AnalyticsData {
    const totalEvaluations = evaluations.length;
    const averageRating = totalEvaluations > 0 
      ? evaluations.reduce((sum, evaluation) => sum + evaluation.nota, 0) / totalEvaluations
      : 0;
    
    const satisfiedCount = evaluations.filter(evaluation => evaluation.nota >= 4).length;
    const satisfactionRate = totalEvaluations > 0 
      ? (satisfiedCount / totalEvaluations) * 100
      : 0;

    const ratingDistribution = this.calculateRatingDistribution(evaluations);
    const monthlyTrends = this.calculateMonthlyTrends(evaluations);
    
    // Top atendentes
    const attendantStats = new Map<string, { total: number; sum: number }>();
    evaluations.forEach(evaluation => {
      const current = attendantStats.get(evaluation.attendantId) || { total: 0, sum: 0 };
      attendantStats.set(evaluation.attendantId, {
        total: current.total + 1,
        sum: current.sum + evaluation.nota
      });
    });

    const attendantMap = new Map(attendants.map(att => [att.id, att.name]));
    const topAttendants = Array.from(attendantStats.entries())
      .map(([attendantId, stats]) => ({
        attendantId,
        attendantName: attendantMap.get(attendantId) || 'Desconhecido',
        averageRating: stats.sum / stats.total,
        totalEvaluations: stats.total
      }))
      .filter(att => att.totalEvaluations >= 3) // Mínimo 3 avaliações
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);

    // Avaliações recentes
    const recentEvaluations = [...evaluations]
      .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
      .slice(0, 10);

    return {
      totalEvaluations,
      averageRating,
      satisfactionRate,
      ratingDistribution,
      monthlyTrends,
      topAttendants,
      recentEvaluations
    };
  }

  /**
   * Calcula comparação entre períodos
   */
  static calculatePeriodComparison(
    evaluations: Evaluation[],
    currentPeriodDays: number = 30
  ) {
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - currentPeriodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(now.getTime() - (currentPeriodDays * 2) * 24 * 60 * 60 * 1000);

    const currentPeriodEvals = evaluations.filter(evaluation =>
      new Date(evaluation.data) >= currentPeriodStart
    );
    
    const previousPeriodEvals = evaluations.filter(evaluation => {
      const date = new Date(evaluation.data);
      return date >= previousPeriodStart && date < currentPeriodStart;
    });

    const calculatePeriodStats = (evals: Evaluation[]) => {
      const total = evals.length;
      const average = total > 0 
        ? evals.reduce((sum, evaluation) => sum + evaluation.nota, 0) / total
        : 0;
      const satisfied = evals.filter(evaluation => evaluation.nota >= 4).length;
      const satisfactionRate = total > 0 ? (satisfied / total) * 100 : 0;
      
      return { total, average, satisfactionRate };
    };

    const current = calculatePeriodStats(currentPeriodEvals);
    const previous = calculatePeriodStats(previousPeriodEvals);

    return {
      current,
      previous,
      changes: {
        totalEvaluations: current.total - previous.total,
        averageRating: current.average - previous.average,
        satisfactionRate: current.satisfactionRate - previous.satisfactionRate
      },
      percentageChanges: {
        totalEvaluations: previous.total > 0 
          ? ((current.total - previous.total) / previous.total) * 100
          : 0,
        averageRating: previous.average > 0 
          ? ((current.average - previous.average) / previous.average) * 100
          : 0,
        satisfactionRate: previous.satisfactionRate > 0 
          ? ((current.satisfactionRate - previous.satisfactionRate) / previous.satisfactionRate) * 100
          : 0
      }
    };
  }

  /**
   * Calcula estatísticas por setor
   */
  static calculateSectorStats(
    evaluations: Evaluation[],
    attendants: Attendant[]
  ) {
    const attendantMap = new Map(attendants.map(att => [att.id, att.setor]));
    const sectorStats = new Map<string, { total: number; sum: number; evaluations: Evaluation[] }>();

    evaluations.forEach(evaluation => {
      const sector = attendantMap.get(evaluation.attendantId) || 'Desconhecido';
      const current = sectorStats.get(sector) || { total: 0, sum: 0, evaluations: [] };
      sectorStats.set(sector, {
        total: current.total + 1,
        sum: current.sum + evaluation.nota,
        evaluations: [...current.evaluations, evaluation]
      });
    });

    return Array.from(sectorStats.entries()).map(([sector, stats]) => {
      const satisfiedCount = stats.evaluations.filter(evaluation => evaluation.nota >= 4).length;
      
      return {
        sector,
        totalEvaluations: stats.total,
        averageRating: stats.sum / stats.total,
        satisfactionRate: (satisfiedCount / stats.total) * 100
      };
    }).sort((a, b) => b.averageRating - a.averageRating);
  }

  /**
   * Identifica padrões e insights
   */
  static generateInsights(
    evaluations: Evaluation[],
    attendants: Attendant[]
  ) {
    const insights: string[] = [];
    
    // Análise de tendência geral
    const comparison = this.calculatePeriodComparison(evaluations);
    if (comparison.changes.averageRating > 0.2) {
      insights.push('📈 Melhoria significativa na satisfação dos clientes no último mês');
    } else if (comparison.changes.averageRating < -0.2) {
      insights.push('📉 Queda na satisfação dos clientes no último mês - atenção necessária');
    }

    // Análise de volume
    if (comparison.percentageChanges.totalEvaluations > 20) {
      insights.push('📊 Aumento significativo no volume de avaliações');
    }

    // Análise por setor
    const sectorStats = this.calculateSectorStats(evaluations, attendants);
    const bestSector = sectorStats[0];
    const worstSector = sectorStats[sectorStats.length - 1];
    
    if (bestSector && worstSector && bestSector.averageRating - worstSector.averageRating > 1) {
      insights.push(`🏆 Setor "${bestSector.sector}" se destaca com nota média de ${bestSector.averageRating.toFixed(1)}`);
      insights.push(`⚠️ Setor "${worstSector.sector}" precisa de atenção com nota média de ${worstSector.averageRating.toFixed(1)}`);
    }

    // Análise de comentários
    const withComments = evaluations.filter(evaluation => evaluation.comentario && evaluation.comentario.trim() !== '');
    const commentRate = (withComments.length / evaluations.length) * 100;
    
    if (commentRate > 70) {
      insights.push('💬 Alto engajamento dos clientes com comentários detalhados');
    } else if (commentRate < 30) {
      insights.push('💭 Baixo engajamento com comentários - considere incentivar feedback');
    }

    return insights;
  }
}