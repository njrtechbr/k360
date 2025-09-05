/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from '../route';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware } from '@/lib/auth-middleware';

// Mock dos serviços
jest.mock('@/services/xpAvulsoService', () => {
  const actual = jest.requireActual('@/services/xpAvulsoService');
  return {
    ...actual,
    XpAvulsoService: {
      getGrantStatistics: jest.fn()
    }
  };
});
jest.mock('@/lib/auth-middleware');
jest.mock('@/lib/rate-limit');

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<typeof XpAvulsoService>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;

// Mock do rate limiter
jest.mock('@/lib/rate-limit', () => ({
  xpAvulsoRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetTime: Date.now() + 60000
    })
  }
}));

describe('/api/gamification/xp-grants/statistics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Obter estatísticas', () => {
    it('deve retornar estatísticas com sucesso', async () => {
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
      const mockStatistics = {
        totalGrants: 100,
        totalPoints: 5000,
        averagePoints: 50,
        grantsByType: [
          {
            typeId: 'type-1',
            typeName: 'Excelência no Atendimento',
            count: 60,
            totalPoints: 3000
          },
          {
            typeId: 'type-2',
            typeName: 'Trabalho em Equipe',
            count: 40,
            totalPoints: 2000
          }
        ],
        grantsByGranter: [
          {
            granterId: 'granter-1',
            granterName: 'Admin 1',
            count: 70,
            totalPoints: 3500
          },
          {
            granterId: 'granter-2',
            granterName: 'Admin 2',
            count: 30,
            totalPoints: 1500
          }
        ]
      };

      mockXpAvulsoService.getGrantStatistics.mockResolvedValue(mockStatistics as any);

      // Criar request mock
      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics?period=30d');

      // Executar endpoint
      const response = await GET(request);
      const data = await response.json();

      // Verificações
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      
      // Verificar estrutura da resposta
      expect(data.data.period).toEqual({
        value: '30d',
        days: 30,
        label: 'Últimos 30 dias'
      });
      
      expect(data.data.overview).toEqual({
        totalGrants: 100,
        totalPoints: 5000,
        averagePoints: 50,
        dailyAverageGrants: 3.33,
        dailyAveragePoints: 167
      });
      
      // Verificar agrupamento por tipo (ordenado por pontos)
      expect(data.data.grantsByType).toHaveLength(2);
      expect(data.data.grantsByType[0]).toEqual({
        typeId: 'type-1',
        typeName: 'Excelência no Atendimento',
        count: 60,
        totalPoints: 3000,
        averagePoints: 50,
        percentage: 60
      });
      
      // Verificar agrupamento por responsável (ordenado por pontos)
      expect(data.data.grantsByGranter).toHaveLength(2);
      expect(data.data.grantsByGranter[0]).toEqual({
        granterId: 'granter-1',
        granterName: 'Admin 1',
        count: 70,
        totalPoints: 3500,
        averagePoints: 50,
        percentage: 70
      });
      
      // Verificar tendências
      expect(data.data.trends).toEqual({
        mostUsedType: 'Excelência no Atendimento',
        mostActiveGranter: 'Admin 1',
        averageGrantsPerGranter: 50
      });
      
      expect(mockXpAvulsoService.getGrantStatistics).toHaveBeenCalledWith('30d');
    });

    it('deve usar período padrão quando não especificado', async () => {
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

      mockXpAvulsoService.getGrantStatistics.mockResolvedValue({
        totalGrants: 0,
        totalPoints: 0,
        averagePoints: 0,
        grantsByType: [],
        grantsByGranter: []
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period.value).toBe('30d');
      expect(mockXpAvulsoService.getGrantStatistics).toHaveBeenCalledWith('30d');
    });

    it('deve aceitar diferentes períodos válidos', async () => {
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

      mockXpAvulsoService.getGrantStatistics.mockResolvedValue({
        totalGrants: 50,
        totalPoints: 2500,
        averagePoints: 50,
        grantsByType: [],
        grantsByGranter: []
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics?period=7d');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.period).toEqual({
        value: '7d',
        days: 7,
        label: 'Últimos 7 dias'
      });
      expect(data.data.overview.dailyAverageGrants).toBe(7.14); // 50/7 arredondado
      expect(mockXpAvulsoService.getGrantStatistics).toHaveBeenCalledWith('7d');
    });

    it('deve retornar erro 400 para período inválido', async () => {
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

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics?period=invalid');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Período inválido. Períodos válidos: 7d, 30d, 90d');
      expect(data.validPeriods).toEqual(['7d', '30d', '90d']);
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      // Mock da autenticação falhando
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve lidar com dados vazios corretamente', async () => {
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

      // Mock com dados vazios
      mockXpAvulsoService.getGrantStatistics.mockResolvedValue({
        totalGrants: 0,
        totalPoints: 0,
        averagePoints: 0,
        grantsByType: [],
        grantsByGranter: []
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics?period=90d');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.overview).toEqual({
        totalGrants: 0,
        totalPoints: 0,
        averagePoints: 0,
        dailyAverageGrants: 0,
        dailyAveragePoints: 0
      });
      expect(data.data.grantsByType).toHaveLength(0);
      expect(data.data.grantsByGranter).toHaveLength(0);
      expect(data.data.trends).toEqual({
        mostUsedType: null,
        mostActiveGranter: null,
        averageGrantsPerGranter: 0
      });
    });

    it('deve calcular percentuais corretamente', async () => {
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

      // Mock com dados para teste de percentual
      mockXpAvulsoService.getGrantStatistics.mockResolvedValue({
        totalGrants: 100,
        totalPoints: 5000,
        averagePoints: 50,
        grantsByType: [
          {
            typeId: 'type-1',
            typeName: 'Tipo A',
            count: 75,
            totalPoints: 3750
          },
          {
            typeId: 'type-2',
            typeName: 'Tipo B',
            count: 25,
            totalPoints: 1250
          }
        ],
        grantsByGranter: [
          {
            granterId: 'granter-1',
            granterName: 'Admin A',
            count: 80,
            totalPoints: 4000
          },
          {
            granterId: 'granter-2',
            granterName: 'Admin B',
            count: 20,
            totalPoints: 1000
          }
        ]
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants/statistics');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      
      // Verificar percentuais por tipo
      expect(data.data.grantsByType[0].percentage).toBe(75);
      expect(data.data.grantsByType[1].percentage).toBe(25);
      
      // Verificar percentuais por responsável
      expect(data.data.grantsByGranter[0].percentage).toBe(80);
      expect(data.data.grantsByGranter[1].percentage).toBe(20);
    });
  });
});