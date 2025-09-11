import type {
  Evaluation,
  XpEvent,
  GamificationConfig,
  GamificationSeason,
} from "@/lib/types";
import { getScoreFromRating } from "@/lib/gamification";

export class XpService {
  /**
   * Calcula o XP base para uma avaliação
   */
  static calculateBaseXp(rating: number, config: GamificationConfig): number {
    return getScoreFromRating(rating, config.ratingScores);
  }

  /**
   * Calcula o XP final considerando multiplicadores
   */
  static calculateFinalXp(
    baseXp: number,
    globalMultiplier: number = 1,
    seasonMultiplier: number = 1,
  ): number {
    return Math.round(baseXp * globalMultiplier * seasonMultiplier);
  }

  /**
   * Cria um evento de XP para uma avaliação
   */
  static createXpEventFromEvaluation(
    evaluation: Evaluation,
    config: GamificationConfig,
    activeSeason?: GamificationSeason | null,
  ): Omit<XpEvent, "id"> {
    const baseXp = this.calculateBaseXp(evaluation.nota, config);
    const globalMultiplier = config.globalXpMultiplier || 1;
    const seasonMultiplier = activeSeason?.xpMultiplier || 1;
    const finalXp = this.calculateFinalXp(
      baseXp,
      globalMultiplier,
      seasonMultiplier,
    );

    return {
      attendantId: evaluation.attendantId,
      points: finalXp,
      basePoints: baseXp,
      multiplier: globalMultiplier * seasonMultiplier,
      reason: `Avaliação ${evaluation.nota} estrelas`,
      date: evaluation.data,
      type: "evaluation",
      relatedId: evaluation.id,
    };
  }

  /**
   * Cria um evento de XP para um achievement
   */
  static createXpEventFromAchievement(
    attendantId: string,
    achievementId: string,
    achievementXp: number,
    achievementTitle: string,
    config: GamificationConfig,
    activeSeason?: GamificationSeason | null,
  ): Omit<XpEvent, "id"> {
    const globalMultiplier = config.globalXpMultiplier || 1;
    const seasonMultiplier = activeSeason?.xpMultiplier || 1;
    const finalXp = this.calculateFinalXp(
      achievementXp,
      globalMultiplier,
      seasonMultiplier,
    );

    return {
      attendantId,
      points: finalXp,
      basePoints: achievementXp,
      multiplier: globalMultiplier * seasonMultiplier,
      reason: `Troféu desbloqueado: ${achievementTitle}`,
      date: new Date().toISOString(),
      type: "achievement",
      relatedId: achievementId,
    };
  }

  /**
   * Calcula o XP total de um atendente baseado em eventos
   */
  static calculateTotalXp(xpEvents: XpEvent[]): number {
    return xpEvents.reduce((total, event) => total + event.points, 0);
  }

  /**
   * Filtra eventos de XP por temporada
   */
  static filterEventsBySeason(
    xpEvents: XpEvent[],
    season: GamificationSeason,
  ): XpEvent[] {
    const seasonStart = new Date(season.startDate);
    const seasonEnd = new Date(season.endDate);

    return xpEvents.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate >= seasonStart && eventDate <= seasonEnd;
    });
  }

  /**
   * Agrupa eventos de XP por atendente
   */
  static groupEventsByAttendant(xpEvents: XpEvent[]): Map<string, XpEvent[]> {
    const grouped = new Map<string, XpEvent[]>();

    xpEvents.forEach((event) => {
      const attendantEvents = grouped.get(event.attendantId) || [];
      attendantEvents.push(event);
      grouped.set(event.attendantId, attendantEvents);
    });

    return grouped;
  }

  /**
   * Calcula estatísticas de XP por atendente
   */
  static calculateAttendantStats(xpEvents: XpEvent[]): {
    totalXp: number;
    evaluationCount: number;
    achievementCount: number;
    averageXpPerEvaluation: number;
  } {
    const evaluationEvents = xpEvents.filter((e) => e.type === "evaluation");
    const achievementEvents = xpEvents.filter((e) => e.type === "achievement");
    const totalXp = this.calculateTotalXp(xpEvents);
    const evaluationCount = evaluationEvents.length;
    const achievementCount = achievementEvents.length;
    const averageXpPerEvaluation =
      evaluationCount > 0
        ? evaluationEvents.reduce((sum, e) => sum + e.points, 0) /
          evaluationCount
        : 0;

    return {
      totalXp,
      evaluationCount,
      achievementCount,
      averageXpPerEvaluation,
    };
  }
}
