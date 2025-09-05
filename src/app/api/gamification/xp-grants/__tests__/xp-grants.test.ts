/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware } from '@/lib/auth-middleware';

// Mock dos serviços - mas não dos schemas
jest.mock('@/services/xpAvulsoService', () => {
  const actual = jest.requireActual('@/services/xpAvulsoService');
  return {
    ...actual,
    XpAvulsoService: {
      grantXp: jest.fn(),
      findGrantHistory: jest.fn()
    }
  };
});
jest.mock('@/lib/rate-limit');

// Mock do AuthMiddleware e AuditLogger
jest.mock('@/lib/auth-middleware', () => ({
  AuthMiddleware: {
    checkAuth: jest.fn()
  },
  AuthConfigs: {
    adminOnly: 'adminOnly',
    supervisorAndAbove: 'supervisorAndAbove'
  },
  AuditLogger: {
    logAdminAction: jest.fn().mockResolvedValue(undefined)
  }
}));

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<typeof XpAvulsoService>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;

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

describe('/api/gamification/xp-grants', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST - Conceder XP avulso', () => {
    it('deve conceder XP avulso com sucesso', async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'user-1',
            email: 'admin@test.com',
            name: 'Admin Test',
            role: 'ADMIN'
          }
        }
      });

      // Mock do serviço
      const mockGrant = {
        id: 'grant-1',
        attendant: { id: 'att-1', name: 'Atendente Test' },
        type: { id: 'type-1', name: 'Excelência', points: 100 },
        points: 100,
        justification: 'Excelente atendimento',
        grantedAt: new Date(),
        granter: { id: 'user-1', name: 'Admin Test' }
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);

      // Criar request mock
      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1',
          justification: 'Excelente atendimento'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Executar endpoint
      const response = await POST(request);
      const data = await response.json();

      // Verificações
      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('XP avulso concedido com sucesso');
      expect(data.data.id).toBe('grant-1');
      expect(mockXpAvulsoService.grantXp).toHaveBeenCalledWith({
        attendantId: 'att-1',
        typeId: 'type-1',
        justification: 'Excelente atendimento',
        grantedBy: 'user-1'
      });
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      // Mock da autenticação falhando
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'user-1',
            email: 'admin@test.com',
            name: 'Admin Test',
            role: 'ADMIN'
          }
        }
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          // Dados inválidos - faltando campos obrigatórios
          attendantId: '',
          typeId: ''
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
      expect(data.details).toBeDefined();
    });
  });

  describe('GET - Buscar histórico', () => {
    it('deve buscar histórico com sucesso', async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'user-1',
            email: 'supervisor@test.com',
            name: 'Supervisor Test',
            role: 'SUPERVISOR'
          }
        }
      });

      // Mock do serviço
      const mockResult = {
        grants: [
          {
            id: 'grant-1',
            attendant: { id: 'att-1', name: 'Atendente 1' },
            type: { id: 'type-1', name: 'Excelência', category: 'performance', icon: 'star', color: '#FFD700' },
            points: 100,
            justification: 'Excelente trabalho',
            grantedAt: new Date(),
            granter: { id: 'user-1', name: 'Admin', role: 'ADMIN' }
          }
        ],
        total: 1,
        page: 1,
        totalPages: 1
      };

      mockXpAvulsoService.findGrantHistory.mockResolvedValue(mockResult as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants?page=1&limit=20');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.grants).toHaveLength(1);
      expect(data.data.pagination.total).toBe(1);
    });

    it('deve aplicar filtros corretamente', async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'user-1',
            email: 'supervisor@test.com',
            name: 'Supervisor Test',
            role: 'SUPERVISOR'
          }
        }
      });

      mockXpAvulsoService.findGrantHistory.mockResolvedValue({
        grants: [],
        total: 0,
        page: 1,
        totalPages: 0
      } as any);

      const request = new NextRequest(
        'http://localhost/api/gamification/xp-grants?attendantId=att-1&typeId=type-1&page=1&limit=10'
      );

      await GET(request);

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        attendantId: 'att-1',
        typeId: 'type-1',
        page: 1,
        limit: 10,
        sortBy: 'grantedAt',
        sortOrder: 'desc'
      });
    });

    it('deve aplicar ordenação customizável', async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'user-1',
            email: 'supervisor@test.com',
            name: 'Supervisor Test',
            role: 'SUPERVISOR'
          }
        }
      });

      mockXpAvulsoService.findGrantHistory.mockResolvedValue({
        grants: [],
        total: 0,
        page: 1,
        totalPages: 0
      } as any);

      const request = new NextRequest(
        'http://localhost/api/gamification/xp-grants?sortBy=points&sortOrder=asc&page=1&limit=20'
      );

      await GET(request);

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: 'points',
        sortOrder: 'asc'
      });
    });

    it('deve usar ordenação padrão quando não especificada', async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: 'user-1',
            email: 'supervisor@test.com',
            name: 'Supervisor Test',
            role: 'SUPERVISOR'
          }
        }
      });

      mockXpAvulsoService.findGrantHistory.mockResolvedValue({
        grants: [],
        total: 0,
        page: 1,
        totalPages: 0
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants');

      await GET(request);

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: 'grantedAt',
        sortOrder: 'desc'
      });
    });
  });
});