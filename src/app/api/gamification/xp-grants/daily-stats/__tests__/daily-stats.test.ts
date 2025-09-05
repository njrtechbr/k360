/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { AuthMiddleware } from '@/lib/auth-middleware';
import { prisma } from '@/lib/prisma';

// Mock do Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    xpGrant: {
      findMany: jest.fn()
    }
  }
}));

// Mock do AuthMiddleware
jest.mock('@/lib/auth-middleware', () => ({
  AuthMiddleware: {
    checkAuth: jest.fn()
  },
  AuthConfigs: {
    adminOnly: 'adminOnly'
  }
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;

describe('/api/gamification/xp-grants/daily-stats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Obter estatísticas diárias', () => {
    it('deve retornar estatísticas diárias com sucesso', async () => {
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

      // Mock das concessões do dia
      const mockGrants = [
        { points: 100 },
        { points: 75 },
        { points: 50 }
      ];

      mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        todayGrants: 3,
        todayPoints: 225,
        remainingPoints: 775, // 1000 - 225
        remainingGrants: 47,  // 50 - 3
        limits: {
          maxPoints: 1000,
          maxGrants: 50
        },
        canGrant: true
      });

      // Verificar se a query foi feita corretamente
      expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith({
        where: {
          grantedBy: 'user-1',
          grantedAt: {
            gte: expect.any(Date),
            lt: expect.any(Date)
          }
        },
        select: {
          points: true
        }
      });
    });

    it('deve retornar estatísticas vazias quando não há concessões', async () => {
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

      mockPrisma.xpGrant.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        todayGrants: 0,
        todayPoints: 0,
        remainingPoints: 1000,
        remainingGrants: 50,
        limits: {
          maxPoints: 1000,
          maxGrants: 50
        },
        canGrant: true
      });
    });

    it('deve indicar quando limite de pontos foi atingido', async () => {
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

      // Mock com concessões que excedem o limite de pontos
      const mockGrants = Array.from({ length: 10 }, () => ({ points: 100 }));
      mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        todayGrants: 10,
        todayPoints: 1000,
        remainingPoints: 0,
        remainingGrants: 40,
        limits: {
          maxPoints: 1000,
          maxGrants: 50
        },
        canGrant: false // Não pode conceder mais (limite de pontos atingido)
      });
    });

    it('deve indicar quando limite de concessões foi atingido', async () => {
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

      // Mock com 50 concessões (limite)
      const mockGrants = Array.from({ length: 50 }, () => ({ points: 10 }));
      mockPrisma.xpGrant.findMany.mockResolvedValue(mockGrants as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        todayGrants: 50,
        todayPoints: 500,
        remainingPoints: 500,
        remainingGrants: 0,
        limits: {
          maxPoints: 1000,
          maxGrants: 50
        },
        canGrant: false // Não pode conceder mais (limite de concessões atingido)
      });
    });

    it('deve retornar erro 400 quando userId não é fornecido', async () => {
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

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('ID do usuário é obrigatório');
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve tratar erros do banco de dados', async () => {
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

      mockPrisma.xpGrant.findMany.mockRejectedValue(new Error('Erro no banco de dados'));

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor ao buscar estatísticas');
    });

    it('deve calcular corretamente o período do dia atual', async () => {
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

      mockPrisma.xpGrant.findMany.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/daily-stats?userId=user-1');

      await GET(request);

      // Verificar se as datas foram calculadas corretamente
      const callArgs = mockPrisma.xpGrant.findMany.mock.calls[0][0];
      const whereClause = callArgs.where;
      
      expect(whereClause.grantedAt.gte).toBeInstanceOf(Date);
      expect(whereClause.grantedAt.lt).toBeInstanceOf(Date);
      
      // Verificar se gte é início do dia (00:00:00)
      const gteDate = whereClause.grantedAt.gte;
      expect(gteDate.getHours()).toBe(0);
      expect(gteDate.getMinutes()).toBe(0);
      expect(gteDate.getSeconds()).toBe(0);
      expect(gteDate.getMilliseconds()).toBe(0);
      
      // Verificar se lt é início do próximo dia
      const ltDate = whereClause.grantedAt.lt;
      expect(ltDate.getTime() - gteDate.getTime()).toBe(24 * 60 * 60 * 1000); // 24 horas
    });
  });
});