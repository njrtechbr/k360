import type { User, XpEvent, GamificationSeason } from "@/lib/types";
import { XpService } from "./xp.service";
import { SeasonsService } from "./seasons.service";

export interface LeaderboardEntry {
  attendant: User;
  totalXp: number;
  currentLevel: number;
  position: number;
  xpEvents: XpEvent[];
  evaluationsCount: number;
  achievementsCount: number;
  averageRating: number;
  lastActivity?: Date;
}

export interface LeaderboardFilters {
  seasonId?: string;
  departmentId?: string;
  limit?: number;
  offset?: number;
  minLevel?: number;
  maxLevel?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface LeaderboardStats {
  totalAttendants: number;
  totalXp: number;
  averageXp: number;
  topPerformer: LeaderboardEntry | null;
  mostImproved: LeaderboardEntry | null;
  activeSeason: GamificationSeason | null;
}

export class LeaderboardService {
  /**
   * Gera o leaderboard principal
   */
  static generateLeaderboard(
    attendants: User[],
    xpEvents: XpEvent[],
    filters: LeaderboardFilters = {},
  ): LeaderboardEntry[] {
    let filteredEvents = [...xpEvents];

    // Aplicar filtros de data
    if (filters.dateRange) {
      filteredEvents = filteredEvents.filter((event) => {
        const eventDate = new Date(event.createdAt);
        return (
          eventDate >= filters.dateRange!.start &&
          eventDate <= filters.dateRange!.end
        );
      });
    }

    // Aplicar filtro de temporada
    if (filters.seasonId) {
      filteredEvents = filteredEvents.filter(
        (event) => event.seasonId === filters.seasonId,
      );
    }

    // Agrupar eventos por atendente
    const attendantStats = XpService.groupEventsByAttendant(filteredEvents);

    // Criar entradas do leaderboard
    const entries: LeaderboardEntry[] = attendants
      .filter((attendant) => {
        // Filtrar por departamento se especificado
        if (
          filters.departmentId &&
          attendant.departmentId !== filters.departmentId
        ) {
          return false;
        }
        return true;
      })
      .map((attendant) => {
        const stats = attendantStats[attendant.id] || {
          totalXp: 0,
          eventsCount: 0,
          evaluationsCount: 0,
          achievementsCount: 0,
          averageRating: 0,
          lastActivity: undefined,
        };

        const attendantEvents = filteredEvents.filter(
          (event) => event.attendantId === attendant.id,
        );
        const currentLevel = XpService.getLevelFromXp(stats.totalXp);

        return {
          attendant,
          totalXp: stats.totalXp,
          currentLevel,
          position: 0, // Será definido após ordenação
          xpEvents: attendantEvents,
          evaluationsCount: stats.evaluationsCount,
          achievementsCount: stats.achievementsCount,
          averageRating: stats.averageRating,
          lastActivity: stats.lastActivity,
        };
      })
      .filter((entry) => {
        // Aplicar filtros de nível
        if (filters.minLevel && entry.currentLevel < filters.minLevel) {
          return false;
        }
        if (filters.maxLevel && entry.currentLevel > filters.maxLevel) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Ordenar por XP total (decrescente)
        if (b.totalXp !== a.totalXp) {
          return b.totalXp - a.totalXp;
        }
        // Em caso de empate, ordenar por número de avaliações
        if (b.evaluationsCount !== a.evaluationsCount) {
          return b.evaluationsCount - a.evaluationsCount;
        }
        // Em caso de empate, ordenar por rating médio
        return b.averageRating - a.averageRating;
      });

    // Definir posições
    entries.forEach((entry, index) => {
      entry.position = index + 1;
    });

    // Aplicar paginação
    const start = filters.offset || 0;
    const end = filters.limit ? start + filters.limit : undefined;

    return entries.slice(start, end);
  }

  /**
   * Gera leaderboard por departamento
   */
  static generateDepartmentLeaderboard(
    attendants: User[],
    xpEvents: XpEvent[],
    filters: LeaderboardFilters = {},
  ): Record<string, LeaderboardEntry[]> {
    const departments = [
      ...new Set(attendants.map((a) => a.departmentId).filter(Boolean)),
    ];
    const result: Record<string, LeaderboardEntry[]> = {};

    departments.forEach((departmentId) => {
      const departmentFilters = { ...filters, departmentId };
      result[departmentId] = this.generateLeaderboard(
        attendants,
        xpEvents,
        departmentFilters,
      );
    });

    return result;
  }

  /**
   * Encontra a posição de um atendente específico
   */
  static findAttendantPosition(
    attendantId: string,
    attendants: User[],
    xpEvents: XpEvent[],
    filters: LeaderboardFilters = {},
  ): {
    position: number;
    entry: LeaderboardEntry | null;
    totalAttendants: number;
  } {
    const leaderboard = this.generateLeaderboard(attendants, xpEvents, filters);
    const entry = leaderboard.find((e) => e.attendant.id === attendantId);

    return {
      position: entry?.position || 0,
      entry: entry || null,
      totalAttendants: leaderboard.length,
    };
  }

  /**
   * Gera estatísticas do leaderboard
   */
  static generateLeaderboardStats(
    attendants: User[],
    xpEvents: XpEvent[],
    seasons: GamificationSeason[],
    filters: LeaderboardFilters = {},
  ): LeaderboardStats {
    const leaderboard = this.generateLeaderboard(attendants, xpEvents, filters);
    const activeSeason = SeasonsService.findActiveSeason(seasons);

    const totalXp = leaderboard.reduce((sum, entry) => sum + entry.totalXp, 0);
    const averageXp = leaderboard.length > 0 ? totalXp / leaderboard.length : 0;

    const topPerformer = leaderboard[0] || null;

    // Encontrar o mais melhorado (comparando com período anterior)
    const mostImproved = this.findMostImprovedAttendant(leaderboard, xpEvents);

    return {
      totalAttendants: leaderboard.length,
      totalXp,
      averageXp,
      topPerformer,
      mostImproved,
      activeSeason,
    };
  }

  /**
   * Encontra o atendente que mais melhorou
   */
  private static findMostImprovedAttendant(
    leaderboard: LeaderboardEntry[],
    xpEvents: XpEvent[],
  ): LeaderboardEntry | null {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let maxImprovement = 0;
    let mostImproved: LeaderboardEntry | null = null;

    leaderboard.forEach((entry) => {
      const recentEvents = xpEvents.filter(
        (event) =>
          event.attendantId === entry.attendant.id &&
          new Date(event.createdAt) >= thirtyDaysAgo,
      );

      const recentXp = recentEvents.reduce(
        (sum, event) => sum + event.xpGained,
        0,
      );

      if (recentXp > maxImprovement) {
        maxImprovement = recentXp;
        mostImproved = entry;
      }
    });

    return mostImproved;
  }

  /**
   * Gera ranking por período específico
   */
  static generatePeriodRanking(
    attendants: User[],
    xpEvents: XpEvent[],
    period: "daily" | "weekly" | "monthly",
    date: Date = new Date(),
  ): LeaderboardEntry[] {
    const { start, end } = this.getPeriodRange(period, date);

    const filters: LeaderboardFilters = {
      dateRange: { start, end },
    };

    return this.generateLeaderboard(attendants, xpEvents, filters);
  }

  /**
   * Calcula o range de datas para um período
   */
  private static getPeriodRange(
    period: "daily" | "weekly" | "monthly",
    date: Date,
  ): {
    start: Date;
    end: Date;
  } {
    const start = new Date(date);
    const end = new Date(date);

    switch (period) {
      case "daily":
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;

      case "weekly":
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;

      case "monthly":
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  }

  /**
   * Compara performance entre dois períodos
   */
  static comparePerformance(
    attendantId: string,
    attendants: User[],
    xpEvents: XpEvent[],
    currentPeriod: { start: Date; end: Date },
    previousPeriod: { start: Date; end: Date },
  ): {
    current: {
      xp: number;
      position: number;
      evaluations: number;
    };
    previous: {
      xp: number;
      position: number;
      evaluations: number;
    };
    improvement: {
      xp: number;
      position: number;
      evaluations: number;
    };
  } {
    const currentStats = this.findAttendantPosition(
      attendantId,
      attendants,
      xpEvents,
      { dateRange: currentPeriod },
    );

    const previousStats = this.findAttendantPosition(
      attendantId,
      attendants,
      xpEvents,
      { dateRange: previousPeriod },
    );

    const currentXp = currentStats.entry?.totalXp || 0;
    const previousXp = previousStats.entry?.totalXp || 0;
    const currentEvaluations = currentStats.entry?.evaluationsCount || 0;
    const previousEvaluations = previousStats.entry?.evaluationsCount || 0;

    return {
      current: {
        xp: currentXp,
        position: currentStats.position,
        evaluations: currentEvaluations,
      },
      previous: {
        xp: previousXp,
        position: previousStats.position,
        evaluations: previousEvaluations,
      },
      improvement: {
        xp: currentXp - previousXp,
        position: previousStats.position - currentStats.position, // Melhoria = posição anterior - atual
        evaluations: currentEvaluations - previousEvaluations,
      },
    };
  }

  /**
   * Gera insights do leaderboard
   */
  static generateInsights(
    leaderboard: LeaderboardEntry[],
    previousLeaderboard?: LeaderboardEntry[],
  ): {
    topPerformers: LeaderboardEntry[];
    risingStars: LeaderboardEntry[];
    needsAttention: LeaderboardEntry[];
    trends: {
      averageXpChange: number;
      participationRate: number;
      competitiveness: number;
    };
  } {
    const topPerformers = leaderboard.slice(0, 3);

    // Rising stars: atendentes que subiram mais posições
    const risingStars = previousLeaderboard
      ? this.findRisingStars(leaderboard, previousLeaderboard)
      : [];

    // Atendentes que precisam de atenção (baixo XP ou sem atividade recente)
    const needsAttention = leaderboard
      .filter((entry) => {
        const hasLowXp = entry.totalXp < (leaderboard[0]?.totalXp || 0) * 0.1;
        const hasNoRecentActivity =
          !entry.lastActivity ||
          new Date().getTime() - entry.lastActivity.getTime() >
            7 * 24 * 60 * 60 * 1000;

        return hasLowXp || hasNoRecentActivity;
      })
      .slice(0, 5);

    // Calcular tendências
    const averageXp =
      leaderboard.reduce((sum, entry) => sum + entry.totalXp, 0) /
      leaderboard.length;
    const previousAverageXp = previousLeaderboard
      ? previousLeaderboard.reduce((sum, entry) => sum + entry.totalXp, 0) /
        previousLeaderboard.length
      : averageXp;

    const averageXpChange = averageXp - previousAverageXp;
    const participationRate =
      leaderboard.filter((entry) => entry.totalXp > 0).length /
      leaderboard.length;

    // Competitividade: quão próximos estão os top performers
    const topXp = leaderboard[0]?.totalXp || 0;
    const tenthXp = leaderboard[9]?.totalXp || 0;
    const competitiveness = topXp > 0 ? tenthXp / topXp : 0;

    return {
      topPerformers,
      risingStars,
      needsAttention,
      trends: {
        averageXpChange,
        participationRate,
        competitiveness,
      },
    };
  }

  /**
   * Encontra os atendentes que mais subiram no ranking
   */
  private static findRisingStars(
    current: LeaderboardEntry[],
    previous: LeaderboardEntry[],
  ): LeaderboardEntry[] {
    const improvements: Array<LeaderboardEntry & { positionChange: number }> =
      [];

    current.forEach((currentEntry) => {
      const previousEntry = previous.find(
        (p) => p.attendant.id === currentEntry.attendant.id,
      );
      if (previousEntry) {
        const positionChange = previousEntry.position - currentEntry.position;
        if (positionChange > 0) {
          improvements.push({ ...currentEntry, positionChange });
        }
      }
    });

    return improvements
      .sort((a, b) => b.positionChange - a.positionChange)
      .slice(0, 3);
  }
}
