/**
 * @jest-environment node
 */
import {
  XpAvulsoService,
  GrantXpSchema,
  GrantHistoryFiltersSchema,
  CreateXpTypeSchema,
  UpdateXpTypeSchema,
  type CreateXpTypeData,
  type UpdateXpTypeData,
  type GrantXpData,
  type GrantHistoryFilters,
} from "../xpAvulsoService";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Helper function to create HttpClientError for tests
function createHttpClientError(message: string, status: number) {
  const error = Object.create(HttpClientError.prototype);
  error.message = message;
  error.status = status;
  error.name = "HttpClientError";
  return error;
}

describe("XpAvulsoService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Schemas", () => {
    describe("CreateXpTypeSchema", () => {
      it("deve validar dados válidos", () => {
        const validData = {
          name: "Excelência no Atendimento",
          description: "Reconhecimento por atendimento excepcional",
          points: 100,
          category: "atendimento",
          icon: "star",
          color: "#FFD700",
          createdBy: "user-123",
        };

        const result = CreateXpTypeSchema.safeParse(validData);
        expect(result.success).toBe(true);
      });

      it("deve rejeitar pontos negativos", () => {
        const invalidData = {
          name: "Teste",
          description: "Teste",
          points: -10,
          createdBy: "user-123",
        };

        const result = CreateXpTypeSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });

      it("deve aplicar valores padrão", () => {
        const data = {
          name: "Teste",
          description: "Teste",
          points: 50,
          createdBy: "user-123",
        };

        const result = CreateXpTypeSchema.safeParse(data);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.category).toBe("general");
          expect(result.data.icon).toBe("star");
          expect(result.data.color).toBe("#3B82F6");
        }
      });
    });

    describe("GrantXpSchema", () => {
      it("deve validar dados válidos", () => {
        const validData = {
          attendantId: "att-123",
          typeId: "type-123",
          grantedBy: "user-123",
          justification: "Excelente trabalho",
        };

        const result = GrantXpSchema.safeParse(validData);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.attendantId).toBe("att-123");
          expect(result.data.typeId).toBe("type-123");
          expect(result.data.grantedBy).toBe("user-123");
        }
      });

      it("deve rejeitar dados inválidos", () => {
        const invalidData = {
          attendantId: "",
          typeId: "type-123",
          grantedBy: "user-123",
        };

        const result = GrantXpSchema.safeParse(invalidData);
        expect(result.success).toBe(false);
      });
    });
  });

  // === TESTES DE GERENCIAMENTO DE TIPOS DE XP ===

  describe("createXpType", () => {
    it("deve criar tipo de XP com sucesso", async () => {
      const mockXpType = {
        id: "type-123",
        name: "Excelência",
        description: "Reconhecimento por excelência",
        points: 100,
        category: "atendimento",
        icon: "star",
        color: "#FFD700",
        active: true,
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockXpType,
      });

      const data: CreateXpTypeData = {
        name: "Excelência",
        description: "Reconhecimento por excelência",
        points: 100,
        category: "atendimento",
        icon: "star",
        color: "#FFD700",
        createdBy: "user-123",
      };

      const result = await XpAvulsoService.createXpType(data);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/gamification/xp-types",
        data,
      );
      expect(result).toEqual(mockXpType);
    });

    it("deve tratar erro de nome duplicado", async () => {
      const error = Object.create(HttpClientError.prototype);
      error.message = "Nome já existe";
      error.status = 409;
      error.name = "HttpClientError";

      mockHttpClient.post.mockRejectedValue(error);

      const data: CreateXpTypeData = {
        name: "Excelência",
        description: "Teste",
        points: 100,
        createdBy: "user-123",
      };

      await expect(XpAvulsoService.createXpType(data)).rejects.toThrow(
        "Nome já existe",
      );
    });
  });

  describe("updateXpType", () => {
    it("deve atualizar tipo de XP com sucesso", async () => {
      const mockUpdatedType = {
        id: "type-123",
        name: "Excelência Atualizada",
        description: "Descrição atualizada",
        points: 150,
        category: "atendimento",
        icon: "star",
        color: "#FFD700",
        active: true,
        createdBy: "user-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedType,
      });

      const updateData: UpdateXpTypeData = {
        name: "Excelência Atualizada",
        description: "Descrição atualizada",
        points: 150,
      };

      const result = await XpAvulsoService.updateXpType("type-123", updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/gamification/xp-types/type-123",
        updateData,
      );
      expect(result).toEqual(mockUpdatedType);
    });

    it("deve tratar erro de tipo inexistente", async () => {
      const error = createHttpClientError("Tipo não encontrado", 404);
      mockHttpClient.put.mockRejectedValue(error);

      await expect(
        XpAvulsoService.updateXpType("type-inexistente", { points: 100 }),
      ).rejects.toThrow("Tipo não encontrado");
    });
  });

  describe("findAllXpTypes", () => {
    it("deve buscar todos os tipos", async () => {
      const mockTypes = [
        {
          id: "type-1",
          name: "Tipo 1",
          description: "Descrição 1",
          points: 100,
          active: true,
        },
        {
          id: "type-2",
          name: "Tipo 2",
          description: "Descrição 2",
          points: 200,
          active: false,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockTypes,
      });

      const result = await XpAvulsoService.findAllXpTypes(false);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-types?",
      );
      expect(result).toEqual(mockTypes);
    });

    it("deve buscar apenas tipos ativos", async () => {
      const mockActiveTypes = [
        {
          id: "type-1",
          name: "Tipo 1",
          description: "Descrição 1",
          points: 100,
          active: true,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockActiveTypes,
      });

      const result = await XpAvulsoService.findAllXpTypes(true);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-types?activeOnly=true",
      );
      expect(result).toEqual(mockActiveTypes);
    });
  });

  describe("toggleXpTypeStatus", () => {
    it("deve alternar status com sucesso", async () => {
      const mockUpdatedType = {
        id: "type-123",
        name: "Tipo Teste",
        active: false,
        points: 100,
      };

      mockHttpClient.patch.mockResolvedValue({
        success: true,
        data: mockUpdatedType,
      });

      const result = await XpAvulsoService.toggleXpTypeStatus("type-123");

      expect(mockHttpClient.patch).toHaveBeenCalledWith(
        "/api/gamification/xp-types/type-123/toggle",
        {},
      );
      expect(result).toEqual(mockUpdatedType);
    });

    it("deve tratar erro de tipo inexistente", async () => {
      const error = createHttpClientError("Tipo não encontrado", 404);
      mockHttpClient.patch.mockRejectedValue(error);

      await expect(
        XpAvulsoService.toggleXpTypeStatus("type-inexistente"),
      ).rejects.toThrow("Tipo não encontrado");
    });
  });

  // === TESTES DE CONCESSÃO DE XP ===

  describe("grantXp", () => {
    it("deve conceder XP com sucesso", async () => {
      const mockGrant = {
        id: "grant-123",
        attendantId: "att-123",
        typeId: "type-123",
        points: 100,
        grantedBy: "user-123",
        justification: "Excelente trabalho",
        grantedAt: new Date(),
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockGrant,
      });

      const grantData: GrantXpData = {
        attendantId: "att-123",
        typeId: "type-123",
        grantedBy: "user-123",
        justification: "Excelente trabalho",
      };

      const result = await XpAvulsoService.grantXp(grantData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/gamification/xp-grants",
        grantData,
      );
      expect(result).toEqual(mockGrant);
    });

    it("deve tratar erro de atendente inexistente", async () => {
      const error = createHttpClientError("Atendente não encontrado", 404);
      mockHttpClient.post.mockRejectedValue(error);

      const grantData: GrantXpData = {
        attendantId: "att-inexistente",
        typeId: "type-123",
        grantedBy: "user-123",
        justification: "Teste",
      };

      await expect(XpAvulsoService.grantXp(grantData)).rejects.toThrow(
        "Atendente não encontrado",
      );
    });

    it("deve tratar erro de limite diário excedido", async () => {
      const error = createHttpClientError(
        "Limite diário de concessões excedido",
        429,
      );
      mockHttpClient.post.mockRejectedValue(error);

      const grantData: GrantXpData = {
        attendantId: "att-123",
        typeId: "type-123",
        grantedBy: "user-123",
        justification: "Teste",
      };

      await expect(XpAvulsoService.grantXp(grantData)).rejects.toThrow(
        "Limite diário de concessões excedido",
      );
    });
  });

  // === TESTES DE HISTÓRICO E CONSULTAS ===

  describe("findGrantHistory", () => {
    it("deve buscar histórico com filtros", async () => {
      const mockResponse = {
        grants: [
          {
            id: "grant-1",
            attendantId: "att-123",
            points: 100,
            grantedAt: new Date(),
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const filters: GrantHistoryFilters = {
        attendantId: "att-123",
        page: 1,
        limit: 10,
      };

      const result = await XpAvulsoService.findGrantHistory(filters);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-grants?attendantId=att-123&page=1&limit=10&sortBy=grantedAt&sortOrder=desc",
      );
      expect(result).toEqual(mockResponse);
    });

    it("deve aplicar filtros de data corretamente", async () => {
      const mockResponse = {
        grants: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const filters: GrantHistoryFilters = {
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-01-31"),
        grantedBy: "user-123",
      };

      await XpAvulsoService.findGrantHistory(filters);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-grants?startDate=2024-01-01T00%3A00%3A00.000Z&endDate=2024-01-31T00%3A00%3A00.000Z&page=1&limit=20&sortBy=grantedAt&sortOrder=desc",
      );
    });
  });

  describe("findGrantsByAttendant", () => {
    it("deve buscar concessões por atendente", async () => {
      const mockGrants = [
        {
          id: "grant-1",
          attendantId: "att-123",
          points: 100,
          grantedAt: new Date(),
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockGrants,
      });

      const result = await XpAvulsoService.findGrantsByAttendant("att-123");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-grants/attendant/att-123",
      );
      expect(result).toEqual(mockGrants);
    });

    it("deve tratar erro de atendente inexistente", async () => {
      const error = createHttpClientError("Atendente não encontrado", 404);
      mockHttpClient.get.mockRejectedValue(error);

      await expect(
        XpAvulsoService.findGrantsByAttendant("att-inexistente"),
      ).rejects.toThrow("Atendente não encontrado");
    });
  });

  describe("getGrantStatistics", () => {
    it("deve buscar estatísticas gerais", async () => {
      const mockStats = {
        totalGrants: 150,
        totalPoints: 15000,
        averagePointsPerGrant: 100,
        topGranters: [{ userId: "user-1", name: "João", totalGrants: 50 }],
        topRecipients: [
          { attendantId: "att-1", name: "Maria", totalPoints: 1000 },
        ],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await XpAvulsoService.getGrantStatistics("30d");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-grants/statistics?period=30d",
      );
      expect(result).toEqual(mockStats);
    });

    it("deve filtrar por usuário quando especificado", async () => {
      const mockStats = {
        totalGrants: 25,
        totalPoints: 2500,
        averagePointsPerGrant: 100,
        topGranters: [],
        topRecipients: [],
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await XpAvulsoService.getGrantStatistics(
        "30d",
        "user-123",
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-grants/statistics?period=30d&userId=user-123",
      );
      expect(result).toEqual(mockStats);
    });
  });

  // === TESTES DE VALIDAÇÃO ===

  describe("validateGrantLimits", () => {
    it("deve passar quando dentro dos limites", async () => {
      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {},
      });

      await expect(
        XpAvulsoService.validateGrantLimits("user-123", 100),
      ).resolves.not.toThrow();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/gamification/xp-grants/validate-limits",
        {
          granterId: "user-123",
          points: 100,
        },
      );
    });

    it("deve rejeitar quando limite excedido", async () => {
      const error = createHttpClientError("Limite diário excedido", 429);
      mockHttpClient.post.mockRejectedValue(error);

      await expect(
        XpAvulsoService.validateGrantLimits("user-123", 100),
      ).rejects.toThrow("Limite diário excedido");
    });
  });

  // === TESTES DE TRATAMENTO DE ERROS ===

  describe("Error handling", () => {
    it("deve tratar HttpClientError corretamente", async () => {
      const error = Object.create(HttpClientError.prototype);
      error.message = "Erro específico";
      error.status = 400;
      error.name = "HttpClientError";

      mockHttpClient.get.mockRejectedValue(error);

      await expect(XpAvulsoService.findAllXpTypes()).rejects.toThrow(
        "Falha ao buscar tipos de XP",
      );
    });

    it("deve tratar erros genéricos", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Network error"));

      await expect(XpAvulsoService.findAllXpTypes()).rejects.toThrow(
        "Falha ao buscar tipos de XP",
      );
    });
  });
});
