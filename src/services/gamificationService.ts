import { PrismaClient, XpEvent, GamificationSeason, AchievementConfig, UnlockedAchievement } from '@prisma/client';
import { z } from 'zod';
import { handlePrismaError, logError } from '@/lib/errors';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateSeasonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  startDate: z.date(),
  endDate: z.date(),
  active: z.boolean().default(false),
  xpMultiplier: z.number().min(0.1, 'Multiplicador deve ser pelo menos 0.1').default(1)
});

export const UpdateSeasonSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  active: z.boolean().optional(),
  xpMultiplier: z.number().min(0.1, 'Multiplicador deve ser pelo menos 0.1').optional()
});

export const CreateAchievementSchema = z.object({
  id: z.string().min(1, 'ID é obrigatório'),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  xp: z.number().min(0, 'XP deve ser positivo'),
  active: z.boolean().default(true),
  icon: z.string().min(1, 'Ícone é obrigatório'),
  color: z.string().min(1, 'Cor é obrigatória')
});

export type CreateSeasonData = z.infer<typeof CreateSeasonSchema>;
export type UpdateSeasonData = z.infer<typeof UpdateSeasonSchema>;
export type CreateAchievementData = z.infer<typeof CreateAchievementSchema>;

export class GamificationService {
  // === TEMPORADAS ===
  
  // Buscar todas as temporadas
  static async findAllSeasons(): Promise<GamificationSeason[]> {
    try {
      return await prisma.gamificationSeason.findMany({
        include: {
          xpEvents: true
        },
        orderBy: {
          startDate: 'desc'
        }
      });
    } catch (error) {
      logError(error as Error, 'GamificationService.findAllSeasons');
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  // Buscar temporada ativa
  static async findActiveSeason(): Promise<GamificationSeason | null> {
    try {
      return await prisma.gamificationSeason.findFirst({
        where: { active: true },
        include: {
          xpEvents: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar temporada ativa:', error);
      throw new Error('Falha ao buscar temporada ativa');
    }
  }

  // Criar temporada
  static async createSeason(seasonData: CreateSeasonData): Promise<GamificationSeason> {
    try {
      // Validar dados
      const validatedData = CreateSeasonSchema.parse(seasonData);
      
      // Validar datas
      if (validatedData.endDate <= validatedData.startDate) {
        throw new Error('Data de fim deve ser posterior à data de início');
      }

      // Se está sendo criada como ativa, desativar outras
      if (validatedData.active) {
        await prisma.gamificationSeason.updateMany({
          where: { active: true },
          data: { active: false }
        });
      }

      const season = await prisma.gamificationSeason.create({
        data: validatedData,
        include: {
          xpEvents: true
        }
      });

      return season;
    } catch (error) {
      console.error('Erro ao criar temporada:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Atualizar temporada
  static async updateSeason(id: string, seasonData: UpdateSeasonData): Promise<GamificationSeason> {
    try {
      // Validar dados
      const validatedData = UpdateSeasonSchema.parse(seasonData);
      
      // Verificar se temporada existe
      const existingSeason = await prisma.gamificationSeason.findUnique({
        where: { id }
      });
      
      if (!existingSeason) {
        throw new Error('Temporada não encontrada');
      }

      // Validar datas se fornecidas
      const startDate = validatedData.startDate || existingSeason.startDate;
      const endDate = validatedData.endDate || existingSeason.endDate;
      
      if (endDate <= startDate) {
        throw new Error('Data de fim deve ser posterior à data de início');
      }

      // Se está sendo ativada, desativar outras
      if (validatedData.active === true) {
        await prisma.gamificationSeason.updateMany({
          where: { 
            active: true,
            id: { not: id }
          },
          data: { active: false }
        });
      }

      const season = await prisma.gamificationSeason.update({
        where: { id },
        data: validatedData,
        include: {
          xpEvents: true
        }
      });

      return season;
    } catch (error) {
      console.error('Erro ao atualizar temporada:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }  
// Deletar temporada
  static async deleteSeason(id: string): Promise<void> {
    try {
      // Verificar se temporada existe
      const existingSeason = await prisma.gamificationSeason.findUnique({
        where: { id }
      });
      
      if (!existingSeason) {
        throw new Error('Temporada não encontrada');
      }

      await prisma.gamificationSeason.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Erro ao deletar temporada:', error);
      throw error;
    }
  }

  // === EVENTOS XP ===

  // Buscar eventos XP por atendente
  static async findXpEventsByAttendant(attendantId: string): Promise<XpEvent[]> {
    try {
      return await prisma.xpEvent.findMany({
        where: { attendantId },
        include: {
          season: true
        },
        orderBy: {
          date: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar eventos XP:', error);
      throw new Error('Falha ao buscar eventos XP');
    }
  }

  // Calcular XP total de um atendente
  static async calculateTotalXp(attendantId: string, seasonId?: string): Promise<number> {
    try {
      const where: any = { attendantId };
      if (seasonId) {
        where.seasonId = seasonId;
      }

      const result = await prisma.xpEvent.aggregate({
        where,
        _sum: {
          points: true
        }
      });

      return result._sum.points || 0;
    } catch (error) {
      console.error('Erro ao calcular XP total:', error);
      return 0;
    }
  }

  // Criar evento XP manual
  static async createXpEvent(data: {
    attendantId: string;
    points: number;
    reason: string;
    type: string;
    relatedId?: string;
  }): Promise<XpEvent> {
    try {
      // Buscar temporada ativa
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { active: true }
      });

      const multiplier = activeSeason?.xpMultiplier || 1;
      const finalPoints = data.points * multiplier;

      const xpEvent = await prisma.xpEvent.create({
        data: {
          attendantId: data.attendantId,
          points: finalPoints,
          basePoints: data.points,
          multiplier: multiplier,
          reason: data.reason,
          date: new Date(),
          type: data.type,
          relatedId: data.relatedId || '',
          seasonId: activeSeason?.id
        },
        include: {
          season: true
        }
      });

      // Verificar conquistas após adicionar XP
      await this.checkAchievements(data.attendantId);

      return xpEvent;
    } catch (error) {
      console.error('Erro ao criar evento XP:', error);
      throw error;
    }
  }

  // === CONQUISTAS ===

  // Buscar todas as configurações de conquistas
  static async findAllAchievements(): Promise<AchievementConfig[]> {
    try {
      return await prisma.achievementConfig.findMany({
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar conquistas:', error);
      throw new Error('Falha ao buscar conquistas');
    }
  }

  // Criar configuração de conquista
  static async createAchievement(achievementData: CreateAchievementData): Promise<AchievementConfig> {
    try {
      // Validar dados
      const validatedData = CreateAchievementSchema.parse(achievementData);
      
      // Verificar se ID já existe
      const existingAchievement = await prisma.achievementConfig.findUnique({
        where: { id: validatedData.id }
      });
      
      if (existingAchievement) {
        throw new Error('ID da conquista já está em uso');
      }

      const achievement = await prisma.achievementConfig.create({
        data: validatedData
      });

      return achievement;
    } catch (error) {
      console.error('Erro ao criar conquista:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Buscar conquistas desbloqueadas de um atendente
  static async findUnlockedAchievements(attendantId: string): Promise<UnlockedAchievement[]> {
    try {
      return await prisma.unlockedAchievement.findMany({
        where: { attendantId },
        orderBy: {
          unlockedAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar conquistas desbloqueadas:', error);
      throw new Error('Falha ao buscar conquistas desbloqueadas');
    }
  }

  // Desbloquear conquista
  static async unlockAchievement(attendantId: string, achievementId: string): Promise<UnlockedAchievement> {
    try {
      // Verificar se já foi desbloqueada
      const existing = await prisma.unlockedAchievement.findUnique({
        where: {
          attendantId_achievementId: {
            attendantId,
            achievementId
          }
        }
      });

      if (existing) {
        throw new Error('Conquista já foi desbloqueada');
      }

      // Buscar configuração da conquista
      const achievement = await prisma.achievementConfig.findUnique({
        where: { id: achievementId }
      });

      if (!achievement) {
        throw new Error('Configuração de conquista não encontrada');
      }

      // Desbloquear conquista
      const unlockedAchievement = await prisma.unlockedAchievement.create({
        data: {
          attendantId,
          achievementId,
          xpGained: achievement.xp
        }
      });

      // Criar evento XP para a conquista
      if (achievement.xp > 0) {
        await this.createXpEvent({
          attendantId,
          points: achievement.xp,
          reason: `Conquista desbloqueada: ${achievement.title}`,
          type: 'achievement',
          relatedId: unlockedAchievement.id
        });
      }

      return unlockedAchievement;
    } catch (error) {
      console.error('Erro ao desbloquear conquista:', error);
      throw error;
    }
  }

  // Verificar conquistas automaticamente
  static async checkAchievements(attendantId: string): Promise<UnlockedAchievement[]> {
    try {
      const newUnlocked: UnlockedAchievement[] = [];

      // Buscar todas as conquistas ativas
      const achievements = await prisma.achievementConfig.findMany({
        where: { active: true }
      });

      // Buscar conquistas já desbloqueadas
      const unlockedIds = await prisma.unlockedAchievement.findMany({
        where: { attendantId },
        select: { achievementId: true }
      });

      const unlockedSet = new Set(unlockedIds.map(u => u.achievementId));

      // Verificar cada conquista
      for (const achievement of achievements) {
        if (unlockedSet.has(achievement.id)) {
          continue; // Já desbloqueada
        }

        const shouldUnlock = await this.checkAchievementCriteria(attendantId, achievement.id);
        
        if (shouldUnlock) {
          try {
            const unlocked = await this.unlockAchievement(attendantId, achievement.id);
            newUnlocked.push(unlocked);
          } catch (error) {
            console.error(`Erro ao desbloquear conquista ${achievement.id}:`, error);
          }
        }
      }

      return newUnlocked;
    } catch (error) {
      console.error('Erro ao verificar conquistas:', error);
      return [];
    }
  }

  // Verificar critérios de conquista (implementação básica)
  private static async checkAchievementCriteria(attendantId: string, achievementId: string): Promise<boolean> {
    try {
      const totalXp = await this.calculateTotalXp(attendantId);
      const evaluationCount = await prisma.evaluation.count({
        where: { attendantId }
      });

      // Critérios baseados no ID da conquista
      switch (achievementId) {
        // Conquistas de Avaliações
        case 'first_evaluation':
          return evaluationCount >= 1;
        case 'ten_evaluations':
          return evaluationCount >= 10;
        case 'fifty_evaluations':
          return evaluationCount >= 50;
        case 'hundred_evaluations':
          return evaluationCount >= 100;
        
        // Conquistas de XP
        case 'hundred_xp':
          return totalXp >= 100;
        case 'thousand_xp':
          return totalXp >= 1000;
        case 'five_thousand_xp':
          return totalXp >= 5000;
        case 'ten_thousand_xp':
          return totalXp >= 10000;
        
        // Conquistas de Qualidade
        case 'five_star_streak_5':
          return await this.checkFiveStarStreak(attendantId, 5);
        case 'five_star_streak_10':
          return await this.checkFiveStarStreak(attendantId, 10);
        case 'high_average_50':
          return await this.checkHighAverage(attendantId, 4.5, 50);
        
        // Conquistas Temporais (implementação básica)
        case 'monthly_champion':
        case 'season_winner':
          return await this.checkRankingPosition(attendantId, achievementId);
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Erro ao verificar critérios:', error);
      return false;
    }
  }

  // Verificar sequência de 5 estrelas
  private static async checkFiveStarStreak(attendantId: string, requiredStreak: number): Promise<boolean> {
    try {
      const evaluations = await prisma.evaluation.findMany({
        where: { attendantId },
        orderBy: { data: 'desc' },
        take: requiredStreak
      });

      if (evaluations.length < requiredStreak) return false;

      return evaluations.every(eval => eval.nota === 5);
    } catch (error) {
      console.error('Erro ao verificar sequência 5 estrelas:', error);
      return false;
    }
  }

  // Verificar média alta com mínimo de avaliações
  private static async checkHighAverage(attendantId: string, requiredAverage: number, minEvaluations: number): Promise<boolean> {
    try {
      const evaluations = await prisma.evaluation.findMany({
        where: { attendantId },
        select: { nota: true }
      });

      if (evaluations.length < minEvaluations) return false;

      const average = evaluations.reduce((sum, eval) => sum + eval.nota, 0) / evaluations.length;
      return average >= requiredAverage;
    } catch (error) {
      console.error('Erro ao verificar média alta:', error);
      return false;
    }
  }

  // Verificar posição no ranking (implementação básica)
  private static async checkRankingPosition(attendantId: string, achievementId: string): Promise<boolean> {
    try {
      // Para implementação futura - verificar se foi #1 em alguma temporada
      // Por enquanto, retorna false para não desbloquear automaticamente
      return false;
    } catch (error) {
      console.error('Erro ao verificar posição no ranking:', error);
      return false;
    }
  }

  // === RANKINGS ===

  // Calcular ranking de temporada
  static async calculateSeasonRankings(seasonId?: string): Promise<Array<{
    attendantId: string;
    attendantName: string;
    totalXp: number;
    position: number;
  }>> {
    try {
      const where: any = {};
      if (seasonId) {
        where.seasonId = seasonId;
      }

      // Buscar XP por atendente
      const xpByAttendant = await prisma.xpEvent.groupBy({
        by: ['attendantId'],
        where,
        _sum: {
          points: true
        },
        orderBy: {
          _sum: {
            points: 'desc'
          }
        }
      });

      // Buscar nomes dos atendentes
      const attendantIds = xpByAttendant.map(x => x.attendantId);
      const attendants = await prisma.attendant.findMany({
        where: {
          id: { in: attendantIds }
        },
        select: {
          id: true,
          name: true
        }
      });

      const attendantMap = new Map(attendants.map(a => [a.id, a.name]));

      // Montar ranking
      const rankings = xpByAttendant.map((item, index) => ({
        attendantId: item.attendantId,
        attendantName: attendantMap.get(item.attendantId) || 'Desconhecido',
        totalXp: item._sum.points || 0,
        position: index + 1
      }));

      return rankings;
    } catch (error) {
      console.error('Erro ao calcular rankings:', error);
      throw new Error('Falha ao calcular rankings');
    }
  }

  // Reset de eventos XP (para nova temporada)
  static async resetXpEvents(seasonId?: string): Promise<number> {
    try {
      const where: any = {};
      if (seasonId) {
        where.seasonId = seasonId;
      }

      const result = await prisma.xpEvent.deleteMany({
        where
      });

      return result.count;
    } catch (error) {
      console.error('Erro ao resetar eventos XP:', error);
      throw error;
    }
  }
}