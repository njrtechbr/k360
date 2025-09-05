/**
 * @jest-environment node
 */
import { 
  XpAvulsoService, 
  GrantXpSchema, 
  GrantHistoryFiltersSchema,
  CreateXpTypeSchema,
  UpdateXpTypeSchema
} from '../xpAvulsoService';
import { GamificationService } from '../gamificationService';

// Mock do Prisma Client
jest.mock('@/lib/prisma', () => ({
  prisma: {
    xpTypeConfig: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    xpGrant: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    attendant: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    achievementConfig: {
      findMany: jest.fn(),
    },
    attendantAchievement: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock do GamificationService
jest.mock('../gamificationService', () => ({
  GamificationService: {
    findActiveSeason: jest.fn(),
    createXpEvent: jest.fn(),
    calculateTotalXp: jest.fn(),
  },
}));

// Mock das funções de erro
jest.mock('@/lib/errors', () => ({
  logError: jest.fn(),
  handlePrismaError: jest.fn((error) => error),
}));

// Mock das funções de XP
jest.mock('@/lib/xp', () => ({
  getLevelFromXp: jest.fn((xp) => ({ level: Math.floor(xp / 1000) + 1 })),
}));

const mockPrisma = require('@/lib/prisma').prisma;
const mockGamificationService = GamificationService as jest.Mocked<typeof GamificationService>;

describe('XpAvulsoService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Schemas', () => {
    describe('CreateXpTypeSchema', () => {
      it('deve validar dados válidos', () => {
        const validData = {
          name: 'Excelência no Atendimento',
          description: 'Reconhecimento por atendimento excepcional',
          points: 100,
          category: 'atendimento',
          icon: 'star',
          color: '#FFD700',
          createdBy: 'user-123'
        };

        const result = CreateXpTypeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it('deve rejeitar pontos negativos', () => {
        const invalidData = {
          name: 'Teste',
          description: 'Teste',
          points: -10,
          createdBy: 'user-123'
        };

        const result = CreateXpTypeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it('deve aplicar valores padrão', () => {
        const data = {
          name: 'Teste',
          description: 'Teste',
          points: 50,
          createdBy: 'user-123'
        };

        const result = CreateXpTypeSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.category).toBe('general');
          expect(result.data.icon).toBe('star');
          expect(result.data.color).toBe('#3B82F6');
        }
      });
    });

    describe('GrantXpSchema', () => {
      it('deve validar dados válidos', () => {
        const validData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          grantedBy: 'user-123',
          justification: 'Excelente trabalho'
        };

        const result = GrantXpSchema.safeParse(validData);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attendantId).toBe('att-123');
          expect(result.data.typeId).toBe('type-123');
          expect(result.data.grantedBy).toBe('user-123');
          expect(result.data.justification).toBe('Excelente trabalho');
        }
      });

      it('deve rejeitar dados inválidos', () => {
        const invalidData = {
          attendantId: '',
          typeId: '',
          grantedBy: ''
        };

        const result = GrantXpSchema.safeParse(invalidData);
        
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.errors.length).toBeGreaterThan(0);
        }
      });
    });

    describe('GrantHistoryFiltersSchema', () => {
      it('deve validar filtros básicos', () => {
        const validFilters = {
          page: 1,
          limit: 20
        };

        const result = GrantHistoryFiltersSchema.safeParse(validFilters);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.page).toBe(1);
          expect(result.data.limit).toBe(20);
          expect(result.data.sortBy).toBe('grantedAt');
          expect(result.data.sortOrder).toBe('desc');
        }
      });

      it('deve validar filtros com ordenação customizada', () => {
        const validFilters = {
          page: 1,
          limit: 10,
          sortBy: 'points' as const,
          sortOrder: 'asc' as const,
          attendantId: 'att-123'
        };

        const result = GrantHistoryFiltersSchema.safeParse(validFilters);
        
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sortBy).toBe('points');
          expect(result.data.sortOrder).toBe('asc');
          expect(result.data.attendantId).toBe('att-123');
        }
      });

      it('deve rejeitar sortBy inválido', () => {
        const invalidFilters = {
          page: 1,
          limit: 20,
          sortBy: 'invalid'
        };

        const result = GrantHistoryFiltersSchema.safeParse(invalidFilters);
        expect(result.success).toBe(false);
      });

      it('deve rejeitar sortOrder inválido', () => {
        const invalidFilters = {
          page: 1,
          limit: 20,
          sortOrder: 'invalid'
        };

        const result = GrantHistoryFiltersSchema.safeParse(invalidFilters);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Gerenciamento de Tipos de XP', () => {
    describe('createXpType', () => {
      it('deve criar tipo de XP com sucesso', async () => {
        const mockUser = { id: 'user-123', name: 'Admin', email: 'admin@test.com' };
        const mockXpType = {
          id: 'type-123',
          name: 'Excelência',
          description: 'Reconhecimento por excelência',
          points: 100,
          active: true,
          category: 'atendimento',
          icon: 'star',
          color: '#FFD700',
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          creator: mockUser
        };

        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue(mockUser);
        mockPrisma.xpTypeConfig.create.mockResolvedValue(mockXpType);

        const data = {
          name: 'Excelência',
          description: 'Reconhecimento por excelência',
          points: 100,
          category: 'atendimento',
          icon: 'star',
          color: '#FFD700',
          createdBy: 'user-123'
        };

        const result = await XpAvulsoService.createXpType(data);

        expect(result).toEqual(mockXpType);
        expect(mockPrisma.xpTypeConfig.findUnique).toHaveBeenCalledWith({
          where: { name: 'Excelência' }
        });
        expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
          where: { id: 'user-123' }
        });
        expect(mockPrisma.xpTypeConfig.create).toHaveBeenCalledWith({
          data: {
            name: 'Excelência',
            description: 'Reconhecimento por excelência',
            points: 100,
            category: 'atendimento',
            icon: 'star',
            color: '#FFD700',
            createdBy: 'user-123'
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
      });

      it('deve rejeitar nome duplicado', async () => {
        const existingType = { id: 'existing-type', name: 'Excelência' };
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(existingType);

        const data = {
          name: 'Excelência',
          description: 'Teste',
          points: 100,
          category: 'general',
          icon: 'star',
          color: '#3B82F6',
          createdBy: 'user-123'
        };

        await expect(XpAvulsoService.createXpType(data)).rejects.toThrow('Nome do tipo de XP já está em uso');
      });

      it('deve rejeitar usuário inexistente', async () => {
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(null);
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const data = {
          name: 'Teste',
          description: 'Teste',
          points: 100,
          category: 'general',
          icon: 'star',
          color: '#3B82F6',
          createdBy: 'user-inexistente'
        };

        await expect(XpAvulsoService.createXpType(data)).rejects.toThrow('Usuário criador não encontrado');
      });
    });

    describe('updateXpType', () => {
      it('deve atualizar tipo de XP com sucesso', async () => {
        const existingType = {
          id: 'type-123',
          name: 'Excelência',
          description: 'Descrição antiga',
          points: 50
        };
        const updatedType = {
          ...existingType,
          description: 'Nova descrição',
          points: 100,
          creator: { id: 'user-123', name: 'Admin', email: 'admin@test.com' }
        };

        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(existingType);
        mockPrisma.xpTypeConfig.update.mockResolvedValue(updatedType);

        const updateData = {
          description: 'Nova descrição',
          points: 100
        };

        const result = await XpAvulsoService.updateXpType('type-123', updateData);

        expect(result).toEqual(updatedType);
        expect(mockPrisma.xpTypeConfig.update).toHaveBeenCalledWith({
          where: { id: 'type-123' },
          data: updateData,
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
      });

      it('deve rejeitar tipo inexistente', async () => {
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(null);

        await expect(XpAvulsoService.updateXpType('type-inexistente', { points: 100 }))
          .rejects.toThrow('Tipo de XP não encontrado');
      });

      it('deve rejeitar nome duplicado na atualização', async () => {
        const existingType = { id: 'type-123', name: 'Excelência' };
        const duplicateType = { id: 'type-456', name: 'Outro Nome' };

        mockPrisma.xpTypeConfig.findUnique
          .mockResolvedValueOnce(existingType)
          .mockResolvedValueOnce(duplicateType);

        await expect(XpAvulsoService.updateXpType('type-123', { name: 'Outro Nome' }))
          .rejects.toThrow('Nome do tipo de XP já está em uso');
      });
    });

    describe('findAllXpTypes', () => {
      it('deve buscar todos os tipos quando activeOnly é false', async () => {
        const mockTypes = [
          { id: 'type-1', name: 'Tipo 1', active: true },
          { id: 'type-2', name: 'Tipo 2', active: false }
        ];

        mockPrisma.xpTypeConfig.findMany.mockResolvedValue(mockTypes);

        const result = await XpAvulsoService.findAllXpTypes(false);

        expect(result).toEqual(mockTypes);
        expect(mockPrisma.xpTypeConfig.findMany).toHaveBeenCalledWith({
          where: {},
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
      });

      it('deve buscar apenas tipos ativos quando activeOnly é true', async () => {
        const mockTypes = [
          { id: 'type-1', name: 'Tipo 1', active: true }
        ];

        mockPrisma.xpTypeConfig.findMany.mockResolvedValue(mockTypes);

        const result = await XpAvulsoService.findAllXpTypes(true);

        expect(result).toEqual(mockTypes);
        expect(mockPrisma.xpTypeConfig.findMany).toHaveBeenCalledWith({
          where: { active: true },
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
      });
    });

    describe('toggleXpTypeStatus', () => {
      it('deve alternar status de ativo para inativo', async () => {
        const existingType = { id: 'type-123', active: true };
        const updatedType = { 
          ...existingType, 
          active: false,
          creator: { id: 'user-123', name: 'Admin', email: 'admin@test.com' }
        };

        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(existingType);
        mockPrisma.xpTypeConfig.update.mockResolvedValue(updatedType);

        const result = await XpAvulsoService.toggleXpTypeStatus('type-123');

        expect(result).toEqual(updatedType);
        expect(mockPrisma.xpTypeConfig.update).toHaveBeenCalledWith({
          where: { id: 'type-123' },
          data: { active: false },
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
      });

      it('deve rejeitar tipo inexistente', async () => {
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(null);

        await expect(XpAvulsoService.toggleXpTypeStatus('type-inexistente'))
          .rejects.toThrow('Tipo de XP não encontrado');
      });
    });
  });

  describe('Concessão de XP', () => {
    describe('grantXp', () => {
      const mockActiveSeason = { 
        id: 'season-123', 
        name: 'Temporada Teste',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31'),
        active: true,
        xpMultiplier: 1.0,
        createdAt: new Date()
      };
      const mockAttendant = { id: 'att-123', name: 'João Silva' };
      const mockXpType = { id: 'type-123', name: 'Excelência', points: 100, active: true };
      const mockGranter = { id: 'user-123', name: 'Admin', email: 'admin@test.com' };
      const mockXpEvent = { 
        id: 'event-123', 
        createdAt: new Date(),
        type: 'manual_grant',
        attendantId: 'att-123',
        points: 100,
        basePoints: 100,
        multiplier: 1.0,
        reason: 'XP Avulso: Excelência',
        date: new Date(),
        relatedId: 'type-123',
        seasonId: 'season-123'
      };

      beforeEach(() => {
        mockGamificationService.findActiveSeason.mockResolvedValue(mockActiveSeason);
        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(mockXpType);
        mockPrisma.user.findUnique.mockResolvedValue(mockGranter);
        mockGamificationService.createXpEvent.mockResolvedValue(mockXpEvent);
        mockGamificationService.calculateTotalXp.mockResolvedValue(1500);
        
        // Mock da validação de limites
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);
      });

      it('deve conceder XP com sucesso', async () => {
        const mockGrant = {
          id: 'grant-123',
          attendantId: 'att-123',
          typeId: 'type-123',
          points: 100,
          justification: 'Excelente trabalho',
          grantedBy: 'user-123',
          grantedAt: new Date(),
          xpEventId: 'event-123',
          attendant: mockAttendant,
          type: mockXpType,
          granter: mockGranter
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            xpGrant: {
              create: jest.fn().mockResolvedValue(mockGrant)
            }
          });
        });

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          justification: 'Excelente trabalho',
          grantedBy: 'user-123'
        };

        const result = await XpAvulsoService.grantXp(grantData);

        expect(result).toEqual(mockGrant);
        expect(mockGamificationService.findActiveSeason).toHaveBeenCalled();
        expect(mockPrisma.attendant.findUnique).toHaveBeenCalledWith({
          where: { id: 'att-123' }
        });
        expect(mockPrisma.xpTypeConfig.findUnique).toHaveBeenCalledWith({
          where: { id: 'type-123' }
        });
        expect(mockGamificationService.createXpEvent).toHaveBeenCalledWith({
          attendantId: 'att-123',
          points: 100,
          reason: 'XP Avulso: Excelência - Excelente trabalho',
          type: 'manual_grant',
          relatedId: 'type-123'
        });
      });

      it('deve rejeitar quando não há temporada ativa', async () => {
        mockGamificationService.findActiveSeason.mockResolvedValue(null);

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          grantedBy: 'user-123'
        };

        await expect(XpAvulsoService.grantXp(grantData))
          .rejects.toThrow('Não há temporada ativa para conceder XP');
      });

      it('deve rejeitar atendente inexistente', async () => {
        mockPrisma.attendant.findUnique.mockResolvedValue(null);

        const grantData = {
          attendantId: 'att-inexistente',
          typeId: 'type-123',
          grantedBy: 'user-123'
        };

        await expect(XpAvulsoService.grantXp(grantData))
          .rejects.toThrow('Atendente não encontrado');
      });

      it('deve rejeitar tipo de XP inexistente', async () => {
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(null);

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-inexistente',
          grantedBy: 'user-123'
        };

        await expect(XpAvulsoService.grantXp(grantData))
          .rejects.toThrow('Tipo de XP não encontrado');
      });

      it('deve rejeitar tipo de XP inativo', async () => {
        const inactiveType = { ...mockXpType, active: false };
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(inactiveType);

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          grantedBy: 'user-123'
        };

        await expect(XpAvulsoService.grantXp(grantData))
          .rejects.toThrow('Tipo de XP está inativo');
      });

      it('deve rejeitar usuário inexistente', async () => {
        mockPrisma.user.findUnique.mockResolvedValue(null);

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          grantedBy: 'user-inexistente'
        };

        await expect(XpAvulsoService.grantXp(grantData))
          .rejects.toThrow('Usuário responsável pela concessão não encontrado');
      });
    });

    describe('validateGrantLimits', () => {
      it('deve passar quando dentro dos limites', async () => {
        // Mock de concessões do dia (vazio = dentro do limite)
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);

        await expect(XpAvulsoService.validateGrantLimits('user-123', 100))
          .resolves.not.toThrow();
      });

      it('deve rejeitar quando excede limite de concessões diárias', async () => {
        // Mock de 50 concessões (limite)
        const mockGrants = Array.from({ length: 50 }, (_, i) => ({
          id: `grant-${i}`,
          points: 10,
          grantedBy: 'user-123'
        }));
        
        mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants);

        await expect(XpAvulsoService.validateGrantLimits('user-123', 100))
          .rejects.toThrow('Limite diário de concessões atingido (50)');
      });

      it('deve rejeitar quando excede limite de pontos diários', async () => {
        // Mock de concessões que somam 950 pontos + 100 novos = 1050 (excede limite de 1000)
        const mockGrants = Array.from({ length: 19 }, (_, i) => ({
          id: `grant-${i}`,
          points: 50,
          grantedBy: 'user-123'
        }));
        
        mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants);

        await expect(XpAvulsoService.validateGrantLimits('user-123', 100))
          .rejects.toThrow('Limite diário de pontos atingido (1000)');
      });
    });
  });

  describe('Histórico e Consultas', () => {
    describe('findGrantHistory', () => {
      it('deve buscar histórico com filtros básicos', async () => {
        const mockGrants = [
          {
            id: 'grant-1',
            attendantId: 'att-123',
            typeId: 'type-123',
            points: 100,
            grantedAt: new Date(),
            attendant: { id: 'att-123', name: 'João' },
            type: { id: 'type-123', name: 'Excelência' },
            granter: { id: 'user-123', name: 'Admin' }
          }
        ];

        mockPrisma.xpGrant.count.mockResolvedValue(1);
        mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants);

        const filters = { 
          page: 1, 
          limit: 20,
          sortBy: 'grantedAt' as const,
          sortOrder: 'desc' as const
        };
        const result = await XpAvulsoService.findGrantHistory(filters);

        expect(result.grants).toEqual(mockGrants);
        expect(result.total).toBe(1);
        expect(result.page).toBe(1);
        expect(result.totalPages).toBe(1);
      });

      it('deve aplicar filtros corretamente', async () => {
        mockPrisma.xpGrant.count.mockResolvedValue(0);
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);

        const filters = {
          attendantId: 'att-123',
          typeId: 'type-123',
          granterId: 'user-123',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          minPoints: 50,
          maxPoints: 200,
          page: 1,
          limit: 10,
          sortBy: 'points' as const,
          sortOrder: 'asc' as const
        };

        await XpAvulsoService.findGrantHistory(filters);

        expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith({
          where: {
            attendantId: 'att-123',
            typeId: 'type-123',
            grantedBy: 'user-123',
            grantedAt: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-12-31')
            },
            points: {
              gte: 50,
              lte: 200
            }
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
          },
          orderBy: { points: 'asc' },
          skip: 0,
          take: 10
        });
      });
    });

    describe('findGrantsByAttendant', () => {
      it('deve buscar concessões de um atendente específico', async () => {
        const mockAttendant = { id: 'att-123', name: 'João Silva' };
        const mockGrants = [
          {
            id: 'grant-1',
            attendantId: 'att-123',
            points: 100,
            attendant: mockAttendant,
            type: { name: 'Excelência' },
            granter: { name: 'Admin' }
          }
        ];

        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants);

        const result = await XpAvulsoService.findGrantsByAttendant('att-123');

        expect(result).toEqual(mockGrants);
        expect(mockPrisma.attendant.findUnique).toHaveBeenCalledWith({
          where: { id: 'att-123' }
        });
      });

      it('deve rejeitar atendente inexistente', async () => {
        mockPrisma.attendant.findUnique.mockResolvedValue(null);

        await expect(XpAvulsoService.findGrantsByAttendant('att-inexistente'))
          .rejects.toThrow('Atendente não encontrado');
      });
    });

    describe('getGrantStatistics', () => {
      it('deve calcular estatísticas corretamente', async () => {
        const mockGrants = [
          {
            id: 'grant-1',
            typeId: 'type-1',
            grantedBy: 'user-1',
            points: 100,
            type: { name: 'Excelência' },
            granter: { id: 'user-1', name: 'Admin 1' }
          },
          {
            id: 'grant-2',
            typeId: 'type-1',
            grantedBy: 'user-2',
            points: 50,
            type: { name: 'Excelência' },
            granter: { id: 'user-2', name: 'Admin 2' }
          }
        ];

        mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants);

        const result = await XpAvulsoService.getGrantStatistics('30d');

        expect(result.totalGrants).toBe(2);
        expect(result.totalPoints).toBe(150);
        expect(result.averagePoints).toBe(75);
        expect(result.grantsByType).toHaveLength(1);
        expect(result.grantsByType[0]).toEqual({
          typeId: 'type-1',
          typeName: 'Excelência',
          count: 2,
          totalPoints: 150
        });
        expect(result.grantsByGranter).toHaveLength(2);
      });

      it('deve filtrar por usuário quando especificado', async () => {
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);

        await XpAvulsoService.getGrantStatistics('30d', 'user-123');

        expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith({
          where: expect.objectContaining({
            grantedBy: 'user-123'
          }),
          include: expect.any(Object)
        });
      });
    });

    describe('findGrantsByAttendantWithSort', () => {
      it('deve buscar concessões com ordenação customizada', async () => {
        const mockAttendant = { id: 'att-123', name: 'João Silva' };
        const mockGrants = [
          {
            id: 'grant-1',
            attendantId: 'att-123',
            points: 100,
            attendant: mockAttendant,
            type: { name: 'Excelência' },
            granter: { name: 'Admin' }
          }
        ];

        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants);

        const result = await XpAvulsoService.findGrantsByAttendantWithSort('att-123', 'points', 'asc');

        expect(result).toEqual(mockGrants);
        expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith({
          where: { attendantId: 'att-123' },
          include: expect.any(Object),
          orderBy: { points: 'asc' }
        });
      });

      it('deve usar ordenação padrão quando sortBy é inválido', async () => {
        const mockAttendant = { id: 'att-123', name: 'João Silva' };
        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);

        await XpAvulsoService.findGrantsByAttendantWithSort('att-123', 'invalid' as any);

        expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith({
          where: { attendantId: 'att-123' },
          include: expect.any(Object),
          orderBy: { grantedAt: 'desc' }
        });
      });
    });

    describe('checkAchievementsUnlocked', () => {
      it('deve desbloquear conquistas baseadas em XP', async () => {
        const mockAchievements = [
          {
            id: 'achievement-1',
            title: 'Primeira Conquista',
            description: 'Alcançar 100 XP',
            active: true,
            criteria: { xp: 100 }
          }
        ];

        mockPrisma.achievementConfig.findMany.mockResolvedValue(mockAchievements);
        mockPrisma.attendantAchievement.findFirst.mockResolvedValue(null);
        mockPrisma.attendantAchievement.create.mockResolvedValue({
          id: 'unlock-1',
          attendantId: 'att-123',
          achievementId: 'achievement-1',
          unlockedAt: new Date(),
          progress: 100
        });

        const result = await XpAvulsoService.checkAchievementsUnlocked('att-123', 50, 150);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          id: 'achievement-1',
          title: 'Primeira Conquista',
          description: 'Alcançar 100 XP'
        });
      });

      it('deve não desbloquear conquistas já obtidas', async () => {
        const mockAchievements = [
          {
            id: 'achievement-1',
            title: 'Primeira Conquista',
            description: 'Alcançar 100 XP',
            active: true,
            criteria: { xp: 100 }
          }
        ];

        const existingUnlock = {
          id: 'unlock-1',
          attendantId: 'att-123',
          achievementId: 'achievement-1'
        };

        mockPrisma.achievementConfig.findMany.mockResolvedValue(mockAchievements);
        mockPrisma.attendantAchievement.findFirst.mockResolvedValue(existingUnlock);

        const result = await XpAvulsoService.checkAchievementsUnlocked('att-123', 50, 150);

        expect(result).toHaveLength(0);
        expect(mockPrisma.attendantAchievement.create).not.toHaveBeenCalled();
      });

      it('deve retornar array vazio em caso de erro', async () => {
        mockPrisma.achievementConfig.findMany.mockRejectedValue(new Error('Database error'));

        const result = await XpAvulsoService.checkAchievementsUnlocked('att-123', 50, 150);

        expect(result).toEqual([]);
      });
    });

    describe('Testes de Integração com GamificationService', () => {
      it('deve integrar corretamente com createXpEvent', async () => {
        const mockActiveSeason = { 
          id: 'season-123', 
          name: 'Temporada Teste',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          active: true,
          xpMultiplier: 1.0,
          createdAt: new Date()
        };
        const mockAttendant = { id: 'att-123', name: 'João Silva' };
        const mockXpType = { id: 'type-123', name: 'Excelência', points: 100, active: true };
        const mockGranter = { id: 'user-123', name: 'Admin', email: 'admin@test.com' };
        const mockXpEvent = { 
          id: 'event-123', 
          createdAt: new Date(),
          type: 'manual_grant',
          attendantId: 'att-123',
          points: 100,
          basePoints: 100,
          multiplier: 1.0,
          reason: 'XP Avulso: Excelência - Teste integração',
          date: new Date(),
          relatedId: 'type-123',
          seasonId: 'season-123'
        };

        mockGamificationService.findActiveSeason.mockResolvedValue(mockActiveSeason);
        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(mockXpType);
        mockPrisma.user.findUnique.mockResolvedValue(mockGranter);
        mockGamificationService.createXpEvent.mockResolvedValue(mockXpEvent);
        mockGamificationService.calculateTotalXp.mockResolvedValue(1500);
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);

        const mockGrant = {
          id: 'grant-123',
          attendantId: 'att-123',
          typeId: 'type-123',
          points: 100,
          justification: 'Teste integração',
          grantedBy: 'user-123',
          grantedAt: new Date(),
          xpEventId: 'event-123',
          attendant: mockAttendant,
          type: mockXpType,
          granter: mockGranter
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            xpGrant: {
              create: jest.fn().mockResolvedValue(mockGrant)
            }
          });
        });

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          justification: 'Teste integração',
          grantedBy: 'user-123'
        };

        await XpAvulsoService.grantXp(grantData);

        expect(mockGamificationService.createXpEvent).toHaveBeenCalledWith({
          attendantId: 'att-123',
          points: 100,
          reason: 'XP Avulso: Excelência - Teste integração',
          type: 'manual_grant',
          relatedId: 'type-123'
        });
      });

      it('deve calcular XP total antes e depois da concessão', async () => {
        const mockActiveSeason = { 
          id: 'season-123', 
          name: 'Temporada Teste',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          active: true,
          xpMultiplier: 1.0,
          createdAt: new Date()
        };
        const mockAttendant = { id: 'att-123', name: 'João Silva' };
        const mockXpType = { id: 'type-123', name: 'Excelência', points: 100, active: true };
        const mockGranter = { id: 'user-123', name: 'Admin', email: 'admin@test.com' };
        const mockXpEvent = { 
          id: 'event-123', 
          createdAt: new Date(),
          type: 'manual_grant',
          attendantId: 'att-123',
          points: 100,
          basePoints: 100,
          multiplier: 1.0,
          reason: 'XP Avulso: Excelência',
          date: new Date(),
          relatedId: 'type-123',
          seasonId: 'season-123'
        };

        mockGamificationService.findActiveSeason.mockResolvedValue(mockActiveSeason);
        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(mockXpType);
        mockPrisma.user.findUnique.mockResolvedValue(mockGranter);
        mockGamificationService.createXpEvent.mockResolvedValue(mockXpEvent);
        
        // Mock XP antes e depois
        mockGamificationService.calculateTotalXp
          .mockResolvedValueOnce(900) // XP antes
          .mockResolvedValueOnce(1000); // XP depois
        
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);
        mockPrisma.achievementConfig.findMany.mockResolvedValue([]);

        const mockGrant = {
          id: 'grant-123',
          attendantId: 'att-123',
          typeId: 'type-123',
          points: 100,
          grantedBy: 'user-123',
          grantedAt: new Date(),
          xpEventId: 'event-123',
          attendant: mockAttendant,
          type: mockXpType,
          granter: mockGranter
        };

        mockPrisma.$transaction.mockImplementation(async (callback: any) => {
          return callback({
            xpGrant: {
              create: jest.fn().mockResolvedValue(mockGrant)
            }
          });
        });

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          grantedBy: 'user-123'
        };

        await XpAvulsoService.grantXp(grantData);

        expect(mockGamificationService.calculateTotalXp).toHaveBeenCalledTimes(2);
        expect(mockGamificationService.calculateTotalXp).toHaveBeenNthCalledWith(1, 'att-123');
        expect(mockGamificationService.calculateTotalXp).toHaveBeenNthCalledWith(2, 'att-123');
      });
    });

    describe('Testes de Tratamento de Erros', () => {
      it('deve tratar erros do Prisma corretamente', async () => {
        const prismaError = new Error('Database connection failed');
        mockPrisma.xpTypeConfig.findMany.mockRejectedValue(prismaError);

        await expect(XpAvulsoService.findAllXpTypes()).rejects.toThrow();
      });

      it('deve tratar erros de validação Zod', async () => {
        const invalidData = {
          name: '', // Nome vazio
          description: 'Teste',
          points: -10, // Pontos negativos
          createdBy: 'user-123'
        };

        await expect(XpAvulsoService.createXpType(invalidData as any)).rejects.toThrow('Dados inválidos');
      });

      it('deve tratar erros na transação de concessão', async () => {
        const mockActiveSeason = { 
          id: 'season-123', 
          name: 'Temporada Teste',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-12-31'),
          active: true,
          xpMultiplier: 1.0,
          createdAt: new Date()
        };
        const mockAttendant = { id: 'att-123', name: 'João Silva' };
        const mockXpType = { id: 'type-123', name: 'Excelência', points: 100, active: true };
        const mockGranter = { id: 'user-123', name: 'Admin', email: 'admin@test.com' };

        mockGamificationService.findActiveSeason.mockResolvedValue(mockActiveSeason);
        mockPrisma.attendant.findUnique.mockResolvedValue(mockAttendant);
        mockPrisma.xpTypeConfig.findUnique.mockResolvedValue(mockXpType);
        mockPrisma.user.findUnique.mockResolvedValue(mockGranter);
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);
        
        // Simular erro na criação do XpEvent
        mockGamificationService.createXpEvent.mockRejectedValue(new Error('Failed to create XP event'));

        const grantData = {
          attendantId: 'att-123',
          typeId: 'type-123',
          grantedBy: 'user-123'
        };

        await expect(XpAvulsoService.grantXp(grantData)).rejects.toThrow('Failed to create XP event');
      });
    });
  });
});