import { XpTypeConfig, XpGrant, Attendant, User } from '@prisma/client';
import { z } from 'zod';
import { handlePrismaError, logError } from '@/lib/errors';
import { GamificationService } from './gamificationService';
import { prisma } from '@/lib/prisma';

// Schemas de validação
export const CreateXpTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
  points: z.number().min(1, 'Pontos devem ser positivos'),
  category: z.string().default('general'),
  icon: z.string().default('star'),
  color: z.string().default('#3B82F6'),
  createdBy: z.string().min(1, 'Criador é obrigatório')
});

export const UpdateXpTypeSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  description: z.string().min(1, 'Descrição é obrigatória').optional(),
  points: z.number().min(1, 'Pontos devem ser positivos').optional(),
  category: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional()
});

export const GrantXpSchema = z.object({
  attendantId: z.string().min(1, 'Atendente é obrigatório'),
  typeId: z.string().min(1, 'Tipo de XP é obrigatório'),
  justification: z.string().optional(),
  grantedBy: z.string().min(1, 'Responsável pela concessão é obrigatório')
});

export const GrantHistoryFiltersSchema = z.object({
  attendantId: z.string().optional(),
  typeId: z.string().optional(),
  granterId: z.string().optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  minPoints: z.number().optional(),
  maxPoints: z.number().optional(),
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  sortBy: z.enum(['grantedAt', 'points', 'attendantName', 'typeName', 'granterName']).default('grantedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
});

export type CreateXpTypeData = z.infer<typeof CreateXpTypeSchema>;
export type UpdateXpTypeData = z.infer<typeof UpdateXpTypeSchema>;
export type GrantXpData = z.infer<typeof GrantXpSchema>;
export type GrantHistoryFilters = z.infer<typeof GrantHistoryFiltersSchema>;

// Tipos para retorno de dados
export interface XpGrantWithRelations extends XpGrant {
  attendant: Attendant;
  type: XpTypeConfig;
  granter: User;
}

export interface GrantStatistics {
  totalGrants: number;
  totalPoints: number;
  averagePoints: number;
  grantsByType: Array<{
    typeId: string;
    typeName: string;
    count: number;
    totalPoints: number;
  }>;
  grantsByGranter: Array<{
    granterId: string;
    granterName: string;
    count: number;
    totalPoints: number;
  }>;
}

export class XpAvulsoService {
  // === GERENCIAMENTO DE TIPOS DE XP ===

  /**
   * Criar novo tipo de XP avulso
   */
  static async createXpType(data: CreateXpTypeData): Promise<XpTypeConfig> {
    try {
      // Validar dados
      const validatedData = CreateXpTypeSchema.parse(data);
      
      // Verificar se nome já existe
      const existingType = await prisma.xpTypeConfig.findUnique({
        where: { name: validatedData.name }
      });
      
      if (existingType) {
        throw new Error('Nome do tipo de XP já está em uso');
      }

      // Verificar se o usuário criador existe
      const creator = await prisma.user.findUnique({
        where: { id: validatedData.createdBy }
      });
      
      if (!creator) {
        throw new Error('Usuário criador não encontrado');
      }

      const xpType = await prisma.xpTypeConfig.create({
        data: {
          name: validatedData.name,
          description: validatedData.description,
          points: validatedData.points,
          category: validatedData.category,
          icon: validatedData.icon,
          color: validatedData.color,
          createdBy: validatedData.createdBy
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return xpType;
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.createXpType');
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Atualizar tipo de XP existente
   */
  static async updateXpType(id: string, data: UpdateXpTypeData): Promise<XpTypeConfig> {
    try {
      // Validar dados
      const validatedData = UpdateXpTypeSchema.parse(data);
      
      // Verificar se tipo existe
      const existingType = await prisma.xpTypeConfig.findUnique({
        where: { id }
      });
      
      if (!existingType) {
        throw new Error('Tipo de XP não encontrado');
      }

      // Verificar nome único se estiver sendo atualizado
      if (validatedData.name && validatedData.name !== existingType.name) {
        const nameExists = await prisma.xpTypeConfig.findUnique({
          where: { name: validatedData.name }
        });
        
        if (nameExists) {
          throw new Error('Nome do tipo de XP já está em uso');
        }
      }

      const xpType = await prisma.xpTypeConfig.update({
        where: { id },
        data: validatedData,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return xpType;
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.updateXpType');
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Buscar todos os tipos de XP
   */
  static async findAllXpTypes(activeOnly: boolean = false): Promise<XpTypeConfig[]> {
    try {
      const where = activeOnly ? { active: true } : {};
      
      return await prisma.xpTypeConfig.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              xpGrants: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.findAllXpTypes');
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  /**
   * Alternar status ativo/inativo de um tipo de XP
   */
  static async toggleXpTypeStatus(id: string): Promise<XpTypeConfig> {
    try {
      // Verificar se tipo existe
      const existingType = await prisma.xpTypeConfig.findUnique({
        where: { id }
      });
      
      if (!existingType) {
        throw new Error('Tipo de XP não encontrado');
      }

      const xpType = await prisma.xpTypeConfig.update({
        where: { id },
        data: {
          active: !existingType.active
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return xpType;
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.toggleXpTypeStatus');
      throw error;
    }
  }

  // === CONCESSÃO DE XP ===

  /**
   * Conceder XP avulso para um atendente
   */
  static async grantXp(data: GrantXpData): Promise<XpGrantWithRelations> {
    try {
      // Validar dados
      const validatedData = GrantXpSchema.parse(data);
      
      // Verificar se existe temporada ativa
      const activeSeason = await GamificationService.findActiveSeason();
      if (!activeSeason) {
        throw new Error('Não há temporada ativa para conceder XP');
      }

      // Verificar se atendente existe
      const attendant = await prisma.attendant.findUnique({
        where: { id: validatedData.attendantId }
      });
      
      if (!attendant) {
        throw new Error('Atendente não encontrado');
      }

      // Verificar se tipo de XP existe e está ativo
      const xpType = await prisma.xpTypeConfig.findUnique({
        where: { id: validatedData.typeId }
      });
      
      if (!xpType) {
        throw new Error('Tipo de XP não encontrado');
      }
      
      if (!xpType.active) {
        throw new Error('Tipo de XP está inativo');
      }

      // Verificar se usuário que está concedendo existe
      const granter = await prisma.user.findUnique({
        where: { id: validatedData.grantedBy }
      });
      
      if (!granter) {
        throw new Error('Usuário responsável pela concessão não encontrado');
      }

      // Validar limites de concessão usando configurações
      const { XpAvulsoConfigService } = await import('./xpAvulsoConfigService');
      const configValidation = await XpAvulsoConfigService.validateGrant(
        xpType.points,
        validatedData.grantedBy,
        validatedData.attendantId
      );

      if (!configValidation.isValid) {
        throw new Error(configValidation.errors.join('; '));
      }

      // Calcular XP total antes da concessão para verificar mudança de nível
      const previousTotalXp = await GamificationService.calculateTotalXp(validatedData.attendantId);

      // Criar concessão em transação
      const result = await prisma.$transaction(async (tx) => {
        // Criar evento XP usando o GamificationService
        const xpEvent = await GamificationService.createXpEvent({
          attendantId: validatedData.attendantId,
          points: xpType.points,
          reason: `XP Avulso: ${xpType.name}${validatedData.justification ? ` - ${validatedData.justification}` : ''}`,
          type: 'manual_grant',
          relatedId: validatedData.typeId
        });

        // Criar registro de concessão
        const xpGrant = await tx.xpGrant.create({
          data: {
            attendantId: validatedData.attendantId,
            typeId: validatedData.typeId,
            points: xpType.points,
            justification: validatedData.justification,
            grantedBy: validatedData.grantedBy,
            xpEventId: xpEvent.id
          },
          include: {
            attendant: true,
            type: true,
            granter: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true
              }
            }
          }
        });

        return xpGrant;
      });

      // Verificar conquistas desbloqueadas após a concessão
      const newTotalXp = await GamificationService.calculateTotalXp(validatedData.attendantId);
      
      // Verificar se houve mudança de nível
      const { getLevelFromXp } = await import('@/lib/xp');
      const previousLevel = getLevelFromXp(previousTotalXp).level;
      const newLevel = getLevelFromXp(newTotalXp).level;

      // Verificar conquistas desbloqueadas
      const achievementsUnlocked = await this.checkAchievementsUnlocked(
        validatedData.attendantId, 
        previousTotalXp, 
        newTotalXp
      );

      // Preparar dados para notificação
      const notificationData = {
        attendantId: validatedData.attendantId,
        xpAmount: xpType.points,
        typeName: xpType.name,
        justification: validatedData.justification,
        levelUp: newLevel > previousLevel ? { previousLevel, newLevel, totalXp: newTotalXp } : null,
        achievementsUnlocked
      };

      // Adicionar dados de notificação ao resultado
      (result as any).notificationData = notificationData;

      return result as XpGrantWithRelations;
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.grantXp');
      if (error instanceof z.ZodError) {
        throw new Error(`Dados inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  }

  /**
   * Buscar histórico de concessões com filtros
   */
  static async findGrantHistory(filters: GrantHistoryFilters): Promise<{
    grants: XpGrantWithRelations[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      // Validar filtros
      const validatedFilters = GrantHistoryFiltersSchema.parse(filters);
      
      // Construir where clause
      const where: any = {};
      
      if (validatedFilters.attendantId) {
        where.attendantId = validatedFilters.attendantId;
      }
      
      if (validatedFilters.typeId) {
        where.typeId = validatedFilters.typeId;
      }
      
      if (validatedFilters.granterId) {
        where.grantedBy = validatedFilters.granterId;
      }
      
      if (validatedFilters.startDate || validatedFilters.endDate) {
        where.grantedAt = {};
        if (validatedFilters.startDate) {
          where.grantedAt.gte = validatedFilters.startDate;
        }
        if (validatedFilters.endDate) {
          where.grantedAt.lte = validatedFilters.endDate;
        }
      }
      
      if (validatedFilters.minPoints || validatedFilters.maxPoints) {
        where.points = {};
        if (validatedFilters.minPoints) {
          where.points.gte = validatedFilters.minPoints;
        }
        if (validatedFilters.maxPoints) {
          where.points.lte = validatedFilters.maxPoints;
        }
      }

      // Construir ordenação
      let orderBy: any = {};
      
      switch (validatedFilters.sortBy) {
        case 'grantedAt':
          orderBy = { grantedAt: validatedFilters.sortOrder };
          break;
        case 'points':
          orderBy = { points: validatedFilters.sortOrder };
          break;
        case 'attendantName':
          orderBy = { attendant: { name: validatedFilters.sortOrder } };
          break;
        case 'typeName':
          orderBy = { type: { name: validatedFilters.sortOrder } };
          break;
        case 'granterName':
          orderBy = { granter: { name: validatedFilters.sortOrder } };
          break;
        default:
          orderBy = { grantedAt: 'desc' };
      }

      // Calcular offset
      const offset = (validatedFilters.page - 1) * validatedFilters.limit;

      // Buscar total de registros
      const total = await prisma.xpGrant.count({ where });

      // Buscar concessões
      const grants = await prisma.xpGrant.findMany({
        where,
        include: {
          attendant: true,
          type: true,
          granter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy,
        skip: offset,
        take: validatedFilters.limit
      });

      const totalPages = Math.ceil(total / validatedFilters.limit);

      return {
        grants: grants as XpGrantWithRelations[],
        total,
        page: validatedFilters.page,
        totalPages
      };
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.findGrantHistory');
      if (error instanceof z.ZodError) {
        throw new Error(`Filtros inválidos: ${error.errors.map(e => e.message).join(', ')}`);
      }
      const dbError = handlePrismaError(error);
      throw dbError;
    }
  }

  /**
   * Buscar concessões de um atendente específico
   */
  static async findGrantsByAttendant(attendantId: string): Promise<XpGrantWithRelations[]> {
    try {
      // Verificar se atendente existe
      const attendant = await prisma.attendant.findUnique({
        where: { id: attendantId }
      });
      
      if (!attendant) {
        throw new Error('Atendente não encontrado');
      }

      const grants = await prisma.xpGrant.findMany({
        where: { attendantId },
        include: {
          attendant: true,
          type: true,
          granter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy: {
          grantedAt: 'desc'
        }
      });

      return grants as XpGrantWithRelations[];
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.findGrantsByAttendant');
      throw error;
    }
  }

  /**
   * Buscar concessões de um atendente específico com ordenação customizável
   */
  static async findGrantsByAttendantWithSort(
    attendantId: string, 
    sortBy: 'grantedAt' | 'points' | 'typeName' | 'granterName' = 'grantedAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): Promise<XpGrantWithRelations[]> {
    try {
      // Verificar se atendente existe
      const attendant = await prisma.attendant.findUnique({
        where: { id: attendantId }
      });
      
      if (!attendant) {
        throw new Error('Atendente não encontrado');
      }

      // Construir ordenação
      let orderBy: any = {};
      
      switch (sortBy) {
        case 'grantedAt':
          orderBy = { grantedAt: sortOrder };
          break;
        case 'points':
          orderBy = { points: sortOrder };
          break;
        case 'typeName':
          orderBy = { type: { name: sortOrder } };
          break;
        case 'granterName':
          orderBy = { granter: { name: sortOrder } };
          break;
        default:
          orderBy = { grantedAt: 'desc' };
      }

      const grants = await prisma.xpGrant.findMany({
        where: { attendantId },
        include: {
          attendant: true,
          type: true,
          granter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        },
        orderBy
      });

      return grants as XpGrantWithRelations[];
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.findGrantsByAttendantWithSort');
      throw error;
    }
  }

  // === VALIDAÇÕES E LIMITES ===

  /**
   * Validar limites de concessão por usuário
   */
  static async validateGrantLimits(granterId: string, points: number): Promise<void> {
    try {
      // Definir limites (podem ser configuráveis no futuro)
      const DAILY_LIMIT_POINTS = 1000; // Limite diário de pontos por administrador
      const DAILY_LIMIT_GRANTS = 50;   // Limite diário de concessões por administrador

      // Calcular início do dia atual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Buscar concessões do dia
      const todayGrants = await prisma.xpGrant.findMany({
        where: {
          grantedBy: granterId,
          grantedAt: {
            gte: today,
            lt: tomorrow
          }
        }
      });

      // Verificar limite de concessões
      if (todayGrants.length >= DAILY_LIMIT_GRANTS) {
        throw new Error(`Limite diário de concessões atingido (${DAILY_LIMIT_GRANTS})`);
      }

      // Verificar limite de pontos
      const todayPoints = todayGrants.reduce((sum, grant) => sum + grant.points, 0);
      if (todayPoints + points > DAILY_LIMIT_POINTS) {
        throw new Error(`Limite diário de pontos atingido (${DAILY_LIMIT_POINTS})`);
      }

    } catch (error) {
      logError(error as Error, 'XpAvulsoService.validateGrantLimits');
      throw error;
    }
  }

  /**
   * Verificar conquistas desbloqueadas após concessão de XP
   */
  static async checkAchievementsUnlocked(
    attendantId: string, 
    previousXp: number, 
    newXp: number
  ): Promise<Array<{ id: string; title: string; description: string; }>> {
    try {
      // Buscar conquistas baseadas em XP que podem ter sido desbloqueadas
      const achievements = await prisma.achievementConfig.findMany({
        where: {
          active: true,
          criteria: {
            path: ['xp'],
            not: null
          }
        }
      });

      const unlockedAchievements = [];

      for (const achievement of achievements) {
        const criteria = achievement.criteria as any;
        
        // Verificar se é baseado em XP total
        if (criteria.xp && typeof criteria.xp === 'number') {
          const requiredXp = criteria.xp;
          
          // Se o XP anterior era menor que o necessário e o novo XP é maior ou igual
          if (previousXp < requiredXp && newXp >= requiredXp) {
            // Verificar se já não foi desbloqueada antes
            const existingUnlock = await prisma.attendantAchievement.findFirst({
              where: {
                attendantId,
                achievementId: achievement.id
              }
            });

            if (!existingUnlock) {
              // Desbloquear conquista
              await prisma.attendantAchievement.create({
                data: {
                  attendantId,
                  achievementId: achievement.id,
                  unlockedAt: new Date(),
                  progress: 100
                }
              });

              unlockedAchievements.push({
                id: achievement.id,
                title: achievement.title,
                description: achievement.description
              });
            }
          }
        }
      }

      return unlockedAchievements;
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.checkAchievementsUnlocked');
      return []; // Retornar array vazio em caso de erro para não quebrar o fluxo
    }
  }

  /**
   * Obter estatísticas de concessões
   */
  static async getGrantStatistics(period: string = '30d', userId?: string): Promise<GrantStatistics> {
    try {
      // Calcular período
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
        default:
          startDate.setDate(startDate.getDate() - 30);
      }

      // Buscar concessões do período
      const whereClause: any = {
        grantedAt: {
          gte: startDate,
          lte: endDate
        }
      };

      // Filtrar por usuário se especificado
      if (userId) {
        whereClause.grantedBy = userId;
      }

      const grants = await prisma.xpGrant.findMany({
        where: whereClause,
        include: {
          type: true,
          granter: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });

      // Calcular estatísticas básicas
      const totalGrants = grants.length;
      const totalPoints = grants.reduce((sum, grant) => sum + grant.points, 0);
      const averagePoints = totalGrants > 0 ? totalPoints / totalGrants : 0;

      // Agrupar por tipo
      const grantsByTypeMap = new Map<string, { typeName: string; count: number; totalPoints: number }>();
      
      grants.forEach(grant => {
        const existing = grantsByTypeMap.get(grant.typeId) || {
          typeName: grant.type.name,
          count: 0,
          totalPoints: 0
        };
        
        existing.count++;
        existing.totalPoints += grant.points;
        grantsByTypeMap.set(grant.typeId, existing);
      });

      const grantsByType = Array.from(grantsByTypeMap.entries()).map(([typeId, data]) => ({
        typeId,
        ...data
      }));

      // Agrupar por responsável
      const grantsByGranterMap = new Map<string, { granterName: string; count: number; totalPoints: number }>();
      
      grants.forEach(grant => {
        const existing = grantsByGranterMap.get(grant.grantedBy) || {
          granterName: grant.granter.name,
          count: 0,
          totalPoints: 0
        };
        
        existing.count++;
        existing.totalPoints += grant.points;
        grantsByGranterMap.set(grant.grantedBy, existing);
      });

      const grantsByGranter = Array.from(grantsByGranterMap.entries()).map(([granterId, data]) => ({
        granterId,
        ...data
      }));

      return {
        totalGrants,
        totalPoints,
        averagePoints,
        grantsByType,
        grantsByGranter
      };
    } catch (error) {
      logError(error as Error, 'XpAvulsoService.getGrantStatistics');
      throw error;
    }
  }
}