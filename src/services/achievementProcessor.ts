import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AchievementProcessor {
  /**
   * Processa conquistas automaticamente para um atendente
   */
  static async processAchievementsForAttendant(attendantId: string): Promise<number> {
    try {
      console.log(`🏆 Processando conquistas para atendente: ${attendantId}`);
      
      // Buscar temporada atual
      const currentSeason = await prisma.gamificationSeason.findFirst({
        where: {
          startDate: { lte: new Date() },
          endDate: { gte: new Date() }
        }
      });

      if (!currentSeason) {
        console.log('❌ Nenhuma temporada ativa encontrada');
        return 0;
      }

      // Buscar conquistas ativas
      const achievements = await prisma.achievementConfig.findMany({
        where: { active: true }
      });

      // Buscar conquistas já desbloqueadas na temporada atual
      const unlockedAchievements = await prisma.unlockedAchievement.findMany({
        where: {
          attendantId,
          seasonId: currentSeason.id
        }
      });

      const unlockedIds = new Set(unlockedAchievements.map(ua => ua.achievementId));
      let newUnlocks = 0;

      // Verificar cada conquista
      for (const achievement of achievements) {
        if (unlockedIds.has(achievement.id)) {
          continue; // Já desbloqueada nesta temporada
        }

        const shouldUnlock = await this.checkAchievementCriteria(
          attendantId, 
          achievement.id, 
          currentSeason
        );

        if (shouldUnlock) {
          try {
            await prisma.unlockedAchievement.create({
              data: {
                attendantId,
                achievementId: achievement.id,
                seasonId: currentSeason.id,
                unlockedAt: new Date(),
                xpGained: achievement.xp
              }
            });

            console.log(`✅ Conquista desbloqueada: ${achievement.title}`);
            newUnlocks++;
          } catch (error: any) {
            if (!error.message?.includes('Unique constraint')) {
              console.error(`❌ Erro ao desbloquear ${achievement.title}:`, error);
            }
          }
        }
      }

      if (newUnlocks > 0) {
        console.log(`🎉 ${newUnlocks} novas conquistas desbloqueadas`);
      }

      return newUnlocks;
    } catch (error) {
      console.error('Erro no processamento de conquistas:', error);
      return 0;
    }
  }

  /**
   * Verifica os critérios de uma conquista para um atendente na temporada atual
   */
  private static async checkAchievementCriteria(
    attendantId: string, 
    achievementId: string, 
    season: any
  ): Promise<boolean> {
    try {
      const seasonStart = new Date(season.startDate);
      const seasonEnd = new Date(season.endDate);

      // Buscar dados da temporada atual
      const seasonEvaluations = await prisma.evaluation.findMany({
        where: {
          attendantId,
          data: {
            gte: seasonStart,
            lte: seasonEnd
          }
        },
        orderBy: { data: 'asc' }
      });

      const seasonXpEvents = await prisma.xpEvent.findMany({
        where: {
          attendantId,
          date: {
            gte: seasonStart,
            lte: seasonEnd
          }
        }
      });

      const evaluationCount = seasonEvaluations.length;
      const seasonXp = seasonXpEvents.reduce((sum, event) => sum + (event.points || 0), 0);

      // Verificar critérios baseados no ID da conquista
      switch (achievementId) {
        case 'first_evaluation':
          return evaluationCount >= 1;
          
        case 'ten_evaluations':
          return evaluationCount >= 10;
          
        case 'fifty_evaluations':
          return evaluationCount >= 50;
          
        case 'hundred_evaluations':
          return evaluationCount >= 100;
          
        case 'hundred_xp':
          return seasonXp >= 100;
          
        case 'thousand_xp':
          return seasonXp >= 1000;
          
        case 'five_thousand_xp':
          return seasonXp >= 5000;
          
        case 'ten_thousand_xp':
          return seasonXp >= 10000;
          
        case 'five_star_streak_5':
          return this.checkFiveStarStreak(seasonEvaluations, 5);
          
        case 'five_star_streak_10':
          return this.checkFiveStarStreak(seasonEvaluations, 10);
          
        case 'high_average_50':
          return this.checkHighAverage(seasonEvaluations, 4.5, 50);
          
        default:
          return false;
      }
    } catch (error) {
      console.error(`Erro ao verificar critérios para ${achievementId}:`, error);
      return false;
    }
  }

  /**
   * Verifica a sequência de avaliações 5 estrelas
   */
  private static checkFiveStarStreak(evaluations: any[], requiredStreak: number): boolean {
    if (evaluations.length < requiredStreak) {
      return false;
    }

    let currentStreak = 0;
    let maxStreak = 0;

    for (const evaluation of evaluations) {
      if (evaluation.nota === 5) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

    return maxStreak >= requiredStreak;
  }

  /**
   * Verifica média alta com mínimo de avaliações
   */
  private static checkHighAverage(
    evaluations: any[], 
    requiredAverage: number, 
    minEvaluations: number
  ): boolean {
    if (evaluations.length < minEvaluations) {
      return false;
    }

    const average = evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
    return average >= requiredAverage;
  }
}