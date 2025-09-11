/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import { GET } from "../[id]/route";
import { XpAvulsoService } from "@/services/xpAvulsoService";
import { AuthMiddleware } from "@/lib/auth-middleware";

// Mock dos serviços - mas não dos schemas
jest.mock("@/services/xpAvulsoService", () => {
  const actual = jest.requireActual("@/services/xpAvulsoService");
  return {
    ...actual,
    XpAvulsoService: {
      findGrantsByAttendantWithSort: jest.fn(),
    },
  };
});
jest.mock("@/lib/auth-middleware");
jest.mock("@/lib/rate-limit");

const mockXpAvulsoService = XpAvulsoService as jest.Mocked<
  typeof XpAvulsoService
>;
const mockAuthMiddleware = AuthMiddleware as jest.Mocked<typeof AuthMiddleware>;

// Mock do rate limiter
jest.mock("@/lib/rate-limit", () => ({
  xpAvulsoRateLimiter: {
    checkLimit: jest.fn().mockResolvedValue({
      allowed: true,
      remaining: 29,
      resetTime: Date.now() + 60000,
    }),
  },
}));

describe("/api/gamification/xp-grants/attendant/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET - Buscar concessões por atendente", () => {
    it("deve buscar concessões do atendente com sucesso", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      // Mock do serviço
      const mockGrants = [
        {
          id: "grant-1",
          attendant: { id: "att-1", name: "João Silva" },
          type: {
            id: "type-1",
            name: "Excelência no Atendimento",
            category: "performance",
            icon: "star",
            color: "#FFD700",
          },
          points: 100,
          justification: "Atendimento excepcional ao cliente",
          grantedAt: new Date("2024-01-15T10:00:00Z"),
          granter: { id: "user-1", name: "Admin Test", role: "ADMIN" },
        },
        {
          id: "grant-2",
          attendant: { id: "att-1", name: "João Silva" },
          type: {
            id: "type-2",
            name: "Trabalho em Equipe",
            category: "collaboration",
            icon: "users",
            color: "#3B82F6",
          },
          points: 75,
          justification: "Colaboração exemplar",
          grantedAt: new Date("2024-01-10T14:30:00Z"),
          granter: { id: "user-2", name: "Manager Test", role: "ADMIN" },
        },
      ];

      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue(
        mockGrants as any,
      );

      // Criar request mock
      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-1",
      );

      // Executar endpoint
      const response = await GET(request, { params: { id: "att-1" } });
      const data = await response.json();

      // Verificações
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.attendant.id).toBe("att-1");
      expect(data.data.attendant.name).toBe("João Silva");

      // Verificar estatísticas
      expect(data.data.summary.totalGrants).toBe(2);
      expect(data.data.summary.totalPoints).toBe(175);
      expect(data.data.summary.averagePoints).toBe(88); // Math.round(175/2)

      // Verificar agrupamento por tipo
      expect(data.data.grantsByType).toHaveLength(2);
      expect(data.data.grantsByType[0].totalPoints).toBe(100); // Ordenado por pontos desc
      expect(data.data.grantsByType[1].totalPoints).toBe(75);

      // Verificar concessões recentes
      expect(data.data.recentGrants).toHaveLength(2);
      expect(data.data.recentGrants[0].id).toBe("grant-1"); // Mais recente primeiro

      // Verificar todas as concessões
      expect(data.data.grants).toHaveLength(2);

      expect(
        mockXpAvulsoService.findGrantsByAttendantWithSort,
      ).toHaveBeenCalledWith("att-1", "grantedAt", "desc");
    });

    it("deve retornar dados vazios para atendente sem concessões", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      // Mock do serviço retornando array vazio
      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-2",
      );

      const response = await GET(request, { params: { id: "att-2" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.attendant.id).toBe("att-2");
      expect(data.data.attendant.name).toBe("Atendente não encontrado");
      expect(data.data.summary.totalGrants).toBe(0);
      expect(data.data.summary.totalPoints).toBe(0);
      expect(data.data.summary.averagePoints).toBe(0);
      expect(data.data.grantsByType).toHaveLength(0);
      expect(data.data.recentGrants).toHaveLength(0);
      expect(data.data.grants).toHaveLength(0);
    });

    it("deve retornar erro 401 se não autenticado", async () => {
      // Mock da autenticação falhando
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: false,
        error: "Não autorizado",
        statusCode: 401,
      });

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-1",
      );

      const response = await GET(request, { params: { id: "att-1" } });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Não autorizado");
    });

    it("deve retornar erro 400 para ID inválido", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/",
      );

      const response = await GET(request, { params: { id: "" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "ID do atendente é obrigatório e deve ser uma string válida",
      );
    });

    it("deve retornar erro 404 para atendente não encontrado", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      // Mock do serviço lançando erro de não encontrado
      mockXpAvulsoService.findGrantsByAttendantWithSort.mockRejectedValue(
        new Error("Atendente não encontrado"),
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/invalid-id",
      );

      const response = await GET(request, { params: { id: "invalid-id" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Atendente não encontrado");
    });

    it("deve limitar concessões recentes a 10 itens", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      // Criar 15 concessões mock
      const mockGrants = Array.from({ length: 15 }, (_, i) => ({
        id: `grant-${i + 1}`,
        attendant: { id: "att-1", name: "João Silva" },
        type: {
          id: "type-1",
          name: "Excelência",
          category: "performance",
          icon: "star",
          color: "#FFD700",
        },
        points: 50,
        justification: `Concessão ${i + 1}`,
        grantedAt: new Date(Date.now() - i * 86400000), // Datas diferentes
        granter: { id: "user-1", name: "Admin", role: "ADMIN" },
      }));

      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue(
        mockGrants as any,
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-1",
      );

      const response = await GET(request, { params: { id: "att-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.summary.totalGrants).toBe(15);
      expect(data.data.recentGrants).toHaveLength(10); // Limitado a 10
      expect(data.data.grants).toHaveLength(15); // Todas as concessões
      expect(
        mockXpAvulsoService.findGrantsByAttendantWithSort,
      ).toHaveBeenCalledWith("att-1", "grantedAt", "desc");
    });

    it("deve aplicar ordenação customizável por pontos", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      const mockGrants = [
        {
          id: "grant-1",
          attendant: { id: "att-1", name: "João Silva" },
          type: {
            id: "type-1",
            name: "Excelência",
            category: "performance",
            icon: "star",
            color: "#FFD700",
          },
          points: 50,
          justification: "Menor pontuação",
          grantedAt: new Date(),
          granter: { id: "user-1", name: "Admin", role: "ADMIN" },
        },
        {
          id: "grant-2",
          attendant: { id: "att-1", name: "João Silva" },
          type: {
            id: "type-2",
            name: "Liderança",
            category: "leadership",
            icon: "crown",
            color: "#8B5CF6",
          },
          points: 100,
          justification: "Maior pontuação",
          grantedAt: new Date(),
          granter: { id: "user-1", name: "Admin", role: "ADMIN" },
        },
      ];

      mockXpAvulsoService.findGrantsByAttendantWithSort.mockResolvedValue(
        mockGrants as any,
      );

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-1?sortBy=points&sortOrder=asc",
      );

      const response = await GET(request, { params: { id: "att-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(
        mockXpAvulsoService.findGrantsByAttendantWithSort,
      ).toHaveBeenCalledWith("att-1", "points", "asc");
    });

    it("deve retornar erro para parâmetros de ordenação inválidos", async () => {
      // Mock da autenticação
      mockAuthMiddleware.checkAuth.mockResolvedValue({
        authorized: true,
        session: {
          user: {
            id: "user-1",
            email: "supervisor@test.com",
            name: "Supervisor Test",
            role: "SUPERVISOR",
          },
        },
      });

      const request = new NextRequest(
        "http://localhost/api/gamification/xp-grants/attendant/att-1?sortBy=invalid&sortOrder=wrong",
      );

      const response = await GET(request, { params: { id: "att-1" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("Parâmetro sortBy inválido");
    });
  });
});
