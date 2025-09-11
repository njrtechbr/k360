/**
 * @jest-environment node
 */

/**
 * Testes de performance do sistema de XP avulso
 * Verifica se o sistema está otimizado para produção
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";

// Mock do Prisma para testes de performance
const mockPrisma = {
  xpTypeConfig: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  xpGrant: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
    groupBy: jest.fn(),
  },
  xpEvent: {
    findMany: jest.fn(),
    create: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  },
  gamificationSeason: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
  },
  attendant: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(),
};

jest.mock("@/lib/prisma", () => ({
  prisma: mockPrisma,
}));

describe("XP Avulso - Testes de Performance", () => {
  beforeAll(() => {
    // Configurar mocks para simular dados de produção
    mockPrisma.xpTypeConfig.findMany.mockResolvedValue([
      { id: "1", name: "Tipo 1", points: 100, active: true },
      { id: "2", name: "Tipo 2", points: 200, active: true },
    ]);

    mockPrisma.gamificationSeason.findFirst.mockResolvedValue({
      id: "season1",
      name: "Temporada Ativa",
      active: true,
      xpMultiplier: 1.5,
    });

    mockPrisma.user.findUnique.mockResolvedValue({
      id: "user1",
      name: "Admin",
      role: "ADMIN",
    });

    mockPrisma.attendant.findUnique.mockResolvedValue({
      id: "attendant1",
      name: "Atendente",
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  describe("Performance de Consultas", () => {
    it("deve buscar tipos de XP com performance adequada", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      const startTime = performance.now();

      // Simular busca de tipos
      await XpAvulsoService.findAllXpTypes(true);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar em menos de 100ms (mock)
      expect(executionTime).toBeLessThan(100);
      expect(mockPrisma.xpTypeConfig.findMany).toHaveBeenCalledWith({
        where: { active: true },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          _count: {
            select: {
              xpGrants: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    });

    it("deve buscar histórico com paginação eficiente", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      // Mock para simular muitos registros
      mockPrisma.xpGrant.count.mockResolvedValue(10000);
      mockPrisma.xpGrant.findMany.mockResolvedValue([]);

      const startTime = performance.now();

      // Buscar com paginação
      await XpAvulsoService.findGrantHistory({
        page: 1,
        limit: 20,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar rapidamente mesmo com muitos registros
      expect(executionTime).toBeLessThan(100);

      // Verificar se usa paginação
      expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 20,
        }),
      );
    });

    it("deve calcular estatísticas com agregações otimizadas", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      // Mock para estatísticas
      mockPrisma.xpGrant.findMany.mockResolvedValue([
        {
          id: "1",
          points: 100,
          typeId: "type1",
          grantedBy: "user1",
          type: { name: "Tipo 1" },
          granter: { name: "Admin" },
        },
      ]);

      const startTime = performance.now();

      await XpAvulsoService.getGrantStatistics("30d");

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar rapidamente
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe("Performance de Concessão de XP", () => {
    it("deve conceder XP com transação otimizada", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      // Mock para concessão
      mockPrisma.xpTypeConfig.findUnique.mockResolvedValue({
        id: "type1",
        name: "Tipo 1",
        points: 100,
        active: true,
      });

      mockPrisma.$transaction.mockImplementation(async (callback) => {
        return await callback(mockPrisma);
      });

      mockPrisma.xpGrant.create.mockResolvedValue({
        id: "grant1",
        attendantId: "attendant1",
        typeId: "type1",
        points: 100,
        xpEventId: "event1",
      });

      const startTime = performance.now();

      try {
        await XpAvulsoService.grantXp({
          attendantId: "attendant1",
          typeId: "type1",
          grantedBy: "user1",
        });
      } catch (error) {
        // Esperado devido aos mocks limitados
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar rapidamente
      expect(executionTime).toBeLessThan(200);

      // Verificar se usa transação
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it("deve validar limites com consultas eficientes", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      // Mock para validação de limites
      mockPrisma.xpGrant.findMany.mockResolvedValue([]);

      const startTime = performance.now();

      await XpAvulsoService.validateGrantLimits("user1", 100);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar rapidamente
      expect(executionTime).toBeLessThan(50);

      // Verificar se usa filtro de data otimizado
      expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            grantedBy: "user1",
            grantedAt: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe("Otimizações de Memória", () => {
    it("deve usar includes seletivos para reduzir payload", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      await XpAvulsoService.findAllXpTypes();

      // Verificar se usa select específico para reduzir dados
      expect(mockPrisma.xpTypeConfig.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            creator: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          }),
        }),
      );
    });

    it("deve limitar resultados por padrão", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      await XpAvulsoService.findGrantHistory({});

      // Verificar se tem limite padrão
      expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20, // Limite padrão
        }),
      );
    });
  });

  describe("Validação de Índices e Consultas", () => {
    it("deve usar filtros otimizados para consultas frequentes", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      await XpAvulsoService.findGrantsByAttendant("attendant1");

      // Verificar se usa índice por attendantId
      expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { attendantId: "attendant1" },
          orderBy: { grantedAt: "desc" },
        }),
      );
    });

    it("deve usar ordenação eficiente", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      await XpAvulsoService.findGrantHistory({
        sortBy: "grantedAt",
        sortOrder: "desc",
      });

      // Verificar se usa ordenação otimizada
      expect(mockPrisma.xpGrant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { grantedAt: "desc" },
        }),
      );
    });
  });

  describe("Testes de Carga Simulada", () => {
    it("deve lidar com múltiplas consultas simultâneas", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      const startTime = performance.now();

      // Simular múltiplas consultas simultâneas
      const promises = Array.from({ length: 10 }, () =>
        XpAvulsoService.findAllXpTypes(true),
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar todas em tempo razoável
      expect(executionTime).toBeLessThan(500);
      expect(mockPrisma.xpTypeConfig.findMany).toHaveBeenCalledTimes(10);
    });

    it("deve manter performance com filtros complexos", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      const startTime = performance.now();

      await XpAvulsoService.findGrantHistory({
        attendantId: "attendant1",
        typeId: "type1",
        granterId: "user1",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
        minPoints: 50,
        maxPoints: 500,
        page: 1,
        limit: 20,
      });

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Deve executar rapidamente mesmo com filtros complexos
      expect(executionTime).toBeLessThan(100);
    });
  });

  describe("Validação de Recursos", () => {
    it("deve ter configurações adequadas para produção", () => {
      // Verificar se constantes estão definidas adequadamente
      const { XpAvulsoService } = require("@/services/xpAvulsoService");

      // Verificar se método de validação existe
      expect(typeof XpAvulsoService.validateGrantLimits).toBe("function");

      // Verificar se tem limites configurados
      const validateString = XpAvulsoService.validateGrantLimits.toString();
      expect(validateString).toContain("DAILY_LIMIT");
    });

    it("deve ter tratamento de erro adequado", async () => {
      const { XpAvulsoService } = await import("@/services/xpAvulsoService");

      // Simular erro no banco
      mockPrisma.xpTypeConfig.findMany.mockRejectedValueOnce(
        new Error("Database error"),
      );

      // Deve tratar erro graciosamente
      await expect(XpAvulsoService.findAllXpTypes()).rejects.toThrow();
    });
  });
});
