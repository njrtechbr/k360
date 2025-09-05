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

describe('XP Avulso - Validação de Auditoria e Logs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock padrão de autenticação
    mockAuthMiddleware.checkAuth.mockResolvedValue({
      authorized: true,
      session: {
        user: {
          id: 'admin-audit',
          email: 'admin.audit@empresa.com',
          name: 'Admin Auditoria',
          role: 'ADMIN'
        }
      }
    });

    // Mock padrão do audit logger
    mockAuditLogger.logAdminAction.mockResolvedValue(undefined);
  });

  describe('Validação de Logs de Auditoria Completos', () => {
    it('deve registrar log completo para criação de tipo de XP', async () => {
      const mockCreatedType = {
        id: 'type-audit-complete',
        name: 'Tipo Auditoria Completa',
        description: 'Tipo criado para validação completa de auditoria',
        points: 125,
        active: true,
        category: 'performance',
        icon: 'award',
        color: '#9333EA',
        createdAt: new Date('2024-01-15T10:30:00Z'),
        updatedAt: new Date('2024-01-15T10:30:00Z'),
        createdBy: 'admin-audit',
        creator: {
          id: 'admin-audit',
          name: 'Admin Auditoria',
          email: 'admin.audit@empresa.com'
        }
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(mockCreatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tipo Auditoria Completa',
          description: 'Tipo criado para validação completa de auditoria',
          points: 125,
          category: 'performance',
          icon: 'award',
          color: '#9333EA'
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '192.168.1.100',
          'User-Agent': 'Admin Dashboard v2.1.0',
          'X-Request-ID': 'req-audit-001'
        }
      });

      await postXpTypes(request);

      // Verificar que o log foi registrado com todos os detalhes necessários
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-audit',
        'CREATE_XP_TYPE',
        expect.objectContaining({
          // Dados do tipo criado
          typeId: 'type-audit-complete',
          typeName: 'Tipo Auditoria Completa',
          description: 'Tipo criado para validação completa de auditoria',
          points: 125,
          category: 'performance',
          icon: 'award',
          color: '#9333EA',
          
          // Metadados da requisição
          metadata: expect.objectContaining({
            ipAddress: '192.168.1.100',
            userAgent: 'Admin Dashboard v2.1.0',
            requestId: 'req-audit-001',
            timestamp: expect.any(String),
            endpoint: '/api/gamification/xp-types',
            method: 'POST'
          }),
          
          // Contexto do usuário
          userContext: expect.objectContaining({
            userId: 'admin-audit',
            userName: 'Admin Auditoria',
            userEmail: 'admin.audit@empresa.com',
            userRole: 'ADMIN'
          })
        })
      );
    });

    it('deve registrar log completo para concessão de XP com conquistas', async () => {
      const mockAttendant = {
        id: 'att-audit-test',
        name: 'Atendente Auditoria',
        email: 'atendente.audit@empresa.com'
      };

      const mockXpType = {
        id: 'type-excellence-audit',
        name: 'Excelência Auditada',
        description: 'Tipo para teste de auditoria de concessão',
        points: 200,
        category: 'excellence',
        icon: 'star',
        color: '#F59E0B'
      };

      const mockGrant = {
        id: 'grant-audit-complete',
        attendantId: 'att-audit-test',
        typeId: 'type-excellence-audit',
        points: 200,
        justification: 'Demonstrou excelência excepcional no atendimento ao cliente VIP',
        grantedAt: new Date('2024-01-15T14:45:30Z'),
        grantedBy: 'admin-audit',
        xpEventId: 'event-audit-001',
        attendant: mockAttendant,
        type: mockXpType,
        granter: {
          id: 'admin-audit',
          name: 'Admin Auditoria',
          email: 'admin.audit@empresa.com'
        }
      };

      const mockUnlockedAchievements = [
        {
          id: 'achievement-excellence-master',
          title: 'Mestre da Excelência',
          description: 'Alcançou 1000 pontos em excelência',
          icon: 'crown',
          category: 'mastery'
        },
        {
          id: 'achievement-vip-specialist',
          title: 'Especialista VIP',
          description: 'Reconhecido por atendimento VIP excepcional',
          icon: 'diamond',
          category: 'specialization'
        }
      ];

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue(mockUnlockedAchievements as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-audit-test',
          typeId: 'type-excellence-audit',
          justification: 'Demonstrou excelência excepcional no atendimento ao cliente VIP'
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '10.0.0.50',
          'User-Agent': 'Admin Mobile App v1.5.2',
          'X-Request-ID': 'req-grant-audit-001',
          'X-Session-ID': 'session-audit-123'
        }
      });

      await postXpGrants(request);

      // Verificar que o log foi registrado com todos os detalhes da concessão
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-audit',
        'GRANT_XP',
        expect.objectContaining({
          // Dados da concessão
          grantId: 'grant-audit-complete',
          attendantId: 'att-audit-test',
          attendantName: 'Atendente Auditoria',
          attendantEmail: 'atendente.audit@empresa.com',
          typeId: 'type-excellence-audit',
          typeName: 'Excelência Auditada',
          points: 200,
          justification: 'Demonstrou excelência excepcional no atendimento ao cliente VIP',
          
          // Conquistas desbloqueadas
          achievementsUnlocked: 2,
          achievementDetails: [
            {
              id: 'achievement-excellence-master',
              title: 'Mestre da Excelência',
              category: 'mastery'
            },
            {
              id: 'achievement-vip-specialist',
              title: 'Especialista VIP',
              category: 'specialization'
            }
          ],
          
          // Impacto na gamificação
          xpEventId: 'event-audit-001',
          previousXp: expect.any(Number),
          newTotalXp: expect.any(Number),
          levelUp: expect.any(Boolean),
          
          // Metadados da requisição
          metadata: expect.objectContaining({
            ipAddress: '10.0.0.50',
            userAgent: 'Admin Mobile App v1.5.2',
            requestId: 'req-grant-audit-001',
            sessionId: 'session-audit-123',
            timestamp: expect.any(String),
            endpoint: '/api/gamification/xp-grants',
            method: 'POST'
          }),
          
          // Contexto do usuário
          userContext: expect.objectContaining({
            userId: 'admin-audit',
            userName: 'Admin Auditoria',
            userEmail: 'admin.audit@empresa.com',
            userRole: 'ADMIN'
          })
        })
      );
    });

    it('deve registrar logs de tentativas falhadas com detalhes do erro', async () => {
      // Simular erro de limite atingido
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error('Limite diário de concessões atingido (50)')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-limit-test',
          typeId: 'type-test',
          justification: 'Tentativa após limite atingido'
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '172.16.0.10',
          'User-Agent': 'Admin Web Interface v3.0',
          'X-Request-ID': 'req-failed-001'
        }
      });

      await postXpGrants(request);

      // Verificar que a tentativa falhada foi registrada
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-audit',
        'GRANT_XP_FAILED',
        expect.objectContaining({
          // Dados da tentativa
          attendantId: 'att-limit-test',
          typeId: 'type-test',
          justification: 'Tentativa após limite atingido',
          
          // Detalhes do erro
          errorType: 'LIMIT_EXCEEDED',
          errorMessage: 'Limite diário de concessões atingido (50)',
          errorCode: 'DAILY_GRANT_LIMIT',
          
          // Contexto de segurança
          securityContext: expect.objectContaining({
            riskLevel: 'MEDIUM',
            reason: 'Tentativa de concessão após limite diário',
            requiresReview: true
          }),
          
          // Metadados da requisição
          metadata: expect.objectContaining({
            ipAddress: '172.16.0.10',
            userAgent: 'Admin Web Interface v3.0',
            requestId: 'req-failed-001',
            timestamp: expect.any(String)
          })
        })
      );
    });

    it('deve registrar logs de atividade suspeita detectada', async () => {
      // Simular detecção de atividade suspeita
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error('Padrão suspeito detectado: muitas concessões para o mesmo atendente')
      );

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-suspicious',
          typeId: 'type-high-value',
          justification: 'Concessão repetitiva suspeita'
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '203.0.113.50',
          'User-Agent': 'Automated Script v1.0',
          'X-Request-ID': 'req-suspicious-001'
        }
      });

      await postXpGrants(request);

      // Verificar que a atividade suspeita foi registrada
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        'admin-audit',
        'SUSPICIOUS_ACTIVITY_DETECTED',
        expect.objectContaining({
          // Detalhes da atividade suspeita
          activityType: 'REPETITIVE_GRANTS',
          suspiciousPattern: 'muitas concessões para o mesmo atendente',
          targetAttendantId: 'att-suspicious',
          attemptedTypeId: 'type-high-value',
          
          // Análise de risco
          riskAssessment: expect.objectContaining({
            riskLevel: 'HIGH',
            riskFactors: expect.arrayContaining([
              'REPETITIVE_PATTERN',
              'HIGH_VALUE_TYPE',
              'AUTOMATED_USER_AGENT'
            ]),
            requiresImmediateReview: true,
            suggestedActions: expect.arrayContaining([
              'REVIEW_USER_PERMISSIONS',
              'INVESTIGATE_PATTERN',
              'TEMPORARY_RESTRICTION'
            ])
          }),
          
          // Contexto histórico
          historicalContext: expect.objectContaining({
            recentGrantsCount: expect.any(Number),
            recentGrantsTimeframe: '24h',
            previousSuspiciousActivity: expect.any(Boolean)
          }),
          
          // Metadados da requisição
          metadata: expect.objectContaining({
            ipAddress: '203.0.113.50',
            userAgent: 'Automated Script v1.0',
            requestId: 'req-suspicious-001',
            timestamp: expect.any(String)
          })
        })
      );
    });
  });

  describe('Validação de Integridade dos Logs', () => {
    it('deve garantir que todos os logs tenham campos obrigatórios', async () => {
      const mockGrant = {
        id: 'grant-integrity-test',
        attendantId: 'att-integrity',
        typeId: 'type-integrity',
        points: 100,
        attendant: { id: 'att-integrity', name: 'Atendente Integridade' },
        type: { id: 'type-integrity', name: 'Tipo Integridade', points: 100 }
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-integrity',
          typeId: 'type-integrity'
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      await postXpGrants(request);

      // Verificar que o log tem todos os campos obrigatórios
      const logCall = mockAuditLogger.logAdminAction.mock.calls[0];
      const [userId, action, details] = logCall;

      // Campos obrigatórios do log
      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');
      expect(action).toBeDefined();
      expect(typeof action).toBe('string');
      expect(details).toBeDefined();
      expect(typeof details).toBe('object');

      // Campos obrigatórios dos detalhes
      expect(details.metadata).toBeDefined();
      expect(details.metadata.timestamp).toBeDefined();
      expect(details.metadata.endpoint).toBeDefined();
      expect(details.metadata.method).toBeDefined();
      
      expect(details.userContext).toBeDefined();
      expect(details.userContext.userId).toBeDefined();
      expect(details.userContext.userRole).toBeDefined();
    });

    it('deve validar formato e estrutura dos logs de auditoria', async () => {
      const mockCreatedType = {
        id: 'type-format-test',
        name: 'Tipo Formato',
        points: 75
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(mockCreatedType as any);

      const request = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tipo Formato',
          description: 'Teste de formato',
          points: 75
        }),
        headers: { 'Content-Type': 'application/json' }
      });

      await postXpTypes(request);

      const logCall = mockAuditLogger.logAdminAction.mock.calls[0];
      const [userId, action, details] = logCall;

      // Validar estrutura do log
      expect(userId).toMatch(/^[a-zA-Z0-9-_]+$/); // ID válido
      expect(action).toMatch(/^[A-Z_]+$/); // Ação em maiúsculas com underscores
      
      // Validar estrutura dos detalhes
      expect(details).toMatchObject({
        metadata: expect.objectContaining({
          timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/), // ISO timestamp
          endpoint: expect.stringMatching(/^\/api\//), // Endpoint válido
          method: expect.stringMatching(/^(GET|POST|PUT|DELETE)$/) // Método HTTP válido
        }),
        userContext: expect.objectContaining({
          userId: expect.stringMatching(/^[a-zA-Z0-9-_]+$/),
          userRole: expect.stringMatching(/^(SUPERADMIN|ADMIN|SUPERVISOR|USUARIO)$/)
        })
      });
    });

    it('deve garantir que logs não contenham informações sensíveis', async () => {
      const mockGrant = {
        id: 'grant-sensitive-test',
        attendantId: 'att-sensitive',
        typeId: 'type-sensitive',
        points: 150,
        justification: 'Informação com dados pessoais: CPF 123.456.789-00, senha: admin123',
        attendant: { 
          id: 'att-sensitive', 
          name: 'Atendente Sensível',
          email: 'atendente@empresa.com',
          cpf: '123.456.789-00' // Dado sensível
        },
        type: { id: 'type-sensitive', name: 'Tipo Sensível', points: 150 }
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue([]);

      const request = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-sensitive',
          typeId: 'type-sensitive',
          justification: 'Informação com dados pessoais: CPF 123.456.789-00, senha: admin123'
        }),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sensitive-token-12345'
        }
      });

      await postXpGrants(request);

      const logCall = mockAuditLogger.logAdminAction.mock.calls[0];
      const [, , details] = logCall;
      const logString = JSON.stringify(details);

      // Verificar que informações sensíveis foram sanitizadas ou removidas
      expect(logString).not.toContain('123.456.789-00'); // CPF
      expect(logString).not.toContain('admin123'); // Senha
      expect(logString).not.toContain('sensitive-token-12345'); // Token
      
      // Verificar que dados necessários ainda estão presentes (mas sanitizados)
      expect(details.justification).toContain('[DADOS_PESSOAIS_REMOVIDOS]');
      expect(details.attendantName).toBe('Atendente Sensível'); // Nome pode ficar
      expect(details.attendantEmail).toBeUndefined(); // Email deve ser removido do log
    });
  });

  describe('Validação de Rastreabilidade e Correlação', () => {
    it('deve permitir correlação entre logs relacionados', async () => {
      const correlationId = 'corr-test-001';
      
      // Primeira ação: criar tipo
      const mockCreatedType = {
        id: 'type-correlation-test',
        name: 'Tipo Correlação',
        points: 100
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(mockCreatedType as any);

      const createRequest = new NextRequest('http://localhost/api/gamification/xp-types', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tipo Correlação',
          description: 'Teste de correlação',
          points: 100
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId
        }
      });

      await postXpTypes(createRequest);

      // Segunda ação: conceder XP usando o tipo criado
      const mockGrant = {
        id: 'grant-correlation-test',
        attendantId: 'att-correlation',
        typeId: 'type-correlation-test',
        points: 100,
        attendant: { id: 'att-correlation', name: 'Atendente Correlação' },
        type: mockCreatedType
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue([]);

      const grantRequest = new NextRequest('http://localhost/api/gamification/xp-grants', {
        method: 'POST',
        body: JSON.stringify({
          attendantId: 'att-correlation',
          typeId: 'type-correlation-test'
        }),
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-ID': correlationId
        }
      });

      await postXpGrants(grantRequest);

      // Verificar que ambos os logs têm o mesmo correlation ID
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledTimes(2);
      
      const createLog = mockAuditLogger.logAdminAction.mock.calls[0][2];
      const grantLog = mockAuditLogger.logAdminAction.mock.calls[1][2];
      
      expect(createLog.metadata.correlationId).toBe(correlationId);
      expect(grantLog.metadata.correlationId).toBe(correlationId);
      
      // Verificar que há referência entre as ações
      expect(grantLog.relatedActions).toContain('CREATE_XP_TYPE');
      expect(grantLog.relatedTypeId).toBe('type-correlation-test');
    });

    it('deve manter cadeia de auditoria para ações sequenciais', async () => {
      const sessionId = 'session-chain-001';
      
      // Simular sequência de ações na mesma sessão
      const actions = [
        {
          type: 'CREATE_TYPE',
          request: () => postXpTypes(new NextRequest('http://localhost/api/gamification/xp-types', {
            method: 'POST',
            body: JSON.stringify({ name: 'Tipo 1', description: 'Primeiro tipo', points: 50 }),
            headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId }
          }))
        },
        {
          type: 'CREATE_TYPE',
          request: () => postXpTypes(new NextRequest('http://localhost/api/gamification/xp-types', {
            method: 'POST',
            body: JSON.stringify({ name: 'Tipo 2', description: 'Segundo tipo', points: 75 }),
            headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId }
          }))
        },
        {
          type: 'GRANT_XP',
          request: () => postXpGrants(new NextRequest('http://localhost/api/gamification/xp-grants', {
            method: 'POST',
            body: JSON.stringify({ attendantId: 'att-1', typeId: 'type-1' }),
            headers: { 'Content-Type': 'application/json', 'X-Session-ID': sessionId }
          }))
        }
      ];

      // Mock dos retornos
      mockXpAvulsoService.createXpType
        .mockResolvedValueOnce({ id: 'type-1', name: 'Tipo 1', points: 50 } as any)
        .mockResolvedValueOnce({ id: 'type-2', name: 'Tipo 2', points: 75 } as any);
      
      mockXpAvulsoService.grantXp.mockResolvedValue({
        id: 'grant-1',
        attendantId: 'att-1',
        typeId: 'type-1',
        points: 50,
        attendant: { id: 'att-1', name: 'Atendente 1' },
        type: { id: 'type-1', name: 'Tipo 1', points: 50 }
      } as any);
      
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue([]);

      // Executar ações sequencialmente
      for (const action of actions) {
        await action.request();
      }

      // Verificar que todos os logs têm o mesmo session ID
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledTimes(3);
      
      const logs = mockAuditLogger.logAdminAction.mock.calls.map(call => call[2]);
      
      logs.forEach(log => {
        expect(log.metadata.sessionId).toBe(sessionId);
      });
      
      // Verificar que há sequência temporal nos logs
      const timestamps = logs.map(log => new Date(log.metadata.timestamp).getTime());
      for (let i = 1; i < timestamps.length; i++) {
        expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
      }
      
      // Verificar que o último log referencia as ações anteriores da sessão
      const lastLog = logs[logs.length - 1];
      expect(lastLog.sessionContext).toMatchObject({
        sessionId: sessionId,
        actionSequence: 3,
        previousActions: ['CREATE_XP_TYPE', 'CREATE_XP_TYPE'],
        sessionDuration: expect.any(Number)
      });
    });
  });
});