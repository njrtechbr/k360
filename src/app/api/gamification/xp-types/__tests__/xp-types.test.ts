/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware } from '@/lib/auth-middleware';

// Mock dos serviços
jest.mock('@/services/xpAvulsoService', () => {
  const actual = jest.requireActual('@/services/xpAvulsoService');
  return {
    ...actual,
    XpAvulsoService: {
      findAllXpTypes: jest.fn(),
      createXpType: jest.fn()
    }
  };
});

// Mock do AuthMiddleware e AuditLogger
jest.mock('@/lib/auth-middleware', () => ({
  AuthMiddleware: {
    checkAuth: jest.fn()
  },
  AuthConfigs: {
    adminOnly: 'adminOnly'
  },
  AuditLogger: {
    logAdminAction: jest.fn().mockResolvedValue(undefined)
  }
}));

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

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<typeof XpAvulsoService>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;

describe('/api/gamification/xp-types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Listar tipos de XP', () => {
    it('deve listar todos os tipos de XP com sucesso', async () => {
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
      const mockTypes = [
        {
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
          createdBy: 'user-1',
          creator: {
            id: 'user-1',
            name: 'Admin Test',
            email: 'admin@test.com'
          },
          _count: {
            xpGrants: 5
          }
        },
        {
          id: 'type-2',
          name: 'Trabalho em Equipe',
          description: 'Colaboração excepcional',
          points: 75,
          active: false,
          category: 'colaboracao',
          icon: 'users',
          color: '#3B82F6',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user-1',
          creator: {
            id: 'user-1',
            name: 'Admin Test',
            email: 'admin@test.com'
          },
          _count: {
            xpGrants: 2
          }
        }
      ];

      mockXpAvulsoService.findAllXpTypes.mockResolvedValue(mockTypes as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].name).toBe('Excelência no Atendimento');
      expect(data.data[1].name).toBe('Trabalho em Equipe');
      expect(mockXpAvulsoService.findAllXpTypes).toHaveBeenCalledWith(false);
    });

    it('deve filtrar apenas tipos ativos quando activeOnly=true', async () => {
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

      const mockActiveTypes = [
        {
          id: 'type-1',
          name: 'Excelência no Atendimento',
          active: true
        }
      ];

      mockXpAvulsoService.findAllXpTypes.mockResolvedValue(mockActiveTypes as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types?activeOnly=true');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockXpAvulsoService.findAllXpTypes).toHaveBeenCalledWith(true);
    });

    it('deve filtrar por categoria quando especificada', async () => {
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

      const mockTypes = [
        {
          id: 'type-1',
          name: 'Excelência no Atendimento',
          category: 'atendimento'
        },
        {
          id: 'type-2',
          name: 'Trabalho em Equipe',
          category: 'colaboracao'
        }
      ];

      mockXpAvulsoService.findAllXpTypes.mockResolvedValue(mockTypes as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types?category=atendimento');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].category).toBe('atendimento');
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-types');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve tratar erros do serviço', async () => {
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

      mockXpAvulsoService.findAllXpTypes.mockRejectedValue(new Error('Erro no banco de dados'));

      const request = new NextRequest('http://localhost/api/gamification/xp-types');

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });

  describe('POST - Criar tipo de XP', () => {
    it('deve criar tipo de XP com sucesso', async () => {
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
      const mockCreatedType = {
        id: 'type-1',
        name: 'Inovação',
        description: 'Reconhecimento por ideias inovadoras',
        points: 150,
        active: true,
        category: 'inovacao',
        icon: 'lightbulb',
        color: '#10B981',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user-1',
        creator: {
          id: 'user-1',
          name: 'Admin Test',
          email: 'admin@test.com'
        }
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(mockCreatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Inovação',
          description: 'Reconhecimento por ideias inovadoras',
          points: 150,
          category: 'inovacao',
          icon: 'lightbulb',
          color: '#10B981'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Tipo de XP criado com sucesso');
      expect(data.data.name).toBe('Inovação');
      expect(mockXpAvulsoService.createXpType).toHaveBeenCalledWith({
        name: 'Inovação',
        description: 'Reconhecimento por ideias inovadoras',
        points: 150,
        category: 'inovacao',
        icon: 'lightbulb',
        color: '#10B981',
        createdBy: 'user-1'
      });
    });

    it('deve aplicar valores padrão quando não especificados', async () => {
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

      const mockCreatedType = {
        id: 'type-1',
        name: 'Teste',
        description: 'Descrição teste',
        points: 50,
        category: 'general',
        icon: 'star',
        color: '#3B82F6'
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(mockCreatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Teste',
          description: 'Descrição teste',
          points: 50
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await POST(request);

      expect(mockXpAvulsoService.createXpType).toHaveBeenCalledWith({
        name: 'Teste',
        description: 'Descrição teste',
        points: 50,
        category: 'general',
        icon: 'star',
        color: '#3B82F6',
        createdBy: 'user-1'
      });
    });

    it('deve retornar erro 400 para dados inválidos', async () => {
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

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: '', // Nome vazio
          description: '',
          points: -10 // Pontos negativos
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
      expect(data.details).toBeDefined();
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Teste',
          description: 'Teste',
          points: 50
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });

    it('deve tratar erro de nome duplicado', async () => {
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

      mockXpAvulsoService.createXpType.mockRejectedValue(
        new Error('Nome do tipo de XP já está em uso')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Excelência',
          description: 'Teste',
          points: 100
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Nome do tipo de XP já está em uso');
    });

    it('deve tratar erros internos do servidor', async () => {
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

      mockXpAvulsoService.createXpType.mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Teste',
          description: 'Teste',
          points: 100
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });
});