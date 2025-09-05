import { PrismaClient, Evaluation } from '@prisma/client';
import { z } from 'zod';
import { handlePrismaError, logError } from '@/lib/errors';
import { achievements } from '@/lib/achievements';
import { achievements } from '@/lib/achievements';
import { achievements } from '@/lib/achievements';
import { achievements } from '@/lib/achievements';

const prisma = new PrismaClient();

// Schemas de validação
export const CreateEvaluationSchema = z.object({
  attendantId: z.string().min(1, 'ID do atendente é obrigatório'),
  nota: z.number().min(1, 'Nota mínima é 1').max(5, 'Nota máxima é 5'),
  comentario: z.string().default(''),
  data: z.date(),
  xpGained: z.number().default(0),
  importId: z.string().optional()
});

export const UpdateEvaluationSchema = z.object({
  nota: z.number().min(1, 'Nota mínima é 1').max(5, 'Nota máxima é 5').optional(),
  comentario: z.string().optional(),
  data: z.date().optional(),
  xpGained: z.number().optional()
});

export type CreateEvaluationData = z.infer<typeof CreateEvaluationSchema>;
export type UpdateEvaluationData = z.infer<typeof UpdateEvaluationSchema>;

export class EvaluationService {
  // Buscar todas as avaliações
  static async findAll(): Promise<Evaluation[]> {
    try {
      return await prisma.evaluation.findMany({
        include: {
          attendant: true,
          import: true
        },
        orderBy: {
          data: 'desc'
        }
      });
    } catch (error) {
      logError(error as Error, 'EvaluationService.findAll');
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  // Buscar avaliação por ID
  static async findById(id: string): Promise<Evaluation | null> {
    try {
      return await prisma.evaluation.findUnique({
        where: { id },
        include: {
          attendant: true,
          import: true
        }
      });
    } catch (error) {
      console.error('Erro ao buscar avaliação:', error);
      throw new Error('Falha ao buscar avaliação');
    }
  }

  // Buscar avaliações por atendente
  static async findByAttendantId(attendantId: string): Promise<Evaluation[]> {
    try {
      return await prisma.evaluation.findMany({
        where: { attendantId },
        include: {
          attendant: true,
          import: true
        },
        orderBy: {
          data: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar avaliações do atendente:', error);
      throw new Error('Falha ao buscar avaliações do atendente');
    }
  }

  // Criar avaliação
  static async create(evaluationData: CreateEvaluationData): Promise<Evaluation> {
    try {
      // Validar dados
      const validatedData = CreateEvaluationSchema.parse(evaluationData);
      
      // Verificar se atendente existe
      const attendant = await prisma.attendant.findUnique({
        where: { id: validatedData.attendantId }
      });
      
      if (!attendant) {
        throw new Error('Atendente não encontrado');
      }

      // Calcular XP se não fornecido
      if (validatedData.xpGained === 0) {
        validatedData.xpGained = await this.calculateXpFromRating(validatedData.nota);
      }

      const evaluation = await prisma.evaluation.create({
        data: validatedData,
        include: {
          attendant: true,
          import: true
        }
      });

      // Criar evento XP relacionado
      await this.createXpEvent(evaluation);

      // Processar conquistas automaticamente
      await this.processAchievements(evaluation.attendantId);

      return evaluation;
    } catch (error) {
      console.error('Erro ao criar avaliação:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Atualizar avaliação
  static async update(id: string, evaluationData: UpdateEvaluationData): Promise<Evaluation> {
    try {
      // Validar dados
      const validatedData = UpdateEvaluationSchema.parse(evaluationData);
      
      // Verificar se avaliação existe
      const existingEvaluation = await prisma.evaluation.findUnique({
        where: { id }
      });
      
      if (!existingEvaluation) {
        throw new Error('Avaliação não encontrada');
      }

      // Recalcular XP se nota foi alterada
      if (validatedData.nota && validatedData.nota !== existingEvaluation.nota) {
        validatedData.xpGained = await this.calculateXpFromRating(validatedData.nota);
      }

      const evaluation = await prisma.evaluation.update({
        where: { id },
        data: validatedData,
        include: {
          attendant: true,
          import: true
        }
      });

      // Atualizar evento XP relacionado se necessário
      if (validatedData.nota || validatedData.xpGained) {
        await this.updateXpEvent(evaluation);
      }

      return evaluation;
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  // Deletar avaliação
  static async delete(id: string): Promise<void> {
    try {
      // Verificar se avaliação existe
      const existingEvaluation = await prisma.evaluation.findUnique({
        where: { id }
      });
      
      if (!existingEvaluation) {
        throw new Error('Avaliação não encontrada');
      }

      // Deletar em transação para manter integridade
      await prisma.$transaction(async (tx) => {
        // Deletar eventos XP relacionados
        await tx.xpEvent.deleteMany({
          where: {
            relatedId: id,
            type: 'evaluation'
          }
        });

        // Deletar avaliação
        await tx.evaluation.delete({
          where: { id }
        });
      });
    } catch (error) {
      console.error('Erro ao deletar avaliação:', error);
      throw error;
    }
  }

  // Importação em lote
  static async createBatch(evaluationsData: CreateEvaluationData[], importId?: string): Promise<Evaluation[]> {
    try {
      const results: Evaluation[] = [];
      
      // Processar em transação
      await prisma.$transaction(async (tx) => {
        for (const evaluationData of evaluationsData) {
          // Validar dados
          const validatedData = CreateEvaluationSchema.parse({
            ...evaluationData,
            importId
          });
          
          // Verificar se atendente existe
          const attendant = await tx.attendant.findUnique({
            where: { id: validatedData.attendantId }
          });
          
          if (!attendant) {
            throw new Error(`Atendente ${validatedData.attendantId} não encontrado`);
          }

          // Calcular XP se não fornecido
          if (validatedData.xpGained === 0) {
            validatedData.xpGained = await this.calculateXpFromRating(validatedData.nota);
          }

          const evaluation = await tx.evaluation.create({
            data: validatedData,
            include: {
              attendant: true,
              import: true
            }
          });

          // Criar evento XP relacionado
          await this.createXpEventInTransaction(evaluation, tx);

          results.push(evaluation);
        }
      });

      // Processar conquistas para todos os atendentes afetados
      const uniqueAttendantIds = [...new Set(results.map(r => r.attendantId))];
      console.log(`🏆 Processando conquistas para ${uniqueAttendantIds.length} atendentes...`);
      
      for (const attendantId of uniqueAttendantIds) {
        await this.processAchievements(attendantId);
      }

      return results;
    } catch (error) {
      console.error('Erro na importação em lote de avaliações:', error);
      throw error;
    }
  }

  // Deletar por importação
  static async deleteByImportId(importId: string): Promise<number> {
    try {
      let deletedCount = 0;

      await prisma.$transaction(async (tx) => {
        // Buscar avaliações da importação
        const evaluations = await tx.evaluation.findMany({
          where: { importId }
        });

        // Deletar eventos XP relacionados
        for (const evaluation of evaluations) {
          await tx.xpEvent.deleteMany({
            where: {
              relatedId: evaluation.id,
              type: 'evaluation'
            }
          });
        }

        // Deletar avaliações
        const result = await tx.evaluation.deleteMany({
          where: { importId }
        });

        deletedCount = result.count;
      });

      return deletedCount;
    } catch (error) {
      console.error('Erro ao deletar avaliações por importação:', error);
      throw error;
    }
  }

  // Buscar avaliações por período
  static async findByDateRange(startDate: Date, endDate: Date): Promise<Evaluation[]> {
    try {
      return await prisma.evaluation.findMany({
        where: {
          data: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          attendant: true,
          import: true
        },
        orderBy: {
          data: 'desc'
        }
      });
    } catch (error) {
      console.error('Erro ao buscar avaliações por período:', error);
      throw new Error('Falha ao buscar avaliações por período');
    }
  }

  // Calcular XP baseado na nota
  private static async calculateXpFromRating(rating: number): Promise<number> {
    try {
      // Buscar configuração de gamificação
      const config = await prisma.gamificationConfig.findUnique({
        where: { id: 'main' }
      });

      if (!config) {
        // Valores padrão se não houver configuração
        const defaultScores = { 1: -5, 2: -2, 3: 1, 4: 3, 5: 5 };
        return defaultScores[rating as keyof typeof defaultScores] || 0;
      }

      const scores = {
        1: config.ratingScore1,
        2: config.ratingScore2,
        3: config.ratingScore3,
        4: config.ratingScore4,
        5: config.ratingScore5
      };

      return scores[rating as keyof typeof scores] || 0;
    } catch (error) {
      console.error('Erro ao calcular XP:', error);
      return 0;
    }
  }

  // Criar evento XP
  private static async createXpEvent(evaluation: Evaluation): Promise<void> {
    try {
      // Buscar temporada ativa
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: {
          active: true,
          startDate: { lte: evaluation.data },
          endDate: { gte: evaluation.data }
        }
      });

      const multiplier = activeSeason?.xpMultiplier || 1;
      const finalXp = evaluation.xpGained * multiplier;

      await prisma.xpEvent.create({
        data: {
          attendantId: evaluation.attendantId,
          points: finalXp,
          basePoints: evaluation.xpGained,
          multiplier: multiplier,
          reason: `Avaliação com nota ${evaluation.nota}`,
          date: evaluation.data,
          type: 'evaluation',
          relatedId: evaluation.id,
          seasonId: activeSeason?.id
        }
      });
    } catch (error) {
      console.error('Erro ao criar evento XP:', error);
      // Não propagar erro para não quebrar criação da avaliação
    }
  }

  // Criar evento XP em transação
  private static async createXpEventInTransaction(evaluation: Evaluation, tx: any): Promise<void> {
    try {
      // Buscar temporada ativa
      const activeSeason = await tx.gamificationSeason.findFirst({
        where: {
          active: true,
          startDate: { lte: evaluation.data },
          endDate: { gte: evaluation.data }
        }
      });

      const multiplier = activeSeason?.xpMultiplier || 1;
      const finalXp = evaluation.xpGained * multiplier;

      await tx.xpEvent.create({
        data: {
          attendantId: evaluation.attendantId,
          points: finalXp,
          basePoints: evaluation.xpGained,
          multiplier: multiplier,
          reason: `Avaliação com nota ${evaluation.nota}`,
          date: evaluation.data,
          type: 'evaluation',
          relatedId: evaluation.id,
          seasonId: activeSeason?.id
        }
      });
    } catch (error) {
      console.error('Erro ao criar evento XP em transação:', error);
      // Não propagar erro para não quebrar criação da avaliação
    }
  }

  // Atualizar evento XP
  private static async updateXpEvent(evaluation: Evaluation): Promise<void> {
    try {
      // Buscar evento XP relacionado
      const xpEvent = await prisma.xpEvent.findFirst({
        where: {
          relatedId: evaluation.id,
          type: 'evaluation'
        }
      });

      if (xpEvent) {
        // Buscar temporada ativa
        const activeSeason = await prisma.gamificationSeason.findFirst({
          where: {
            active: true,
            startDate: { lte: evaluation.data },
            endDate: { gte: evaluation.data }
          }
        });

        const multiplier = activeSeason?.xpMultiplier || 1;
        const finalXp = evaluation.xpGained * multiplier;

        await prisma.xpEvent.update({
          where: { id: xpEvent.id },
          data: {
            points: finalXp,
            basePoints: evaluation.xpGained,
            multiplier: multiplier,
            reason: `Avaliação com nota ${evaluation.nota}`,
            date: evaluation.data,
            seasonId: activeSeason?.id
          }
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar evento XP:', error);
      // Não propagar erro para não quebrar atualização da avaliação
    }
  }
}  
// Processar conquistas automaticamente
  private static async processAchievements(attendantId: string): Promise<void> {
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
        return;
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
    } catch (error) {
      console.error('Erro no processamento de conquistas:', error);
      // Não propagar erro para não quebrar criação da avaliação
    }
  }

  // Verificar critérios de conquista baseados na temporada atual
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

  // Verificar sequência de avaliações 5 estrelas
  private static checkFiveStarStreak(evaluations: any[], requiredStreak: number): boolean {
    if (evaluations.length < requiredStreak) return false;

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

  // Verificar média alta com mínimo de avaliações
  private static checkHighAverage(
    evaluations: any[], 
    requiredAverage: number, 
    minEvaluations: number
  ): boolean {
    if (evaluations.length < minEvaluations) return false;

    const average = evaluations.reduce((sum, e) => sum + e.nota, 0) / evaluations.length;
    return average >= requiredAverage;
  }