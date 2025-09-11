/**
 * Integration tests for Dashboard Stats API endpoints
 */

import { GET } from "../stats/route";

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
    },
    attendant: {
      count: jest.fn(),
    },
    xpEvent: {
      aggregate: jest.fn(),
    },
    gamificationSeason: {
      count: jest.fn(),
    },
    unlockedAchievement: {
      count: jest.fn(),
    },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("/api/dashboard/stats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return dashboard stats for authenticated user", async () => {
      // Mock authentication
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      // Mock database responses
      prisma.evaluation.count.mockResolvedValue(1500);
      prisma.attendant.count.mockResolvedValue(45);
      prisma.evaluation.aggregate.mockResolvedValue({
        _avg: { nota: 4.2 },
      });
      prisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 125000 },
      });
      prisma.gamificationSeason.count.mockResolvedValue(2);
      prisma.unlockedAchievement.count.mockResolvedValue(89);

      const request = new Request("http://localhost:3000/api/dashboard/stats");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        totalEvaluations: 1500,
        totalAttendants: 45,
        averageRating: 4.2,
        totalXp: 125000,
        activeSeasons: 2,
        unlockedAchievements: 89,
      });
    });

    it("should return 401 for unauthenticated user", async () => {
      getServerSession.mockResolvedValue(null);

      const request = new Request("http://localhost:3000/api/dashboard/stats");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Não autorizado");
    });

    it("should return stats for any authenticated user", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "USUARIO" },
      });

      // Mock database responses
      prisma.evaluation.count.mockResolvedValue(100);
      prisma.attendant.count.mockResolvedValue(10);
      prisma.evaluation.aggregate.mockResolvedValue({
        _avg: { nota: 3.8 },
      });
      prisma.xpEvent.aggregate.mockResolvedValue({
        _sum: { points: 5000 },
      });
      prisma.gamificationSeason.count.mockResolvedValue(1);
      prisma.unlockedAchievement.count.mockResolvedValue(25);

      const request = new Request("http://localhost:3000/api/dashboard/stats");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.averageRating).toBe(3.8);
    });

    it("should handle database errors gracefully", async () => {
      getServerSession.mockResolvedValue({
        user: { id: "user-1", role: "ADMIN" },
      });

      prisma.evaluation.count.mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost:3000/api/dashboard/stats");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Falha ao buscar estatísticas gerais");
    });
  });
});
