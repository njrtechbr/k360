import type { GamificationSeason } from '@/lib/types';
import { differenceInDays, isAfter, isBefore, isWithinInterval, parseISO } from 'date-fns';

export class SeasonsService {
  /**
   * Encontra a temporada ativa atual
   */
  static findActiveSeason(seasons: GamificationSeason[]): GamificationSeason | null {
    const now = new Date();
    
    return seasons.find(season => {
      if (!season.active) return false;
      
      const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
      const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
      
      return isWithinInterval(now, { start: startDate, end: endDate });
    }) || null;
  }

  /**
   * Encontra a próxima temporada
   */
  static findNextSeason(seasons: GamificationSeason[]): GamificationSeason | null {
    const now = new Date();
    
    const futurSeasons = seasons
      .filter(season => {
        if (!season.active) return false;
        const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
        return isAfter(startDate, now);
      })
      .sort((a, b) => {
        const dateA = a.startDate instanceof Date ? a.startDate : parseISO(a.startDate);
        const dateB = b.startDate instanceof Date ? b.startDate : parseISO(b.startDate);
        return dateA.getTime() - dateB.getTime();
      });

    return futurSeasons[0] || null;
  }

  /**
   * Encontra a temporada anterior
   */
  static findPreviousSeason(seasons: GamificationSeason[]): GamificationSeason | null {
    const now = new Date();
    
    const pastSeasons = seasons
      .filter(season => {
        const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
        return isBefore(endDate, now);
      })
      .sort((a, b) => {
        const dateA = a.endDate instanceof Date ? a.endDate : parseISO(a.endDate);
        const dateB = b.endDate instanceof Date ? b.endDate : parseISO(b.endDate);
        return dateB.getTime() - dateA.getTime(); // Mais recente primeiro
      });

    return pastSeasons[0] || null;
  }

  /**
   * Verifica se uma temporada está ativa
   */
  static isSeasonActive(season: GamificationSeason): boolean {
    if (!season.active) return false;
    
    const now = new Date();
    const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
    const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
    
    return isWithinInterval(now, { start: startDate, end: endDate });
  }

  /**
   * Calcula dias restantes de uma temporada
   */
  static getDaysRemaining(season: GamificationSeason): number {
    const now = new Date();
    const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
    
    return Math.max(0, differenceInDays(endDate, now));
  }

  /**
   * Calcula dias desde o início de uma temporada
   */
  static getDaysSinceStart(season: GamificationSeason): number {
    const now = new Date();
    const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
    
    return Math.max(0, differenceInDays(now, startDate));
  }

  /**
   * Calcula a duração total de uma temporada em dias
   */
  static getSeasonDuration(season: GamificationSeason): number {
    const startDate = parseISO(season.startDate);
    const endDate = parseISO(season.endDate);
    
    return differenceInDays(endDate, startDate);
  }

  /**
   * Calcula o progresso de uma temporada (0-100%)
   */
  static getSeasonProgress(season: GamificationSeason): number {
    const totalDays = this.getSeasonDuration(season);
    const daysPassed = this.getDaysSinceStart(season);
    
    if (totalDays <= 0) return 0;
    
    return Math.min(100, Math.max(0, (daysPassed / totalDays) * 100));
  }

  /**
   * Verifica se há sobreposição entre temporadas
   */
  static hasSeasonOverlap(season1: GamificationSeason, season2: GamificationSeason): boolean {
    const start1 = season1.startDate instanceof Date ? season1.startDate : parseISO(season1.startDate);
    const end1 = season1.endDate instanceof Date ? season1.endDate : parseISO(season1.endDate);
    const start2 = season2.startDate instanceof Date ? season2.startDate : parseISO(season2.startDate);
    const end2 = season2.endDate instanceof Date ? season2.endDate : parseISO(season2.endDate);

    return (
      isWithinInterval(start1, { start: start2, end: end2 }) ||
      isWithinInterval(end1, { start: start2, end: end2 }) ||
      isWithinInterval(start2, { start: start1, end: end1 }) ||
      isWithinInterval(end2, { start: start1, end: end1 })
    );
  }

  /**
   * Valida se uma temporada é válida
   */
  static validateSeason(season: Partial<GamificationSeason>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!season.name || season.name.trim().length === 0) {
      errors.push('Nome da temporada é obrigatório');
    }

    if (!season.startDate) {
      errors.push('Data de início é obrigatória');
    }

    if (!season.endDate) {
      errors.push('Data de fim é obrigatória');
    }

    if (season.startDate && season.endDate) {
      const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
      const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
      
      if (isAfter(startDate, endDate)) {
        errors.push('Data de início deve ser anterior à data de fim');
      }

      if (differenceInDays(endDate, startDate) < 1) {
        errors.push('Temporada deve ter pelo menos 1 dia de duração');
      }
    }

    if (season.xpMultiplier !== undefined && season.xpMultiplier <= 0) {
      errors.push('Multiplicador de XP deve ser maior que zero');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Ordena temporadas por data de início
   */
  static sortSeasonsByStartDate(
    seasons: GamificationSeason[],
    ascending: boolean = true
  ): GamificationSeason[] {
    return [...seasons].sort((a, b) => {
      const dateA = a.startDate instanceof Date ? a.startDate : parseISO(a.startDate);
      const dateB = b.startDate instanceof Date ? b.startDate : parseISO(b.startDate);
      const comparison = dateA.getTime() - dateB.getTime();
      return ascending ? comparison : -comparison;
    });
  }

  /**
   * Filtra temporadas por status
   */
  static filterSeasonsByStatus(
    seasons: GamificationSeason[],
    status: 'active' | 'upcoming' | 'past'
  ): GamificationSeason[] {
    const now = new Date();
    
    return seasons.filter(season => {
      const startDate = season.startDate instanceof Date ? season.startDate : parseISO(season.startDate);
      const endDate = season.endDate instanceof Date ? season.endDate : parseISO(season.endDate);
      
      switch (status) {
        case 'active':
          return season.active && isWithinInterval(now, { start: startDate, end: endDate });
        case 'upcoming':
          return season.active && isAfter(startDate, now);
        case 'past':
          return isBefore(endDate, now);
        default:
          return false;
      }
    });
  }

  /**
   * Gera estatísticas de uma temporada
   */
  static generateSeasonStats(season: GamificationSeason): {
    duration: number;
    daysRemaining: number;
    daysPassed: number;
    progress: number;
    isActive: boolean;
    status: 'upcoming' | 'active' | 'ended';
  } {
    const now = new Date();
    const startDate = parseISO(season.startDate);
    const endDate = parseISO(season.endDate);
    
    const duration = this.getSeasonDuration(season);
    const daysRemaining = this.getDaysRemaining(season);
    const daysPassed = this.getDaysSinceStart(season);
    const progress = this.getSeasonProgress(season);
    const isActive = this.isSeasonActive(season);
    
    let status: 'upcoming' | 'active' | 'ended';
    if (isAfter(now, endDate)) {
      status = 'ended';
    } else if (isBefore(now, startDate)) {
      status = 'upcoming';
    } else {
      status = 'active';
    }

    return {
      duration,
      daysRemaining,
      daysPassed,
      progress,
      isActive,
      status,
    };
  }
}