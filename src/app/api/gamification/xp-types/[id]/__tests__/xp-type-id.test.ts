/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware } from '@/lib/auth-middleware';

// Mock dos serviços
jest.mock('@/services/xpAvulsoService', () => {
  const actual = jest.requireActual('@/services/xpAvulsoService');
  return {
    ...actual,
    XpAvulsoService: {
      findAllXpTypes: jest.fn(),
      updateXpType: jest.fn(),
      toggleXpTypeStatus: jest.fn()
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

describe('/api/gamification/xp-types/[id]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET - Buscar tipo de XP por ID', () => {
    it('deve buscar tipo de XP por ID com sucesso', async () => {
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
          }
        }
      ];

      mockXpAvulsoService.findAllXpTypes.mockResolvedValue(mockTypes as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1');

      const response = await GET(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.id).toBe('type-1');
      expect(data.data.name).toBe('Excelência no Atendimento');
    });

    it('deve retornar erro 404 quando tipo não encontrado', async () => {
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

      mockXpAvulsoService.findAllXpTypes.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-inexistente');

      const response = await GET(request, { params: { id: 'type-inexistente' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tipo de XP não encontrado');
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1');

      const response = await GET(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });
  });

  describe('PUT - Atualizar tipo de XP', () => {
    it('deve atualizar tipo de XP com sucesso', async () => {
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
      const mockUpdatedType = {
        id: 'type-1',
        name: 'Excelência Atualizada',
        description: 'Nova descrição',
        points: 150,
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
        }
      };

      mockXpAvulsoService.updateXpType.mockResolvedValue(mockUpdatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Excelência Atualizada',
          description: 'Nova descrição',
          points: 150
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Tipo de XP atualizado com sucesso');
      expect(data.data.name).toBe('Excelência Atualizada');
      expect(mockXpAvulsoService.updateXpType).toHaveBeenCalledWith('type-1', {
        name: 'Excelência Atualizada',
        description: 'Nova descrição',
        points: 150
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

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: '', // Nome vazio
          points: -10 // Pontos negativos
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
      expect(data.details).toBeDefined();
    });

    it('deve retornar erro 404 quando tipo não encontrado', async () => {
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

      mockXpAvulsoService.updateXpType.mockRejectedValue(
        new Error('Tipo de XP não encontrado')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-inexistente', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Teste',
          description: 'Teste',
          points: 100
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await PUT(request, { params: { id: 'type-inexistente' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tipo de XP não encontrado');
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Teste'
        })
      });

      const response = await PUT(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
    });
  });

  describe('DELETE - Alternar status do tipo de XP', () => {
    it('deve desativar tipo de XP com sucesso', async () => {
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
      const mockUpdatedType = {
        id: 'type-1',
        name: 'Excelência no Atendimento',
        active: false, // Desativado
        creator: {
          id: 'user-1',
          name: 'Admin Test',
          email: 'admin@test.com'
        }
      };

      mockXpAvulsoService.toggleXpTypeStatus.mockResolvedValue(mockUpdatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Tipo de XP desativado com sucesso');
      expect(data.data.active).toBe(false);
      expect(mockXpAvulsoService.toggleXpTypeStatus).toHaveBeenCalledWith('type-1');
    });

    it('deve ativar tipo de XP com sucesso', async () => {
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

      const mockUpdatedType = {
        id: 'type-1',
        name: 'Excelência no Atendimento',
        active: true, // Ativado
        creator: {
          id: 'user-1',
          name: 'Admin Test',
          email: 'admin@test.com'
        }
      };

      mockXpAvulsoService.toggleXpTypeStatus.mockResolvedValue(mockUpdatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Tipo de XP ativado com sucesso');
      expect(data.data.active).toBe(true);
    });

    it('deve retornar erro 404 quando tipo não encontrado', async () => {
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

      mockXpAvulsoService.toggleXpTypeStatus.mockRejectedValue(
        new Error('Tipo de XP não encontrado')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-inexistente', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'type-inexistente' } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Tipo de XP não encontrado');
    });

    it('deve retornar erro 401 se não autenticado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Não autorizado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Não autorizado');
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

      mockXpAvulsoService.toggleXpTypeStatus.mockRejectedValue(
        new Error('Erro no banco de dados')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-types/type-1', {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: { id: 'type-1' } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Erro interno do servidor');
    });
  });
});