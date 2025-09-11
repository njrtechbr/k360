import {
  XpAvulsoApiClient,
  CreateXpTypeData,
  UpdateXpTypeData,
  GrantXpData,
  GrantHistoryFilters,
} from "../xpAvulsoApiClient";
import { httpClient } from "@/lib/httpClient";
import { XpTypeConfig, XpGrant } from "@prisma/client";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("XpAvulsoApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Gerenciamento de Tipos de XP", () => {
    describe("createXpType", () => {
      it("deve criar tipo de XP com sucesso", async () => {
        const typeData: CreateXpTypeData = {
          name: "Excelência no Atendimento",
          description: "Reconhecimento por atendimento excepcional",
          points: 100,
          category: "quality",
          icon: "star",
          color: "#FFD700",
          createdBy: "user1",
        };

        const mockCreatedType: XpTypeConfig = {
          id: "1",
          ...typeData,
          active: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockCreatedType,
        });

        const result = await XpAvulsoApiClient.createXpType(typeData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/xp-types",
          typeData,
        );
        expect(result).toEqual(mockCreatedType);
      });

      it("deve validar dados obrigatórios", async () => {
        const invalidData = {
          name: "", // Nome vazio
          description: "Descrição",
          points: 100,
          category: "general",
          icon: "star",
          color: "#3B82F6",
          createdBy: "user1",
        } as CreateXpTypeData;

        await expect(
          XpAvulsoApiClient.createXpType(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it("deve validar pontos positivos", async () => {
        const invalidData = {
          name: "Tipo Teste",
          description: "Descrição",
          points: 0, // Pontos inválidos
          category: "general",
          icon: "star",
          color: "#3B82F6",
          createdBy: "user1",
        } as CreateXpTypeData;

        await expect(
          XpAvulsoApiClient.createXpType(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("updateXpType", () => {
      it("deve atualizar tipo de XP com sucesso", async () => {
        const updateData: UpdateXpTypeData = {
          name: "Tipo Atualizado",
          points: 150,
        };

        const mockUpdatedType: XpTypeConfig = {
          id: "1",
          name: "Tipo Atualizado",
          description: "Descrição original",
          points: 150,
          category: "general",
          icon: "star",
          color: "#3B82F6",
          active: true,
          createdBy: "user1",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.put.mockResolvedValue({
          success: true,
          data: mockUpdatedType,
        });

        const result = await XpAvulsoApiClient.updateXpType("1", updateData);

        expect(mockHttpClient.put).toHaveBeenCalledWith(
          "/api/gamification/xp-types/1",
          updateData,
        );
        expect(result).toEqual(mockUpdatedType);
      });

      it("deve validar dados de atualização", async () => {
        const invalidData = {
          points: -10, // Pontos negativos
        } as UpdateXpTypeData;

        await expect(
          XpAvulsoApiClient.updateXpType("1", invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.put).not.toHaveBeenCalled();
      });
    });

    describe("findAllXpTypes", () => {
      it("deve buscar todos os tipos de XP", async () => {
        const mockTypes = [
          {
            id: "1",
            name: "Tipo 1",
            description: "Descrição 1",
            points: 100,
            category: "general",
            icon: "star",
            color: "#3B82F6",
            active: true,
            createdBy: "user1",
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { xpGrants: 5 },
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockTypes },
        });

        const result = await XpAvulsoApiClient.findAllXpTypes();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-types?",
        );
        expect(result).toEqual(mockTypes);
      });

      it("deve buscar apenas tipos ativos quando solicitado", async () => {
        const mockTypes = [
          {
            id: "1",
            name: "Tipo Ativo",
            description: "Descrição",
            points: 100,
            category: "general",
            icon: "star",
            color: "#3B82F6",
            active: true,
            createdBy: "user1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockTypes },
        });

        const result = await XpAvulsoApiClient.findAllXpTypes(true);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-types?activeOnly=true",
        );
        expect(result).toEqual(mockTypes);
      });

      it("deve tratar erro ao buscar tipos", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(XpAvulsoApiClient.findAllXpTypes()).rejects.toThrow(
          "Falha ao buscar tipos de XP",
        );
      });
    });

    describe("toggleXpTypeStatus", () => {
      it("deve alternar status do tipo de XP", async () => {
        const mockType: XpTypeConfig = {
          id: "1",
          name: "Tipo Teste",
          description: "Descrição",
          points: 100,
          category: "general",
          icon: "star",
          color: "#3B82F6",
          active: false, // Status alterado
          createdBy: "user1",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.patch.mockResolvedValue({
          success: true,
          data: mockType,
        });

        const result = await XpAvulsoApiClient.toggleXpTypeStatus("1");

        expect(mockHttpClient.patch).toHaveBeenCalledWith(
          "/api/gamification/xp-types/1/toggle",
          {},
        );
        expect(result).toEqual(mockType);
      });
    });
  });

  describe("Concessão de XP", () => {
    describe("grantXp", () => {
      it("deve conceder XP com sucesso", async () => {
        const grantData: GrantXpData = {
          attendantId: "att1",
          typeId: "type1",
          justification: "Excelente atendimento ao cliente",
          grantedBy: "admin1",
        };

        const mockGrant = {
          id: "1",
          attendantId: "att1",
          typeId: "type1",
          points: 100,
          justification: "Excelente atendimento ao cliente",
          grantedBy: "admin1",
          grantedAt: new Date(),
          xpEventId: "event1",
          createdAt: new Date(),
          updatedAt: new Date(),
          attendant: {
            id: "att1",
            name: "João Silva",
            email: "joao@example.com",
          },
          type: {
            id: "type1",
            name: "Excelência",
            points: 100,
          },
          granter: {
            id: "admin1",
            name: "Admin User",
            email: "admin@example.com",
            role: "ADMIN",
          },
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { data: mockGrant },
        });

        const result = await XpAvulsoApiClient.grantXp(grantData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/xp-grants",
          grantData,
        );
        expect(result).toEqual(mockGrant);
      });

      it("deve validar dados de concessão", async () => {
        const invalidData = {
          attendantId: "", // ID vazio
          typeId: "type1",
          grantedBy: "admin1",
        } as GrantXpData;

        await expect(XpAvulsoApiClient.grantXp(invalidData)).rejects.toThrow(
          "Dados inválidos",
        );

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("findGrantHistory", () => {
      it("deve buscar histórico de concessões com filtros", async () => {
        const filters: GrantHistoryFilters = {
          attendantId: "att1",
          page: 1,
          limit: 20,
          sortBy: "grantedAt",
          sortOrder: "desc",
        };

        const mockHistory = {
          grants: [
            {
              id: "1",
              attendantId: "att1",
              typeId: "type1",
              points: 100,
              justification: "Teste",
              grantedBy: "admin1",
              grantedAt: new Date(),
              attendant: { id: "att1", name: "João" },
              type: { id: "type1", name: "Excelência" },
              granter: { id: "admin1", name: "Admin" },
            },
          ],
          total: 1,
          page: 1,
          totalPages: 1,
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { data: mockHistory },
        });

        const result = await XpAvulsoApiClient.findGrantHistory(filters);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          expect.stringContaining("/api/gamification/xp-grants?"),
        );
        expect(result).toEqual(mockHistory);
      });

      it("deve validar filtros de histórico", async () => {
        const invalidFilters = {
          page: 0, // Página inválida
        } as GrantHistoryFilters;

        await expect(
          XpAvulsoApiClient.findGrantHistory(invalidFilters),
        ).rejects.toThrow("Filtros inválidos");

        expect(mockHttpClient.get).not.toHaveBeenCalled();
      });

      it("deve tratar erro ao buscar histórico", async () => {
        const filters: GrantHistoryFilters = {
          page: 1,
          limit: 20,
          sortBy: "grantedAt",
          sortOrder: "desc",
        };

        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(
          XpAvulsoApiClient.findGrantHistory(filters),
        ).rejects.toThrow("Falha ao buscar histórico de concessões");
      });
    });

    describe("findGrantsByAttendant", () => {
      it("deve buscar concessões de um atendente", async () => {
        const mockGrants = [
          {
            id: "1",
            attendantId: "att1",
            typeId: "type1",
            points: 100,
            justification: "Teste",
            grantedBy: "admin1",
            grantedAt: new Date(),
            attendant: { id: "att1", name: "João" },
            type: { id: "type1", name: "Excelência" },
            granter: { id: "admin1", name: "Admin" },
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockGrants,
        });

        const result = await XpAvulsoApiClient.findGrantsByAttendant("att1");

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/attendant/att1",
        );
        expect(result).toEqual(mockGrants);
      });
    });

    describe("findGrantsByAttendantWithSort", () => {
      it("deve buscar concessões com ordenação customizada", async () => {
        const mockGrants = [
          {
            id: "1",
            attendantId: "att1",
            typeId: "type1",
            points: 100,
            justification: "Teste",
            grantedBy: "admin1",
            grantedAt: new Date(),
            attendant: { id: "att1", name: "João" },
            type: { id: "type1", name: "Excelência" },
            granter: { id: "admin1", name: "Admin" },
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockGrants,
        });

        const result = await XpAvulsoApiClient.findGrantsByAttendantWithSort(
          "att1",
          "points",
          "asc",
        );

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/attendant/att1?sortBy=points&sortOrder=asc",
        );
        expect(result).toEqual(mockGrants);
      });
    });

    describe("deleteGrant", () => {
      it("deve deletar concessão com sucesso", async () => {
        const mockDeletedGrant: XpGrant = {
          id: "1",
          attendantId: "att1",
          typeId: "type1",
          points: 100,
          justification: "Teste",
          grantedBy: "admin1",
          grantedAt: new Date(),
          xpEventId: "event1",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: { data: mockDeletedGrant },
        });

        const result = await XpAvulsoApiClient.deleteGrant("1");

        expect(mockHttpClient.delete).toHaveBeenCalledWith(
          "/api/gamification/xp-grants",
          { grantId: "1" },
        );
        expect(result).toEqual(mockDeletedGrant);
      });
    });
  });

  describe("Validações e Limites", () => {
    describe("validateGrantLimits", () => {
      it("deve validar limites de concessão", async () => {
        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: {},
        });

        await XpAvulsoApiClient.validateGrantLimits("admin1", 100);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/validate-limits",
          {
            granterId: "admin1",
            points: 100,
          },
        );
      });

      it("deve tratar erro de validação de limites", async () => {
        mockHttpClient.post.mockRejectedValue(new Error("Limite excedido"));

        await expect(
          XpAvulsoApiClient.validateGrantLimits("admin1", 1000),
        ).rejects.toThrow("Limite excedido");
      });
    });

    describe("checkAchievementsUnlocked", () => {
      it("deve verificar conquistas desbloqueadas", async () => {
        const mockAchievements = [
          {
            id: "ach1",
            title: "Primeira Conquista",
            description: "Primeira conquista desbloqueada",
          },
        ];

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockAchievements,
        });

        const result = await XpAvulsoApiClient.checkAchievementsUnlocked(
          "att1",
          50,
          150,
        );

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/check-achievements",
          {
            attendantId: "att1",
            previousXp: 50,
            newXp: 150,
          },
        );
        expect(result).toEqual(mockAchievements);
      });

      it("deve retornar array vazio em caso de erro", async () => {
        mockHttpClient.post.mockRejectedValue(new Error("Network error"));

        const result = await XpAvulsoApiClient.checkAchievementsUnlocked(
          "att1",
          50,
          150,
        );

        expect(result).toEqual([]);
      });
    });
  });

  describe("Estatísticas", () => {
    describe("getGrantStatistics", () => {
      it("deve obter estatísticas de concessões", async () => {
        const mockStats = {
          totalGrants: 100,
          totalPoints: 5000,
          averagePoints: 50,
          grantsByType: [
            {
              typeId: "type1",
              typeName: "Excelência",
              count: 50,
              totalPoints: 2500,
            },
          ],
          grantsByGranter: [
            {
              granterId: "admin1",
              granterName: "Admin User",
              count: 30,
              totalPoints: 1500,
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await XpAvulsoApiClient.getGrantStatistics(
          "30d",
          "admin1",
        );

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/statistics?period=30d&userId=admin1",
        );
        expect(result).toEqual(mockStats);
      });

      it("deve usar período padrão quando não especificado", async () => {
        const mockStats = {
          totalGrants: 100,
          totalPoints: 5000,
          averagePoints: 50,
          grantsByType: [],
          grantsByGranter: [],
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockStats,
        });

        const result = await XpAvulsoApiClient.getGrantStatistics();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/statistics?period=30d",
        );
        expect(result).toEqual(mockStats);
      });
    });

    describe("getDailyStats", () => {
      it("deve obter estatísticas diárias", async () => {
        const mockDailyStats = {
          totalGrants: 10,
          totalPoints: 500,
          grantsByUser: [
            {
              userId: "admin1",
              userName: "Admin User",
              grants: 5,
              points: 250,
            },
          ],
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockDailyStats,
        });

        const testDate = new Date("2024-01-15");
        const result = await XpAvulsoApiClient.getDailyStats(testDate);

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/daily-stats?date=2024-01-15",
        );
        expect(result).toEqual(mockDailyStats);
      });

      it("deve buscar estatísticas do dia atual quando data não especificada", async () => {
        const mockDailyStats = {
          totalGrants: 5,
          totalPoints: 250,
          grantsByUser: [],
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockDailyStats,
        });

        const result = await XpAvulsoApiClient.getDailyStats();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-grants/daily-stats?",
        );
        expect(result).toEqual(mockDailyStats);
      });
    });
  });

  describe("Configurações", () => {
    describe("getXpAvulsoConfig", () => {
      it("deve buscar configurações de XP Avulso", async () => {
        const mockConfig = {
          dailyLimitPoints: 1000,
          dailyLimitGrants: 50,
          maxPointsPerGrant: 200,
          allowedRoles: ["ADMIN", "SUPERADMIN"],
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockConfig,
        });

        const result = await XpAvulsoApiClient.getXpAvulsoConfig();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-avulso-config",
        );
        expect(result).toEqual(mockConfig);
      });
    });

    describe("updateXpAvulsoConfig", () => {
      it("deve atualizar configurações de XP Avulso", async () => {
        const configUpdate = {
          dailyLimitPoints: 1500,
          maxPointsPerGrant: 300,
        };

        mockHttpClient.put.mockResolvedValue({
          success: true,
          data: {},
        });

        await XpAvulsoApiClient.updateXpAvulsoConfig(configUpdate);

        expect(mockHttpClient.put).toHaveBeenCalledWith(
          "/api/gamification/xp-avulso-config",
          configUpdate,
        );
      });
    });

    describe("validateGrant", () => {
      it("deve validar concessão contra configurações", async () => {
        const mockValidation = {
          isValid: true,
          errors: [],
          warnings: ["Próximo do limite diário"],
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockValidation,
        });

        const result = await XpAvulsoApiClient.validateGrant(
          100,
          "admin1",
          "att1",
        );

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/xp-avulso-config/validate",
          {
            points: 100,
            granterId: "admin1",
            attendantId: "att1",
          },
        );
        expect(result).toEqual(mockValidation);
      });

      it("deve retornar validação com erros quando inválida", async () => {
        const mockValidation = {
          isValid: false,
          errors: ["Limite diário excedido"],
          warnings: [],
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockValidation,
        });

        const result = await XpAvulsoApiClient.validateGrant(
          2000,
          "admin1",
          "att1",
        );

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain("Limite diário excedido");
      });
    });
  });
});
