/**
 * Integration tests for Dashboard Realtime API endpoint
 */

import { NextRequest } from "next/server";
import { GET } from "../realtime/route";

// Mock NextAuth
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    evaluation: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    attendant: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    xpEvent: {
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    unlockedAchievement: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("/api/dashboard/realtime", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return realtime metrics for authenticated user", async () => {
      // Mock authentication
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      // Mock database responses for gamification metrics
      prisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 125000 },
      });
      prisma.attendant.count.mockResolvedValue(42);
      prisma.attendant.findMany.mockResolvedValue([
        { id: "1", name: "João Silva", totalXp: 5000, level: 5 },
      ]);
      prisma.unlockedAchievement.findMany.mockResolvedValue([
        {
          id: "1",
          attendantId: "1",
          achievementId: "expert",
          unlockedAt: new Date(),
          attendant: { name: "João Silva" },
          achievement: { title: "Expert", description: "Especialista" },
        },
      ]);
      prisma.xpEvent.findMany.mockResolvedValue([
        { createdAt: new Date(), points: 100 },
      ]);

      // Mock database responses for satisfaction metrics
      prisma.evaluation.aggregate.mockResolvedValue({
        _avg: { rating: 4.2 },
      });
      prisma.evaluation.count
        .mockResolvedValueOnce(1500) // total
        .mockResolvedValueOnce(25) // last24h
        .mockResolvedValueOnce(180); // last7d

      prisma.evaluation.findMany.mockResolvedValue([
        { rating: 1, count: 10 },
        { rating: 2, count: 20 },
        { rating: 3, count: 50 },
        { rating: 4, count: 150 },
        { rating: 5, count: 170 },
      ]);

      const request = new NextRequest(
        "http://localhost:3000/api/dashboard/realtime",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty("gamification");
      expect(data.data).toHaveProperty("satisfaction");
      expect(data.data).toHaveProperty("alerts");
      expect(data.data).toHaveProperty("lastUpdated");
      expect(data.data.gamification).toHaveProperty("totalXp");
      expect(data.data.gamification).toHaveProperty("activeUsers");
      expect(data.data.satisfaction).toHaveProperty("averageRating");
    });

    it("should handle query parameters correctly", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      // Mock minimal responses
      prisma.xpEvent.aggregate.mockResolvedValue({ _sum: { points: 0 } });
      prisma.attendant.count.mockResolvedValue(0);
      prisma.attendant.findMany.mockResolvedValue([]);
      prisma.unlockedAchievement.findMany.mockResolvedValue([]);
      prisma.xpEvent.findMany.mockResolvedValue([]);
      prisma.evaluation.aggregate.mockResolvedValue({ _avg: { rating: 0 } });
      prisma.evaluation.count.mockResolvedValue(0);
      prisma.evaluation.findMany.mockResolvedValue([]);

      const request = new NextRequest(
        "http://localhost:3000/api/dashboard/realtime?satisfactionPeriod=24h",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("should return 401 for unauthenticated user", async () => {
      getServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/dashboard/realtime",
      );
      const response = await GET(request);
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
        "http://localhost:3000/api/dashboard/realtime",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Acesso negado");
    });

    it("should handle database errors gracefully", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.xpEvent.aggregate.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/dashboard/realtime",
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Erro interno do servidor");
    });
  });
});
