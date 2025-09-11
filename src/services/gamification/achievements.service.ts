import type {
  Achievement,
  Attendant,
  Evaluation,
  EvaluationAnalysis,
  UnlockedAchievement,
} from "@/lib/types";

export class AchievementsService {
  /**
   * Verifica se um achievement foi desbloqueado por um atendente
   */
  static checkAchievementUnlocked(
    achievement: Achievement,
    attendant: Attendant,
    attendantEvaluations: Evaluation[],
    allEvaluations?: Evaluation[],
    allAttendants?: Attendant[],
    aiAnalysisResults?: EvaluationAnalysis[],
  ): boolean {
    if (!achievement.active) return false;

    return achievement.isUnlocked(
      attendant,
      attendantEvaluations,
      allEvaluations,
      allAttendants,
      aiAnalysisResults,
    );
  }

  /**
   * Verifica todos os achievements para um atendente
   */
  static checkAllAchievements(
    achievements: Achievement[],
    attendant: Attendant,
    attendantEvaluations: Evaluation[],
    allEvaluations?: Evaluation[],
    allAttendants?: Attendant[],
    aiAnalysisResults?: EvaluationAnalysis[],
  ): Achievement[] {
    return achievements.filter((achievement) =>
      this.checkAchievementUnlocked(
        achievement,
        attendant,
        attendantEvaluations,
        allEvaluations,
        allAttendants,
        aiAnalysisResults,
      ),
    );
  }

  /**
   * Encontra novos achievements desbloqueados
   */
  static findNewlyUnlockedAchievements(
    achievements: Achievement[],
    attendant: Attendant,
    attendantEvaluations: Evaluation[],
    unlockedAchievements: UnlockedAchievement[],
    allEvaluations?: Evaluation[],
    allAttendants?: Attendant[],
    aiAnalysisResults?: EvaluationAnalysis[],
  ): Achievement[] {
    const unlockedAchievementIds = new Set(
      unlockedAchievements
        .filter((ua) => ua.attendantId === attendant.id)
        .map((ua) => ua.achievementId),
    );

    const currentlyUnlocked = this.checkAllAchievements(
      achievements,
      attendant,
      attendantEvaluations,
      allEvaluations,
      allAttendants,
      aiAnalysisResults,
    );

    return currentlyUnlocked.filter(
      (achievement) => !unlockedAchievementIds.has(achievement.id),
    );
  }

  /**
   * Calcula estatísticas de achievements para um atendente
   */
  static calculateAttendantAchievementStats(
    achievements: Achievement[],
    attendant: Attendant,
    attendantEvaluations: Evaluation[],
    unlockedAchievements: UnlockedAchievement[],
    allEvaluations?: Evaluation[],
    allAttendants?: Attendant[],
    aiAnalysisResults?: EvaluationAnalysis[],
  ): {
    totalAchievements: number;
    unlockedCount: number;
    lockedCount: number;
    progressPercentage: number;
    totalXpFromAchievements: number;
  } {
    const activeAchievements = achievements.filter((a) => a.active);
    const attendantUnlocked = unlockedAchievements.filter(
      (ua) => ua.attendantId === attendant.id,
    );

    const currentlyUnlocked = this.checkAllAchievements(
      activeAchievements,
      attendant,
      attendantEvaluations,
      allEvaluations,
      allAttendants,
      aiAnalysisResults,
    );

    const totalAchievements = activeAchievements.length;
    const unlockedCount = currentlyUnlocked.length;
    const lockedCount = totalAchievements - unlockedCount;
    const progressPercentage =
      totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;

    const totalXpFromAchievements = attendantUnlocked.reduce((total, ua) => {
      const achievement = achievements.find((a) => a.id === ua.achievementId);
      return total + (ua.xpGained || achievement?.xp || 0);
    }, 0);

    return {
      totalAchievements,
      unlockedCount,
      lockedCount,
      progressPercentage,
      totalXpFromAchievements,
    };
  }

  /**
   * Calcula estatísticas globais de achievements
   */
  static calculateGlobalAchievementStats(
    achievements: Achievement[],
    attendants: Attendant[],
    allEvaluations: Evaluation[],
    unlockedAchievements: UnlockedAchievement[],
    aiAnalysisResults?: EvaluationAnalysis[],
  ): Map<
    string,
    {
      achievement: Achievement;
      unlockedCount: number;
      totalAttendants: number;
      progress: number;
      unlockedBy: Attendant[];
    }
  > {
    const stats = new Map();
    const evaluationsByAttendant = new Map<string, Evaluation[]>();

    // Agrupar avaliações por atendente
    allEvaluations.forEach((evaluation) => {
      const attendantEvals =
        evaluationsByAttendant.get(evaluation.attendantId) || [];
      attendantEvals.push(evaluation);
      evaluationsByAttendant.set(evaluation.attendantId, attendantEvals);
    });

    achievements
      .filter((a) => a.active)
      .forEach((achievement) => {
        const unlockedBy: Attendant[] = [];

        attendants.forEach((attendant) => {
          const attendantEvaluations =
            evaluationsByAttendant.get(attendant.id) || [];

          if (
            this.checkAchievementUnlocked(
              achievement,
              attendant,
              attendantEvaluations,
              allEvaluations,
              attendants,
              aiAnalysisResults,
            )
          ) {
            unlockedBy.push(attendant);
          }
        });

        const unlockedCount = unlockedBy.length;
        const totalAttendants = attendants.length;
        const progress =
          totalAttendants > 0 ? (unlockedCount / totalAttendants) * 100 : 0;

        stats.set(achievement.id, {
          achievement,
          unlockedCount,
          totalAttendants,
          progress,
          unlockedBy,
        });
      });

    return stats;
  }

  /**
   * Filtra achievements por categoria ou tipo
   */
  static filterAchievementsByCategory(
    achievements: Achievement[],
    category: string,
  ): Achievement[] {
    // Implementar lógica de categorização baseada no ID ou título
    // Por exemplo: achievements que começam com 'social_' são sociais
    return achievements.filter((achievement) =>
      achievement.id.startsWith(category.toLowerCase()),
    );
  }

  /**
   * Ordena achievements por dificuldade (baseado no XP)
   */
  static sortAchievementsByDifficulty(
    achievements: Achievement[],
    ascending: boolean = true,
  ): Achievement[] {
    return [...achievements].sort((a, b) => {
      const comparison = a.xp - b.xp;
      return ascending ? comparison : -comparison;
    });
  }
}
