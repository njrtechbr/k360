// import { XpAvulsoConfig } from '@prisma/client';

// Tipo temporário até o Prisma client ser gerado
interface XpAvulsoConfig {
  id: string;
  dailyLimitPoints: number;
  dailyLimitGrants: number;
  maxPointsPerGrant: number;
  minPointsPerGrant: number;
  requireJustification: boolean;
  autoApproveLimit: number;
  auditRetentionDays: number;
  enableNotifications: boolean;
  allowWeekendGrants: boolean;
  allowHolidayGrants: boolean;
  maxGrantsPerAttendant: number;
  cooldownMinutes: number;
  updatedAt: Date;
  updatedBy: string | null;
}
import { z } from 'zod';
import { handlePrismaError, logError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

// Schema de validação para configurações
export const XpAvulsoConfigSchema = z.object({
  dailyLimitPoints: z.number().min(100, 'Limite diário deve ser pelo menos 100 pontos').max(10000, 'Limite diário não pode exceder 10.000 pontos'),
  dailyLimitGrants: z.number().min(10, 'Limite diário deve ser pelo menos 10 concessões').max(500, 'Limite diário não pode exceder 500 concessões'),
  maxPointsPerGrant: z.number().min(1, 'Máximo por concessão deve ser pelo menos 1 ponto').max(1000, 'Máximo por concessão não pode exceder 1.000 pontos'),
  minPointsPerGrant: z.number().min(1, 'Mínimo por concessão deve ser pelo menos 1 ponto'),
  requireJustification: z.boolean(),
  autoApproveLimit: z.number().min(1, 'Limite de aprovação automática deve ser pelo menos 1 ponto').max(500, 'Limite de aprovação automática não pode exceder 500 pontos'),
  auditRetentionDays: z.number().min(30, 'Retenção de auditoria deve ser pelo menos 30 dias').max(2555, 'Retenção de auditoria não pode exceder 7 anos'),
  enableNotifications: z.boolean(),
  allowWeekendGrants: z.boolean(),
  allowHolidayGrants: z.boolean(),
  maxGrantsPerAttendant: z.number().min(1, 'Máximo por atendente deve ser pelo menos 1').max(100, 'Máximo por atendente não pode exceder 100'),
  cooldownMinutes: z.number().min(0, 'Cooldown não pode ser negativo').max(1440, 'Cooldown não pode exceder 24 horas'),
  updatedBy: z.string().optional()
});

export type XpAvulsoConfigData = z.infer<typeof XpAvulsoConfigSchema>;

export class XpAvulsoConfigService {
  /**
   * Buscar configurações atuais
   */
  static async getConfig(): Promise<XpAvulsoConfig> {
    try {
      let config = await prisma.xpAvulsoConfig.findUnique({
        where: { id: 'main' }
      });

      // Se não existir, criar com valores padrão
      if (!config) {
        config = await prisma.xpAvulsoConfig.create({
          data: { id: 'main' }
        });
      }

      return config;
    } catch (error) {
      logError(error as Error, 'XpAvulsoConfigService.getConfig');
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  /**
   * Atualizar configurações
   */
  static async updateConfig(data: XpAvulsoConfigData): Promise<XpAvulsoConfig> {
    try {
      // Validar dados
      const validatedData = XpAvulsoConfigSchema.parse(data);

      // Validações adicionais
      if (validatedData.minPointsPerGrant > validatedData.maxPointsPerGrant) {
        throw new Error('Mínimo de pontos por concessão não pode ser maior que o máximo');
      }

      if (validatedData.autoApproveLimit > validatedData.maxPointsPerGrant) {
        throw new Error('Limite de aprovação automática não pode ser maior que o máximo por concessão');
      }

      // Atualizar ou criar configuração
      const config = await prisma.xpAvulsoConfig.upsert({
        where: { id: 'main' },
        update: {
          ...validatedData,
          updatedAt: new Date()
        },
        create: {
          id: 'main',
          ...validatedData
        }
      });

      return config;
    } catch (error) {
      logError(error as Error, 'XpAvulsoConfigService.updateConfig');
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Verificar se uma concessão está dentro dos limites configurados
   */
  static async validateGrant(points: number, granterId: string, attendantId: string): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const config = await this.getConfig();
      const errors: string[] = [];
      const warnings: string[] = [];

      // Verificar limites de pontos por concessão
      if (points < config.minPointsPerGrant) {
        errors.push(`Mínimo de ${config.minPointsPerGrant} pontos por concessão`);
      }

      if (points > config.maxPointsPerGrant) {
        errors.push(`Máximo de ${config.maxPointsPerGrant} pontos por concessão`);
      }

      // Verificar limite diário do admin
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayGrants = await prisma.xpGrant.findMany({
        where: {
          grantedBy: granterId,
          grantedAt: {
            gte: today,
            lt: tomorrow
          }
        },
        select: { points: true }
      });

      const todayPoints = todayGrants.reduce((sum, grant) => sum + grant.points, 0);
      const todayCount = todayGrants.length;

      if (todayPoints + points > config.dailyLimitPoints) {
        errors.push(`Limite diário de ${config.dailyLimitPoints} pontos seria excedido (atual: ${todayPoints})`);
      }

      if (todayCount + 1 > config.dailyLimitGrants) {
        errors.push(`Limite diário de ${config.dailyLimitGrants} concessões seria excedido (atual: ${todayCount})`);
      }

      // Verificar limite por atendente
      const attendantGrants = await prisma.xpGrant.count({
        where: {
          attendantId,
          grantedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      if (attendantGrants >= config.maxGrantsPerAttendant) {
        errors.push(`Atendente já recebeu o máximo de ${config.maxGrantsPerAttendant} concessões hoje`);
      }

      // Verificar cooldown
      if (config.cooldownMinutes > 0) {
        const cooldownTime = new Date(Date.now() - config.cooldownMinutes * 60 * 1000);
        const recentGrant = await prisma.xpGrant.findFirst({
          where: {
            attendantId,
            grantedAt: {
              gte: cooldownTime
            }
          },
          orderBy: { grantedAt: 'desc' }
        });

        if (recentGrant) {
          const minutesLeft = Math.ceil((recentGrant.grantedAt.getTime() + config.cooldownMinutes * 60 * 1000 - Date.now()) / (60 * 1000));
          if (minutesLeft > 0) {
            errors.push(`Aguarde ${minutesLeft} minuto(s) antes de conceder XP novamente para este atendente`);
          }
        }
      }

      // Verificar fins de semana e feriados
      const dayOfWeek = today.getDay();
      if (!config.allowWeekendGrants && (dayOfWeek === 0 || dayOfWeek === 6)) {
        errors.push('Concessões não são permitidas nos fins de semana');
      }

      // Avisos
      if (points > config.autoApproveLimit) {
        warnings.push(`Concessão acima do limite de aprovação automática (${config.autoApproveLimit} pontos)`);
      }

      const remainingPoints = config.dailyLimitPoints - todayPoints;
      if (remainingPoints <= config.dailyLimitPoints * 0.1) {
        warnings.push(`Restam apenas ${remainingPoints} pontos do limite diário`);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      logError(error as Error, 'XpAvulsoConfigService.validateGrant');
      return {
        isValid: false,
        errors: ['Erro interno ao validar concessão'],
        warnings: []
      };
    }
  }

  /**
   * Obter estatísticas de uso das configurações
   */
  static async getUsageStats(days: number = 30): Promise<{
    totalGrants: number;
    totalPoints: number;
    averagePointsPerGrant: number;
    topGranters: Array<{
      granterId: string;
      granterName: string;
      totalGrants: number;
      totalPoints: number;
    }>;
    dailyUsage: Array<{
      date: string;
      grants: number;
      points: number;
    }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Estatísticas gerais
      const grants = await prisma.xpGrant.findMany({
        where: {
          grantedAt: { gte: startDate }
        },
        include: {
          granter: {
            select: { id: true, name: true }
          }
        }
      });

      const totalGrants = grants.length;
      const totalPoints = grants.reduce((sum, grant) => sum + grant.points, 0);
      const averagePointsPerGrant = totalGrants > 0 ? totalPoints / totalGrants : 0;

      // Top granters
      const granterStats = new Map<string, { name: string; grants: number; points: number }>();
      grants.forEach(grant => {
        const existing = granterStats.get(grant.grantedBy) || { name: grant.granter.name || 'Desconhecido', grants: 0, points: 0 };
        existing.grants++;
        existing.points += grant.points;
        granterStats.set(grant.grantedBy, existing);
      });

      const topGranters = Array.from(granterStats.entries())
        .map(([granterId, stats]) => ({
          granterId,
          granterName: stats.name,
          totalGrants: stats.grants,
          totalPoints: stats.points
        }))
        .sort((a, b) => b.totalPoints - a.totalPoints)
        .slice(0, 10);

      // Uso diário
      const dailyStats = new Map<string, { grants: number; points: number }>();
      grants.forEach(grant => {
        const date = grant.grantedAt.toISOString().split('T')[0];
        const existing = dailyStats.get(date) || { grants: 0, points: 0 };
        existing.grants++;
        existing.points += grant.points;
        dailyStats.set(date, existing);
      });

      const dailyUsage = Array.from(dailyStats.entries())
        .map(([date, stats]) => ({
          date,
          grants: stats.grants,
          points: stats.points
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalGrants,
        totalPoints,
        averagePointsPerGrant,
        topGranters,
        dailyUsage
      };
    } catch (error) {
      logError(error as Error, 'XpAvulsoConfigService.getUsageStats');
      throw new Error('Erro ao obter estatísticas de uso');
    }
  }

  /**
   * Resetar configurações para valores padrão
   */
  static async resetToDefaults(updatedBy?: string): Promise<XpAvulsoConfig> {
    try {
      const defaultConfig = {
        dailyLimitPoints: 1000,
        dailyLimitGrants: 50,
        maxPointsPerGrant: 200,
        minPointsPerGrant: 1,
        requireJustification: false,
        autoApproveLimit: 50,
        auditRetentionDays: 365,
        enableNotifications: true,
        allowWeekendGrants: true,
        allowHolidayGrants: true,
        maxGrantsPerAttendant: 10,
        cooldownMinutes: 5,
        updatedBy
      };

      return await this.updateConfig(defaultConfig);
    } catch (error) {
      logError(error as Error, 'XpAvulsoConfigService.resetToDefaults');
      throw error;
    }
  }
}