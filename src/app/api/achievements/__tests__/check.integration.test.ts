/**
 * Integration tests for Achievements Check API endpoint
 */

import { NextRequest } from "next/server";
import { POST } from "../check/route";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    attendant: {
      findUnique: jest.fn(),
    },
    achievementConfig: {
      findUnique: jest.fn(),
    },
    gamificationSeason: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    unlockedAchievement: {
      findFirst: jest.fn(),
    },
    evaluation: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    xpEvent: {
      aggregate: jest.fn(),
    },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("/api/achievements/check", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("should check achievement criteria successfully", async () => {
      // Mock authentication
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      // Mock attendant
      prisma.attendant.findUnique.mockResolvedValue({
        id: "att-1",
        name: "João Silva",
        user: { id: "user-1" },
      });

      // Mock achievement
      prisma.achievementConfig.findUnique.mockResolvedValue({
        id: "expert-evaluator",
        title: "Avaliador Expert",
        description: "Recebeu 100 avaliações",
        criteria: { evaluationCount: 100 },
        xpReward: 500,
        active: true,
      });

      // Mock active season
      prisma.gamificationSeason.findFirst.mockResolvedValue({
        id: "season-1",
        name: "Q1 2024",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      });

      // Mock existing unlock check
      prisma.unlockedAchievement.findFirst.mockResolvedValue(null);

      // Mock evaluation data
      prisma.evaluation.count.mockResolvedValue(150);
      prisma.evaluation.aggregate.mockResolvedValue({
        _avg: { rating: 4.5 },
      });
      prisma.evaluation.findMany.mockResolvedValue([
        { rating: 5, createdAt: new Date() },
        { rating: 5, createdAt: new Date() },
        { rating: 5, createdAt: new Date() },
      ]);
      prisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 2000 },
      });

      const requestBody = {
        attendantId: "att-1",
        achievementId: "expert-evaluator",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("attendantId", "att-1");
      expect(data.data).toHaveProperty("achievementId", "expert-evaluator");
      expect(data.data).toHaveProperty("seasonId", "season-1");
      expect(data.data).toHaveProperty("meetsRequirements");
      expect(data.data).toHaveProperty("isAlreadyUnlocked", false);
      expect(data.data).toHaveProperty("progress");
      expect(data.data).toHaveProperty("details");
      expect(data.data.meetsRequirements).toBe(true);
    });

    it("should return false when criteria not met", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.attendant.findUnique.mockResolvedValue({
        id: "att-1",
        name: "João Silva",
        user: { id: "user-1" },
      });

      prisma.achievementConfig.findUnique.mockResolvedValue({
        id: "expert-evaluator",
        title: "Avaliador Expert",
        description: "Recebeu 100 avaliações",
        criteria: { evaluationCount: 100 },
        xpReward: 500,
        active: true,
      });

      prisma.gamificationSeason.findFirst.mockResolvedValue({
        id: "season-1",
        name: "Q1 2024",
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-03-31"),
      });

      prisma.unlockedAchievement.findFirst.mockResolvedValue(null);

      // Mock insufficient evaluation data
      prisma.evaluation.count.mockResolvedValue(50); // Less than required 100
      prisma.evaluation.aggregate.mockResolvedValue({
        _avg: { rating: 4.0 },
      });
      prisma.evaluation.findMany.mockResolvedValue([]);
      prisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 1000 },
      });

      const requestBody = {
        attendantId: "att-1",
        achievementId: "expert-evaluator",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.meetsRequirements).toBe(false);
      expect(data.data.progress).toBe(50); // 50% progress
    });

    it("should return 400 for invalid request body", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      const requestBody = {
        attendantId: "", // Invalid empty ID
        achievementId: "expert-evaluator",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Dados inválidos");
    });

    it("should return 404 for non-existent attendant", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.attendant.findUnique.mockResolvedValue(null);

      const requestBody = {
        attendantId: "att-nonexistent",
        achievementId: "expert-evaluator",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Atendente não encontrado");
    });

    it("should return 404 for non-existent achievement", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.attendant.findUnique.mockResolvedValue({
        id: "att-1",
        name: "João Silva",
        user: { id: "user-1" },
      });

      prisma.achievementConfig.findUnique.mockResolvedValue(null);

      const requestBody = {
        attendantId: "att-1",
        achievementId: "nonexistent-achievement",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Conquista não encontrada");
    });

    it("should return 401 for unauthenticated user", async () => {
      getServerSession.mockResolvedValue(null);

      const requestBody = {
        attendantId: "att-1",
        achievementId: "expert-evaluator",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        },
      );
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Não autorizado");
    });

    it("should handle database errors gracefully", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.attendant.findUnique.mockRejectedValue(
        new Error("Database error"),
      );

      const requestBody = {
        attendantId: "att-1",
        achievementId: "expert-evaluator",
      };

      const request = new NextRequest(
        "http://localhost:3000/api/achievements/check",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
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
