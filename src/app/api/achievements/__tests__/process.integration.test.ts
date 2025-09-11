/**
 * Integration tests for Achievements Process API endpoint
 */

import { NextRequest } from "next/server";
import { POST } from "../process/route";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    attendant: {
      findMany: jest.fn(),
    },
    achievementConfig: {
      findMany: jest.fn(),
    },
    unlockedAchievement: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    evaluation: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    xpEvent: {
      aggregate: jest.fn(),
      create: jest.fn(),
    },
    gamificationSeason: {
      findFirst: jest.fn(),
    },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("/api/achievements/process", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should process achievements for all attendants", async () => {
      // Mock authentication
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      // Mock active season
      prisma.gamificationSeason.findFirst.mockResolvedValue({
        id: "season-1",
        name: "Q1 2024",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      });

      // Mock attendants
      prisma.attendant.findMany.mockResolvedValue([
        { id: "att-1", name: "João Silva", user: { id: "user-1" } },
        { id: "att-2", name: "Maria Santos", user: { id: "user-2" } },
      ]);

      // Mock achievements
      prisma.achievementConfig.findMany.mockResolvedValue([
        {
          id: "first-eval",
          title: "Primeira Avaliação",
          description: "Recebeu primeira avaliação",
          criteria: { evaluationCount: 1 },
          xpReward: 100,
          active: true,
        },
      ]);

      // Mock existing unlocked achievements
      prisma.unlockedAchievement.findMany.mockResolvedValue([]);

      // Mock evaluation data for criteria checking
      prisma.evaluation.count.mockResolvedValue(5);
      prisma.evaluation.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
      });
      prisma.evaluation.findMany.mockResolvedValue([
        { rating: 5, createdAt: new Date() },
      ]);
      prisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 1000 },
      });

      // Mock achievement creation
      prisma.unlockedAchievement.create.mockResolvedValue({
        id: "unlock-1",
        attendantId: "att-1",
        achievementId: "first-eval",
        seasonId: "season-1",
        unlockedAt: new Date(),
        xpGained: 100,
      });

      // Mock XP event creation
      prisma.xpEvent.create.mockResolvedValue({
        id: "xp-1",
        attendantId: "att-1",
        points: 100,
        source: "ACHIEVEMENT",
        description: "Achievement: Primeira Avaliação",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/process",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("attendantsProcessed");
      expect(data.data).toHaveProperty("achievementsUnlocked");
      expect(data.data).toHaveProperty("xpAwarded");
      expect(data.data).toHaveProperty("errors");
      expect(Array.isArray(data.data.errors)).toBe(true);
    });

    it("should return 401 for unauthenticated user", async () => {
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/process",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return 403 for unauthorized role", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "USUARIO" },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/process",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Acesso negado");
    });

    it("should return 400 when no active season found", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.gamificationSeason.findFirst.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/process",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Nenhuma temporada ativa encontrada");
    });

    it("should handle database errors gracefully", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.gamificationSeason.findFirst.mockRejectedValue(
        new Error("Database error"),
      );

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/process",
        {
          method: "POST",
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Erro interno do servidor");
    });
  });
});
