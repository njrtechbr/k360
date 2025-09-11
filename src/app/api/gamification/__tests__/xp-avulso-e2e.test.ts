/**
 * @jest-environment node
 *
 * Testes E2E completos para o sistema de XP Avulso
 * Testa o fluxo completo: criação de tipo → concessão → verificação de conquistas
 */

import { NextRequest } from "next/server";
import { POST as postXpTypes } from "../xp-types/route";
import { POST as postXpGrants, GET as getXpGrants } from "../xp-grants/route";
import { GET as getAttendantGrants } from "../xp-grants/attendant/[id]/route";

// Mock dos serviços mantendo os schemas
jest.mock("@/services/xpAvulsoService", () => {
  const actual = jest.requireActual("@/services/xpAvulsoService");
  return {
    ...actual,
    XpAvulsoService: {
      createXpType: jest.fn(),
      grantXp: jest.fn(),
      findGrantHistory: jest.fn(),
      findGrantsByAttendantWithSort: jest.fn(),
      findAllXpTypes: jest.fn(),
    },
  };
});

jest.mock("@/services/gamificationService", () => ({
  GamificationService: {
    calculateTotalXp: jest.fn(),
  },
}));

jest.mock("@/lib/auth-middleware", () => ({
  AuthMiddleware: {
    checkAuth: jest.fn(),
  },
  AuditLogger: {
    logAdminAction: jest.fn(),
  },
  AuthConfigs: {
    adminOnly: "adminOnly",
    supervisorAndAbove: "supervisorAndAbove",
  },
}));

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

// Importar após os mocks
import { XpAvulsoService } from "@/services/xpAvulsoService";
import { GamificationService } from "@/services/gamificationService";
import { AuthMiddleware, AuditLogger } from "@/lib/auth-middleware";

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<
  typeof XpAvulsoService
>;
const mockGamificationService = GamificationService as jest.Mocked<
  typeof GamificationService
>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;
const mockAuditLogger = AuditLogger as jest.Mocked<typeof AuditLogger>;

describe("XP Avulso - Testes E2E Completos", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock padrão de autenticação para ADMIN
    mockAuthMiddleware.checkAuth.mockResolvedValue({
      authorized: true,
      session: {
        user: {
          id: "admin-1",
          email: "admin@test.com",
          name: "Admin Test",
          role: "ADMIN",
        },
      },
    });

    // Mock padrão do audit logger
    mockAuditLogger.logAdminAction.mockResolvedValue(undefined);
  });

  describe("Fluxo Completo: Criação → Concessão → Verificação", () => {
    it("deve executar fluxo completo de criação de tipo até concessão com conquistas", async () => {
      // === ETAPA 1: Criar tipo de XP ===
      const mockCreatedType = {
        id: "type-excellence",
        name: "Excelência no Atendimento",
        description: "Reconhecimento por atendimento excepcional",
        points: 150,
        active: true,
        category: "atendimento",
        icon: "star",
        color: "#FFD700",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "admin-1",
        creator: {
          id: "admin-1",
          name: "Admin Test",
          email: "admin@test.com",
        },
      };

      mockXpAvulsoService.createXpType.mockResolvedValue(
        mockCreatedType as any,
      );

      const createTypeRequest = new NextRequest(
        "http://localhost/api/gamification/xp-types",
        {
          method: "POST",
          body: JSON.stringify({
            name: "Excelência no Atendimento",
            description: "Reconhecimento por atendimento excepcional",
            points: 150,
            category: "atendimento",
            icon: "star",
            color: "#FFD700",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const createTypeResponse = await postXpTypes(createTypeRequest);
      const createTypeData = await createTypeResponse.json();

      // Verificar criação do tipo
      expect(createTypeResponse.status).toBe(201);
      expect(createTypeData.success).toBe(true);
      expect(createTypeData.data.name).toBe("Excelência no Atendimento");
      expect(createTypeData.data.points).toBe(150);

      // === ETAPA 2: Conceder XP usando o tipo criado ===
      const mockGrant = {
        id: "grant-excellence-1",
        attendantId: "att-joao",
        typeId: "type-excellence",
        points: 150,
        justification: "Resolveu problema complexo com excelência",
        grantedAt: new Date(),
        grantedBy: "admin-1",
        xpEventId: "event-123",
        attendant: {
          id: "att-joao",
          name: "João Silva",
          email: "joao.silva@empresa.com",
        },
        type: mockCreatedType,
        granter: {
          id: "admin-1",
          name: "Admin Test",
          email: "admin@test.com",
          role: "ADMIN",
        },
        xpEvent: {
          id: "event-123",
          attendantId: "att-joao",
          points: 150,
          reason:
            "XP Avulso: Excelência no Atendimento - Resolveu problema complexo com excelência",
        },
        // Dados de notificação incluindo conquistas desbloqueadas
        notificationData: {
          attendantId: "att-joao",
          xpAmount: 150,
          typeName: "Excelência no Atendimento",
          justification: "Resolveu problema complexo com excelência",
          levelUp: null,
          achievementsUnlocked: [
            {
              id: "achievement-first-xp",
              title: "Primeiro Reconhecimento",
              description: "Recebeu seu primeiro XP avulso",
            },
            {
              id: "achievement-excellence",
              title: "Excelência Reconhecida",
              description: "Recebeu XP por excelência no atendimento",
            },
          ],
        },
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);

      const grantXpRequest = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-joao",
            typeId: "type-excellence",
            justification: "Resolveu problema complexo com excelência",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const grantXpResponse = await postXpGrants(grantXpRequest);
      const grantXpData = await grantXpResponse.json();

      // Verificar concessão de XP
      expect(grantXpResponse.status).toBe(201);
      expect(grantXpData.success).toBe(true);
      expect(grantXpData.data.points).toBe(150);
      expect(grantXpData.data.attendant.name).toBe("João Silva");
      expect(grantXpData.data.type.name).toBe("Excelência no Atendimento");
      expect(grantXpData.data.justification).toBe(
        "Resolveu problema complexo com excelência",
      );

      // Verificar conquistas desbloqueadas
      expect(grantXpData.data.notification).toBeDefined();
      expect(grantXpData.data.notification.achievementsUnlocked).toHaveLength(
        2,
      );
      expect(grantXpData.data.notification.achievementsUnlocked[0].title).toBe(
        "Primeiro Reconhecimento",
      );
      expect(grantXpData.data.notification.achievementsUnlocked[1].title).toBe(
        "Excelência Reconhecida",
      );

      // === ETAPA 3: Verificar histórico geral ===
      const mockHistoryResult = {
        grants: [mockGrant],
        total: 1,
        page: 1,
        totalPages: 1,
      };

      mockXpAvulsoService.findGrantHistory.mockResolvedValue(
        mockHistoryResult as any,
      );

      const historyRequest = new NextRequest(
        "http://localhost/api/gamification/xp-grants?page=1&limit=20",
      );
      const historyResponse = await getXpGrants(historyRequest);
      const historyData = await historyResponse.json();

      // Verificar histórico
      expect(historyResponse.status).toBe(200);
      expect(historyData.success).toBe(true);
      expect(historyData.data.grants).toHaveLength(1);
      expect(historyData.data.grants[0].attendant.name).toBe("João Silva");
      expect(historyData.data.pagination.total).toBe(1);

      // === ETAPA 4: Verificar histórico do atendente ===
      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue([
        mockGrant,
      ] as any);

      const attendantGrantsRequest = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-joao",
      );
      const attendantGrantsResponse = await getAttendantGrants(
        attendantGrantsRequest,
        { params: { id: "att-joao" } },
      );
      const attendantGrantsData = await attendantGrantsResponse.json();

      // Verificar histórico do atendente
      expect(attendantGrantsResponse.status).toBe(200);
      expect(attendantGrantsData.success).toBe(true);
      expect(attendantGrantsData.data.grants).toHaveLength(1);
      expect(attendantGrantsData.data.attendant.name).toBe("João Silva");
      expect(attendantGrantsData.data.summary.totalGrants).toBe(1);
      expect(attendantGrantsData.data.summary.totalPoints).toBe(150);

      // === ETAPA 5: Verificar chamadas dos serviços ===
      expect(mockXpAvulsoService.createXpType).toHaveBeenCalledWith({
        name: "Excelência no Atendimento",
        description: "Reconhecimento por atendimento excepcional",
        points: 150,
        category: "atendimento",
        icon: "star",
        color: "#FFD700",
        createdBy: "admin-1",
      });

      expect(mockXpAvulsoService.grantXp).toHaveBeenCalledWith({
        attendantId: "att-joao",
        typeId: "type-excellence",
        justification: "Resolveu problema complexo com excelência",
        grantedBy: "admin-1",
      });

      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: "grantedAt",
        sortOrder: "desc",
      });

      expect(
        mockXpAvulsoService.findGrantsByAttendantWithSort,
      ).toHaveBeenCalledWith("att-joao", "grantedAt", "desc");

      // === ETAPA 6: Verificar logs de auditoria ===
      expect(mockAuditLogger.logAdminAction).toHaveBeenCalledTimes(2);

      // Log da criação do tipo (ordem: action, userId, data, request)
      expect(mockAuditLogger.logAdminAction).toHaveBeenNthCalledWith(
        1,
        "CREATE_XP_TYPE",
        "admin-1",
        expect.objectContaining({
          name: "Excelência no Atendimento",
          points: 150,
          category: "atendimento",
        }),
        expect.any(Object), // request object
      );

      // Log da concessão de XP (ordem: userId, action, data)
      expect(mockAuditLogger.logAdminAction).toHaveBeenNthCalledWith(
        2,
        "admin-1",
        "XP_GRANT_CREATED",
        expect.objectContaining({
          grantId: "grant-excellence-1",
          attendantId: "att-joao",
          typeId: "type-excellence",
          points: 150,
          justification: "Resolveu problema complexo com excelência",
        }),
      );
    });

    it("deve testar experiência do atendente com mudança de nível", async () => {
      // Mock da concessão que resulta em mudança de nível
      const mockGrant = {
        id: "grant-level-up",
        attendantId: "att-carlos",
        typeId: "type-customer-satisfaction",
        points: 200,
        justification: "Cliente elogiou publicamente",
        grantedAt: new Date(),
        grantedBy: "admin-1",
        attendant: {
          id: "att-carlos",
          name: "Carlos Oliveira",
          email: "carlos.oliveira@empresa.com",
        },
        type: {
          id: "type-customer-satisfaction",
          name: "Satisfação do Cliente",
          points: 200,
          active: true,
        },
        granter: {
          id: "admin-1",
          name: "Admin Test",
          email: "admin@test.com",
          role: "ADMIN",
        },
        // Dados de notificação com mudança de nível
        notificationData: {
          attendantId: "att-carlos",
          xpAmount: 200,
          typeName: "Satisfação do Cliente",
          justification: "Cliente elogiou publicamente",
          levelUp: {
            previousLevel: 1,
            newLevel: 2,
            totalXp: 1050,
          },
          achievementsUnlocked: [
            {
              id: "achievement-level-up",
              title: "Subiu de Nível!",
              description: "Alcançou o nível 2",
            },
            {
              id: "achievement-customer-love",
              title: "Amor do Cliente",
              description: "Cliente fez elogio público",
            },
          ],
        },
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);
      mockGamificationService.calculateTotalXp.mockResolvedValue(1050);

      const grantRequest = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-carlos",
            typeId: "type-customer-satisfaction",
            justification: "Cliente elogiou publicamente",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const grantResponse = await postXpGrants(grantRequest);
      const grantData = await grantResponse.json();

      // Verificar resposta básica
      expect(grantResponse.status).toBe(201);
      expect(grantData.success).toBe(true);
      expect(grantData.data.points).toBe(200);
      expect(grantData.data.attendant.name).toBe("Carlos Oliveira");

      // Verificar mudança de nível
      expect(grantData.data.notification.levelUp).toBeDefined();
      expect(grantData.data.notification.levelUp.previousLevel).toBe(1);
      expect(grantData.data.notification.levelUp.newLevel).toBe(2);
      expect(grantData.data.notification.levelUp.totalXp).toBe(1050);

      // Verificar conquistas incluindo a de mudança de nível
      expect(grantData.data.notification.achievementsUnlocked).toHaveLength(2);

      const levelUpAchievement =
        grantData.data.notification.achievementsUnlocked.find(
          (a: any) => a.id === "achievement-level-up",
        );
      expect(levelUpAchievement).toBeDefined();
      expect(levelUpAchievement.title).toBe("Subiu de Nível!");

      const customerLoveAchievement =
        grantData.data.notification.achievementsUnlocked.find(
          (a: any) => a.id === "achievement-customer-love",
        );
      expect(customerLoveAchievement).toBeDefined();
      expect(customerLoveAchievement.title).toBe("Amor do Cliente");
    });

    it("deve verificar integração com sistema de conquistas", async () => {
      // Mock de concessão que desbloqueia múltiplas conquistas baseadas em diferentes critérios
      const mockGrant = {
        id: "grant-achievements",
        attendantId: "att-ana",
        typeId: "type-problem-solver",
        points: 120,
        justification: "Resolveu bug crítico",
        grantedAt: new Date(),
        grantedBy: "admin-1",
        attendant: {
          id: "att-ana",
          name: "Ana Costa",
        },
        type: {
          id: "type-problem-solver",
          name: "Solucionador de Problemas",
          points: 120,
        },
        granter: {
          id: "admin-1",
          name: "Admin Test",
          role: "ADMIN",
        },
        notificationData: {
          attendantId: "att-ana",
          xpAmount: 120,
          typeName: "Solucionador de Problemas",
          justification: "Resolveu bug crítico",
          levelUp: null,
          achievementsUnlocked: [
            {
              id: "achievement-xp-based",
              title: "Experiente",
              description: "Alcançou 500 XP total",
            },
            {
              id: "achievement-grant-count",
              title: "Reconhecido",
              description: "Recebeu 5 concessões de XP avulso",
            },
            {
              id: "achievement-type-specific",
              title: "Solucionador Expert",
              description: 'Recebeu 3 XP de "Solucionador de Problemas"',
            },
          ],
        },
      };

      mockXpAvulsoService.grantXp.mockResolvedValue(mockGrant as any);

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-ana",
            typeId: "type-problem-solver",
            justification: "Resolveu bug crítico",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const response = await postXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.data.notification.achievementsUnlocked).toHaveLength(3);

      // Verificar conquistas baseadas em diferentes critérios
      const achievements = data.data.notification.achievementsUnlocked;

      expect(
        achievements.find((a: any) => a.id === "achievement-xp-based"),
      ).toBeDefined();
      expect(
        achievements.find((a: any) => a.id === "achievement-grant-count"),
      ).toBeDefined();
      expect(
        achievements.find((a: any) => a.id === "achievement-type-specific"),
      ).toBeDefined();
    });

    it("deve processar múltiplas concessões e verificar acumulação", async () => {
      // Primeira concessão
      const mockGrant1 = {
        id: "grant-1",
        attendantId: "att-maria",
        typeId: "type-initiative",
        points: 75,
        justification: "Propôs melhoria no processo",
        grantedAt: new Date("2024-01-15T10:00:00Z"),
        attendant: { id: "att-maria", name: "Maria Santos" },
        type: { id: "type-initiative", name: "Iniciativa", points: 75 },
        granter: { id: "admin-1", name: "Admin Test", role: "ADMIN" },
        notificationData: {
          attendantId: "att-maria",
          xpAmount: 75,
          typeName: "Iniciativa",
          justification: "Propôs melhoria no processo",
          levelUp: null,
          achievementsUnlocked: [
            {
              id: "achievement-innovator",
              title: "Inovador",
              description: "Primeira sugestão aceita",
            },
          ],
        },
      };

      // Segunda concessão
      const mockGrant2 = {
        id: "grant-2",
        attendantId: "att-maria",
        typeId: "type-teamwork",
        points: 100,
        justification: "Ajudou colega com caso complexo",
        grantedAt: new Date("2024-01-16T14:30:00Z"),
        attendant: { id: "att-maria", name: "Maria Santos" },
        type: { id: "type-teamwork", name: "Trabalho em Equipe", points: 100 },
        granter: { id: "admin-1", name: "Admin Test", role: "ADMIN" },
        notificationData: {
          attendantId: "att-maria",
          xpAmount: 100,
          typeName: "Trabalho em Equipe",
          justification: "Ajudou colega com caso complexo",
          levelUp: null,
          achievementsUnlocked: [
            {
              id: "achievement-team-player",
              title: "Jogador de Equipe",
              description: "Excelente colaboração",
            },
          ],
        },
      };

      // Configurar mocks para as duas concessões
      mockXpAvulsoService.grantXp
        .mockResolvedValueOnce(mockGrant1 as any)
        .mockResolvedValueOnce(mockGrant2 as any);

      // Primeira concessão
      const grant1Request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-maria",
            typeId: "type-initiative",
            justification: "Propôs melhoria no processo",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const grant1Response = await postXpGrants(grant1Request);
      const grant1Data = await grant1Response.json();

      expect(grant1Response.status).toBe(201);
      expect(grant1Data.data.points).toBe(75);
      expect(grant1Data.data.notification.achievementsUnlocked).toHaveLength(1);

      // Segunda concessão
      const grant2Request = new NextRequest(
        "http://localhost/api/gamification/xp-grants",
        {
          method: "POST",
          body: JSON.stringify({
            attendantId: "att-maria",
            typeId: "type-teamwork",
            justification: "Ajudou colega com caso complexo",
          }),
          headers: { "Content-Type": "application/json" },
        },
      );

      const grant2Response = await postXpGrants(grant2Request);
      const grant2Data = await grant2Response.json();

      expect(grant2Response.status).toBe(201);
      expect(grant2Data.data.points).toBe(100);
      expect(grant2Data.data.notification.achievementsUnlocked).toHaveLength(1);

      // Verificar histórico consolidado
      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue([
        mockGrant2,
        mockGrant1,
      ] as any);

      const consolidatedRequest = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-maria",
      );
      const consolidatedResponse = await getAttendantGrants(
        consolidatedRequest,
        { params: { id: "att-maria" } },
      );
      const consolidatedData = await consolidatedResponse.json();

      expect(consolidatedResponse.status).toBe(200);
      expect(consolidatedData.data.grants).toHaveLength(2);

      // Verificar ordenação (mais recente primeiro)
      expect(consolidatedData.data.grants[0].type.name).toBe(
        "Trabalho em Equipe",
      );
      expect(consolidatedData.data.grants[1].type.name).toBe("Iniciativa");

      // Verificar que ambas as concessões foram processadas
      expect(mockXpAvulsoService.grantXp).toHaveBeenCalledTimes(2);
    });
  });

  describe("Testes de Performance e Escalabilidade", () => {
    it("deve lidar com histórico grande com paginação eficiente", async () => {
      // Simular histórico com muitas concessões
      const mockLargeHistory = {
        grants: Array.from({ length: 20 }, (_, i) => ({
          id: `grant-${i + 1}`,
          attendantId: `att-${(i % 5) + 1}`,
          typeId: "type-1",
          points: 50 + i * 10,
          grantedAt: new Date(Date.now() - i * 86400000),
          attendant: {
            id: `att-${(i % 5) + 1}`,
            name: `Atendente ${(i % 5) + 1}`,
          },
          type: {
            id: "type-1",
            name: "Tipo Padrão",
            points: 50,
            category: "general",
            icon: "star",
            color: "#3B82F6",
          },
          granter: {
            id: "admin-1",
            name: "Admin Test",
            role: "ADMIN",
          },
        })),
        total: 1000,
        page: 1,
        totalPages: 50,
      };

      mockXpAvulsoService.findGrantHistory.mockResolvedValue(
        mockLargeHistory as any,
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants?page=1&limit=20",
      );
      const response = await getXpGrants(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.grants).toHaveLength(20);
      expect(data.data.pagination.total).toBe(1000);
      expect(data.data.pagination.totalPages).toBe(50);
      expect(data.data.pagination.page).toBe(1);

      // Verificar que a paginação foi aplicada corretamente
      expect(mockXpAvulsoService.findGrantHistory).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        sortBy: "grantedAt",
        sortOrder: "desc",
      });
    });
  });
});
