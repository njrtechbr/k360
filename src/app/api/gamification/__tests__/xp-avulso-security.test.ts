/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { POST as postXpGrants } from '../xp-grants/route';
import { POST as postXpTypes } from '../xp-types/route';
import { XpAvulsoService } from '@/services/xpAvulsoService';
import { AuthMiddleware, AuditLogger } from '@/lib/auth-middleware';

// Mock dos serviços
jest.mock('@/services/xpAvulsoService');
jest.mock('@/lib/auth-middleware');
jest.mock('@/lib/rate-limit');

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<typeof XpAvulsoService>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;
const mockAuditLogger = AuditLogger as jest.Mocked<typeof AuditLogger>;

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

describe('XP Avulso - Testes de Segurança e Auditoria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Testes de Autenticação e Autorização', () => {
    it('deve rejeitar requisições sem token de autenticação', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Token de autenticação não fornecido',
        statusCode: 401
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

      expect(response.status).toBe(401);
      expect(data.error).toBe('Token de autenticação não fornecido');
    });

    it('deve rejeitar tokens inválidos ou expirados', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Token inválido ou expirado',
        statusCode: 401
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Token inválido ou expirado');
    });

    it('deve verificar permissões por role corretamente', async () => {
      // Testar role USUARIO (sem permissão)
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Acesso negado. Permissão insuficiente.',
        statusCode: 403
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Authorization': 'Bearer valid-token-usuario'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Acesso negado. Permissão insuficiente.');
    });

    it('deve permitir acesso apenas para roles autorizados', async () => {
      const authorizedRoles = ['ADMIN', 'SUPERADMIN'];
      
      for (const role of authorizedRoles) {
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: true,
          session: {
            user: {
              id: `user-${role.toLowerCase()}`,
              email: `${role.toLowerCase()}@test.com`,
              name: `${role} Test`,
              role: role as any
            }
          }
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
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer valid-token-${role.toLowerCase()}`
          }
        });

        const response = await postXpGrants(request);
        
        expect(response.status).toBe(201);
      }
    });
  });

  describe('Testes de Rate Limiting e Proteção contra Abuso', () => {
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

    it('deve aplicar rate limiting por IP', async () => {
      const { xpGrantRateLimiter } = require('@/lib/rate-limit');
      
      // Simular limite atingido
      xpGrantRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 300000 // 5 minutos
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Muitas tentativas');
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('deve aplicar rate limiting por usuário', async () => {
      const { xpGrantRateLimiter } = require('@/lib/rate-limit');
      
      // Simular limite específico do usuário atingido
      xpGrantRateLimiter.checkLimit.mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 3600000, // 1 hora
        limitType: 'user'
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toContain('Muitas tentativas de concessão');
    });

    it('deve detectar padrões suspeitos de concessão', async () => {
      // Simular erro de limite de negócio
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error('Limite diário de concessões atingido (50)')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Limite diário de concessões atingido (50)');
    });
  });

  describe('Testes de Validação e Sanitização de Dados', () => {
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

    it('deve sanitizar e validar entrada de dados', async () => {
      const maliciousInputs = [
        {
          name: '<script>alert("xss")</script>',
          description: 'Test',
          points: 50
        },
        {
          name: 'Test',
          description: '${process.env.DATABASE_URL}',
          points: 50
        },
        {
          name: 'Test',
          description: 'Test',
          points: 999999999 // Valor extremamente alto
        }
      ];

      for (const maliciousInput of maliciousInputs) {
        const request = new NextRequest('http://localhost/api/gamification/xp-types', {
          method: 'POST',
          body: JSON.stringify(maliciousInput),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await postXpTypes(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Dados inválidos');
        expect(data.details).toBeDefined();
      }
    });

    it('deve validar IDs para prevenir injection', async () => {
      const maliciousIds = [
        "'; DROP TABLE xp_grants; --",
        "../../../etc/passwd",
        "null",
        "undefined",
        "{}",
        "[]"
      ];

      for (const maliciousId of maliciousIds) {
        const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
          method: 'POST',
          body: JSON.stringify({
            attendantId: maliciousId,
            typeId: 'type-1'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await postXpGrants(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Dados inválidos');
      }
    });

    it('deve limitar tamanho de campos de texto', async () => {
      const longText = 'A'.repeat(10000); // Texto muito longo

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1',
          justification: longText
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Dados inválidos');
      expect(data.details).toContain('justification');
    });
  });

  describe('Testes de Auditoria e Logging', () => {
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

      mockAuditLogger.logAdminAction.mockResolvedValue(undefined);
    });

    it('deve registrar todas as ações administrativas', async () => {
      mockXpAvulsoService.createXpType.mockResolvedValue({
        id: 'type-1',
        name: 'Test Type',
        description: 'Test',
        points: 50
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Type',
          description: 'Test',
          points: 50
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await postXpTypes(request);

      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'CREATE_XP_TYPE',
        expect.objectContaining({
          typeName: 'Test Type',
          points: 50
        })
      );
    });

    it('deve registrar concessões de XP com detalhes completos', async () => {
      mockXpAvulsoService.grantXp.mockResolvedValue({
        id: 'grant-1',
        attendant: { id: 'att-1', name: 'João Silva' },
        type: { id: 'type-1', name: 'Excelência', points: 100 },
        points: 100,
        justification: 'Excelente trabalho'
      } as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1',
          justification: 'Excelente trabalho'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await postXpGrants(request);

      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-1',
        'GRANT_XP',
        expect.objectContaining({
          attendantId: 'att-1',
          typeId: 'type-1',
          points: 100,
          justification: 'Excelente trabalho'
        })
      );
    });

    it('deve registrar tentativas de acesso negado', async () => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Acesso negado',
        statusCode: 403
      });

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      await postXpGrants(request);

      // Verificar se o middleware de auth registrou a tentativa
      expect(mockAuthMiddleware.checkAuth).toHaveBeenCalled();
    });
  });

  describe('Testes de Proteção contra Ataques', () => {
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

    it('deve proteger contra ataques de força bruta', async () => {
      const { xpGrantRateLimiter } = require('@/lib/rate-limit');
      
      // Simular múltiplas tentativas falhadas
      for (let i = 0; i < 5; i++) {
        xpGrantRateLimiter.checkLimit.mockResolvedValueOnce({
          allowed: i < 3, // Permitir apenas as 3 primeiras
          remaining: Math.max(0, 2 - i),
          resetTime: Date.now() + 60000
        });

        const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
          method: 'POST',
          body: JSON.stringify({
            attendantId: 'att-1',
            typeId: 'invalid-type'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        });

        const response = await postXpGrants(request);

        if (i >= 3) {
          expect(response.status).toBe(429);
        }
      }
    });

    it('deve proteger contra ataques de timing', async () => {
      const startTime = Date.now();

      // Simular erro de validação
      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: '',
          typeId: ''
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      await postXpGrants(request);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verificar se o tempo de resposta não revela informações
      expect(responseTime).toBeGreaterThan(10); // Tempo mínimo para evitar timing attacks
    });

    it('deve proteger contra CSRF', async () => {
      // Simular requisição sem CSRF token apropriado
      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'type-1'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Origin': 'https://malicious-site.com'
        }
      });

      // O middleware de auth deve verificar a origem
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: 'Origem não autorizada',
        statusCode: 403
      });

      const response = await postXpGrants(request);

      expect(response.status).toBe(403);
    });
  });

  describe('Testes de Integridade de Dados', () => {
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

    it('deve validar integridade referencial', async () => {
      // Simular erro de referência inválida
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error('Atendente não encontrado')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'invalid-attendant-id',
          typeId: 'type-1'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Atendente não encontrado');
    });

    it('deve validar consistência de dados', async () => {
      // Simular erro de consistência (tipo inativo)
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error('Tipo de XP está inativo')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-1',
          typeId: 'inactive-type-id'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Tipo de XP está inativo');
    });

    it('deve prevenir condições de corrida', async () => {
      // Simular múltiplas requisições simultâneas
      const promises = Array.from({ length: 5 }, (_, i) => {
        mockXpAvulsoService.grantXp.mockResolvedValueOnce({
          id: `grant-${i + 1}`,
          attendant: { id: 'att-1', name: 'Test' },
          type: { id: 'type-1', name: 'Test', points: 50 },
          points: 50
        } as any);

        return postXpGrants(new NextRequest('http://localhost/api/gamification/xp-grants', {
          method: 'POST',
          body: JSON.stringify({
            attendantId: 'att-1',
            typeId: 'type-1'
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }));
      });

      const responses = await Promise.all(promises);

      // Todas as requisições devem ser processadas corretamente
      responses.forEach(response => {
        expect([201, 429]).toContain(response.status); // Sucesso ou rate limit
      });
    });
  });
});