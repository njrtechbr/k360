/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET as getXpTypes, POST as postXpTypes } from '../xp-types/route';
import { GET as getXpTypeById, PUT as putXpType, DELETE as deleteXpType } from '../xp-types/[id]/route';
import { GET as getXpGrants, POST as postXpGrants } from '../xp-grants/route';
import { GET as getAttendantGrants } from '../xp-grants/attendant/[id]/route';
import { GET as getStatistics } from '../xp-grants/statistics/route';
import { GET as getDailyStats } from '../xp-grants/daily-stats/route';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

// Mock de todos os serviços
jest.mock('@/services/xpAvulsoService');
jest.mock('@/lib/auth-middleware');
jest.mock('@/lib/prisma');
jest.mock('@/lib/rate-limit');

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<typeof XpAvulsoService>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Mock do rate limiter
jest.mock('@/lib/rate-limit', () => ({
  xpGrantRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000
    })
  },
  xpAvulsoRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetTime: Date.now() + 60000
    })
  }
}));

describe('XP Avulso - Testes de Integração Completos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fluxo Completo de Gerenciamento de XP Avulso', () => {
    it('deve executar fluxo completo: criar tipo → conceder XP → consultar histórico', async () => {
      // 1. Configurar autenticação para ADMIN
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin Test',
            role: 'ADMIN'
          }
        }
      });

      // 2. Criar tipo de XP
      const mockCreatedType = {
        id: 'type-1',
        name: 'Excelência no Atendimento',
        description: 'Reconhecimento por atendimento excepcional',
        points: 100,
        active: true,
        category: 'atendimento',
        icon: 'star',
        color: '#FFD700',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'admin-1'
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(mockCreatedType as any);

      const createTypeRequest = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Excelência no Atendimento',
          description: 'Reconhecimento por atendimento excepcional',
          points: 100,
          category: 'atendimento',
          icon: 'star',
          color: '#FFD700'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const createTypeResponse = await postXpTypes(createTypeRequest);
      const createTypeData = await createTypeResponse.json();

      expect(createTypeResponse.status).toBe(201);
      expect(createTypeData.success).toBe(true);
      expect(createTypeData.data.name).toBe('Excelência no Atendimento');

      // 3. Conceder XP usando o tipo criado
      const mockGrant = {
        id: 'grant-1',
        attendant: { id: 'att-1', name: 'João Silva' },
        type: mockCreatedType,
        points: 100,
        justification: 'Atendimento excepcional ao cliente',
        grantedAt: new Date(),
        granter: { id: 'admin-1', name: 'Admin Test' }
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);

      const grantXpRequest = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1',
          justification: 'Atendimento excepcional ao cliente'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const grantXpResponse = await postXpGrants(grantXpRequest);
      const grantXpData = await grantXpResponse.json();

      expect(grantXpResponse.status).toBe(201);
      expect(grantXpData.success).toBe(true);
      expect(grantXpData.data.points).toBe(100);

      // 4. Consultar histórico geral
      mockXpAvulsoService.findGrantHistory.mockResolvedValue({
        grants: [mockGrant],
        total: 1,
        page: 1,
        totalPages: 1
      } as any);

      const historyRequest = new NextRequest('http://localhost/api/gamification/xp-grants');
      const historyResponse = await getXpGrants(historyRequest);
      const historyData = await historyResponse.json();

      expect(historyResponse.status).toBe(200);
      expect(historyData.data.grants).toHaveLength(1);
      expect(historyData.data.grants[0].id).toBe('grant-1');

      // 5. Consultar concessões do atendente específico
      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue([mockGrant] as any);

      const attendantGrantsRequest = new NextRequest('http://localhost/api/gamification/xp-grants/attendant/att-1');
      const attendantGrantsResponse = await getAttendantGrants(attendantGrantsRequest, { params: { id: 'att-1' } });
      const attendantGrantsData = await attendantGrantsResponse.json();

      expect(attendantGrantsResponse.status).toBe(200);
      expect(attendantGrantsData.data.summary.totalGrants).toBe(1);
      expect(attendantGrantsData.data.summary.totalPoints).toBe(100);

      // Verificar que todos os serviços foram chamados corretamente
      expect(mockXpAvulsoService.createXpType).toHaveBeenCalledWith({
        name: 'Excelência no Atendimento',
        description: 'Reconhecimento por atendimento excepcional',
        points: 100,
        category: 'atendimento',
        icon: 'star',
        color: '#FFD700',
        createdBy: 'admin-1'
      });

      expect(mockXpAvulsoService.grantXp).toHaveBeenCalledWith({
        attendantId: 'att-1',
        typeId: 'type-1',
        justification: 'Atendimento excepcional ao cliente',
        grantedBy: 'admin-1'
      });

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalled();
      expect(mockXpAvulsoService.findGrantsByAttendantWithSort).toHaveBeenCalledWith('att-1', 'grantedAt', 'desc');
    });
  });

  describe('Testes de Autorização por Role', () => {
    it('deve permitir acesso completo para SUPERADMIN', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'superadmin-1',
            email: 'superadmin@test.com',
            name: 'Super Admin',
            role: 'SUPERADMIN'
          }
        }
      });

      mockXpAvulsoService.findAllXpTypes.mockResolvedValue([]);
      mockXpAvulsoService.createXpType.mockResolvedValue({} as any);
      mockXpAvulsoService.grantXp.mockResolvedValue({} as any);
      mockXpAvulsoService.findGrantHistory.mockResolvedValue({ grants: [], total: 0, page: 1, totalPages: 0 } as any);

      // Testar todos os endpoints principais
      const endpoints = [
        { method: getXpTypes, request: new NextRequest('http://localhost/api/gamification/xp-types') },
        { method: postXpTypes, request: new NextRequest('http://localhost/api/gamification/xp-types', { method: 'POST', body: JSON.stringify({ name: 'Test', description: 'Test', points: 50 }) }) },
        { method: postXpGrants, request: new NextRequest('http://localhost/api/gamification/xp-grants', { method: 'POST', body: JSON.stringify({ attendantId: 'att-1', typeId: 'type-1' }) }) },
        { method: getXpGrants, request: new NextRequest('http://localhost/api/gamification/xp-grants') }
      ];

      for (const endpoint of endpoints) {
        const response = await endpoint.method(endpoint.request);
        expect(response.status).not.toBe(401);
        expect(response.status).not.toBe(403);
      }
    });

    it('deve permitir acesso limitado para SUPERVISOR', async () => {
      mockAuthMiddleware.checkAuth
        .mockResolvedValueOnce({
          authorized: false,
          error: 'Acesso negado',
          statusCode: 403
        })
        .mockResolvedValueOnce({
          authorized: false,
          error: 'Acesso negado',
          statusCode: 403
        })
        .mockResolvedValueOnce({
          authorized: true,
          session: {
            user: {
              id: 'supervisor-1',
              email: 'supervisor@test.com',
              name: 'Supervisor Test',
              role: 'SUPERVISOR'
            }
          }
        });

      mockXpAvulsoService.findGrantHistory.mockResolvedValue({ grants: [], total: 0, page: 1, totalPages: 0 } as any);

      // SUPERVISOR não deve poder criar tipos
      const createTypeRequest = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', description: 'Test', points: 50 })
      });
      const createTypeResponse = await postXpTypes(createTypeRequest);
      expect(createTypeResponse.status).toBe(403);

      // SUPERVISOR não deve poder conceder XP
      const grantXpRequest = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({ attendantId: 'att-1', typeId: 'type-1' })
      });
      const grantXpResponse = await postXpGrants(grantXpRequest);
      expect(grantXpResponse.status).toBe(403);

      // SUPERVISOR deve poder consultar histórico
      const historyRequest = new NextRequest('http://localhost/api/gamification/xp-grants');
      const historyResponse = await getXpGrants(historyRequest);
      expect(historyResponse.status).toBe(200);
    });

    it('deve negar acesso para USUARIO', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Acesso negado',
        statusCode: 403
      });

      const endpoints = [
        { method: getXpTypes, request: new NextRequest('http://localhost/api/gamification/xp-types') },
        { method: postXpTypes, request: new NextRequest('http://localhost/api/gamification/xp-types', { method: 'POST' }) },
        { method: postXpGrants, request: new NextRequest('http://localhost/api/gamification/xp-grants', { method: 'POST' }) },
        { method: getXpGrants, request: new NextRequest('http://localhost/api/gamification/xp-grants') }
      ];

      for (const endpoint of endpoints) {
        const response = await endpoint.method(endpoint.request);
        expect(response.status).toBe(403);
      }
    });
  });

  describe('Testes de Rate Limiting', () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin Test',
            role: 'ADMIN'
          }
        }
      });
    });

    it('deve aplicar rate limiting para concessões de XP', async () => {
      // Simular limite atingido
      const { xpGrantRateLimiter } = require('@/lib/rate-limit');
      xpGrantRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        })
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Muitas tentativas');
    });

    it('deve aplicar rate limiting para consultas gerais', async () => {
      // Simular limite atingido
      const { xpAvulsoRateLimiter } = require('@/lib/rate-limit');
      xpAvulsoRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-types');

      const response = await getXpTypes(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Muitas tentativas');
    });

    it('deve permitir requisições dentro do limite', async () => {
      const { xpGrantRateLimiter } = require('@/lib/rate-limit');
      xpGrantRateLimiter.checkLimit.mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000
      });

      mockXpAvulsoService.grantXp.mockResolvedValue({
        id: 'grant-1',
        attendant: { id: 'att-1', name: 'Test' },
        type: { id: 'type-1', name: 'Test', points: 50 },
        points: 50
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await postXpGrants(request);

      expect(response.status).toBe(201);
      expect(xpGrantRateLimiter.checkLimit).toHaveBeenCalled();
    });
  });

  describe('Testes de Validação de Dados', () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin Test',
            role: 'ADMIN'
          }
        }
      });
    });

    it('deve validar dados obrigatórios na criação de tipos', async () => {
      const invalidRequests = [
        { name: '', description: 'Test', points: 50 }, // Nome vazio
        { name: 'Test', description: '', points: 50 }, // Descrição vazia
        { name: 'Test', description: 'Test', points: 0 }, // Pontos zero
        { name: 'Test', description: 'Test', points: -10 }, // Pontos negativos
      ];

      for (const invalidData of invalidRequests) {
        const request = new NextRequest('http://localhost/api/gamification/xp-types', {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await postXpTypes(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Dados inválidos');
        expect(data.details).toBeDefined();
      }
    });

    it('deve validar dados obrigatórios na concessão de XP', async () => {
      const invalidRequests = [
        { attendantId: '', typeId: 'type-1' }, // AttendantId vazio
        { attendantId: 'att-1', typeId: '' }, // TypeId vazio
        {}, // Dados faltando
      ];

      for (const invalidData of invalidRequests) {
        const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
          method: 'POST',
          body: JSON.stringify(invalidData),
          headers: { 'Content-Type': 'application/json' }
        });

        const response = await postXpGrants(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Dados inválidos');
      }
    });

    it('deve validar JSON malformado', async () => {
      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await postXpTypes(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('JSON inválido');
    });
  });

  describe('Testes de Tratamento de Erros', () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'admin-1',
            email: 'admin@test.com',
            name: 'Admin Test',
            role: 'ADMIN'
          }
        }
      });
    });

    it('deve tratar erros de negócio específicos', async () => {
      const businessErrors = [
        { error: 'Nome do tipo de XP já está em uso', expectedStatus: 400 },
        { error: 'Atendente não encontrado', expectedStatus: 404 },
        { error: 'Tipo de XP não encontrado', expectedStatus: 404 },
        { error: 'Não há temporada ativa para conceder XP', expectedStatus: 400 },
        { error: 'Limite diário de concessões atingido (50)', expectedStatus: 429 },
      ];

      for (const { error, expectedStatus } of businessErrors) {
        mockXpAvulsoService.createXpType.mockRejectedValueOnce(new Error(error));
        mockXpAvulsoService.grantXp.mockRejectedValueOnce(new Error(error));

        // Testar criação de tipo
        const createRequest = new NextRequest('http://localhost/api/gamification/xp-types', {
          method: 'POST',
          body: JSON.stringify({ name: 'Test', description: 'Test', points: 50 }),
          headers: { 'Content-Type': 'application/json' }
        });

        const createResponse = await postXpTypes(createRequest);
        expect(createResponse.status).toBe(expectedStatus);

        // Testar concessão de XP
        const grantRequest = new NextRequest('http://localhost/api/gamification/xp-grants', {
          method: 'POST',
          body: JSON.stringify({ attendantId: 'att-1', typeId: 'type-1' }),
          headers: { 'Content-Type': 'application/json' }
        });

        const grantResponse = await postXpGrants(grantRequest);
        expect(grantResponse.status).toBe(expectedStatus);
      }
    });

    it('deve tratar erros internos do servidor', async () => {
      mockXpAvulsoService.findAllXpTypes.mockRejectedValue(new Error('Erro no banco de dados'));

      const request = new NextRequest('http://localhost/api/gamification/xp-types');

      const response = await getXpTypes(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });

  describe('Testes de Estatísticas e Relatórios', () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'supervisor-1',
            email: 'supervisor@test.com',
            name: 'Supervisor Test',
            role: 'SUPERVISOR'
          }
        }
      });
    });

    it('deve gerar estatísticas completas', async () => {
      const mockStatistics = {
        totalGrants: 100,
        totalPoints: 5000,
        averagePoints: 50,
        grantsByType: [
          { typeId: 'type-1', typeName: 'Excelência', count: 60, totalPoints: 3000 }
        ],
        grantsByGranter: [
          { granterId: 'admin-1', granterName: 'Admin', count: 100, totalPoints: 5000 }
        ]
      };

      mockXpAvulsoService.getGrantStatistics.mockResolvedValue(mockStatistics as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics?period=30d');

      const response = await getStatistics(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.overview.totalGrants).toBe(100);
      expect(data.data.overview.totalPoints).toBe(5000);
      expect(data.data.grantsByType).toHaveLength(1);
      expect(data.data.grantsByGranter).toHaveLength(1);
    });

    it('deve buscar estatísticas diárias do usuário', async () => {
      mockPrisma.xpGrant.findMany.mockResolvedValue([
        { points: 100 },
        { points: 50 }
      ] as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=admin-1');

      const response = await getDailyStats(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.todayGrants).toBe(2);
      expect(data.data.todayPoints).toBe(150);
      expect(data.data.remainingPoints).toBe(850); // 1000 - 150
      expect(data.data.canGrant).toBe(true);
    });
  });

  describe('Testes de Performance e Paginação', () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'supervisor-1',
            email: 'supervisor@test.com',
            name: 'Supervisor Test',
            role: 'SUPERVISOR'
          }
        }
      });
    });

    it('deve implementar paginação corretamente', async () => {
      const mockResult = {
        grants: Array.from({ length: 10 }, (_, i) => ({
          id: `grant-${i + 1}`,
          attendant: { id: 'att-1', name: 'Test' },
          type: { id: 'type-1', name: 'Test', points: 50 },
          points: 50
        })),
        total: 100,
        page: 2,
        totalPages: 10
      };

      mockXpAvulsoService.findGrantHistory.mockResolvedValue(mockResult as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants?page=2&limit=10');

      const response = await getXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.grants).toHaveLength(10);
      expect(data.data.pagination.page).toBe(2);
      expect(data.data.pagination.total).toBe(100);
      expect(data.data.pagination.totalPages).toBe(10);

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        sortBy: 'grantedAt',
        sortOrder: 'desc'
      });
    });

    it('deve aplicar filtros avançados', async () => {
      mockXpAvulsoService.findGrantHistory.mockResolvedValue({
        grants: [],
        total: 0,
        page: 1,
        totalPages: 0
      } as any);

      const request = new NextRequest(
        'http://localhost/api/gamification/xp-grants?' +
        'attendantId=att-1&typeId=type-1&granterId=admin-1&' +
        'startDate=2024-01-01&endDate=2024-12-31&' +
        'minPoints=50&maxPoints=200&' +
        'sortBy=points&sortOrder=asc'
      );

      await getXpGrants(request);

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        attendantId: 'att-1',
        typeId: 'type-1',
        granterId: 'admin-1',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-12-31T00:00:00.000Z'),
        minPoints: 50,
        maxPoints: 200,
        page: 1,
        limit: 20,
        sortBy: 'points',
        sortOrder: 'asc'
      });
    });
  });
});