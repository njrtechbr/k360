/**
 * Testes abrangentes para AchievementApiClient
 * Cobre todos os métodos, error handling, validação e edge cases
 */

import { AchievementApiClient } from "../achievementApiClient";
import { httpClient, HttpClientError } from "@/lib/httpClient";
import type {
  UnlockedAchievement,
  AchievementConfig,
  ProcessResult,
  AchievementStats,
  PopularAchievement,
  AchievementProgress,
} from "@/types/achievements";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("AchievementApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // === TESTES DE PROCESSAMENTO DE CONQUISTAS ===

  describe("processAchievementsForAttendant", () => {
    it("should process achievements for attendant successfully", async () => {
      const attendantId = "attendant-123";
      const mockResponse = { newUnlocks: 3 };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result =
        await AchievementApiClient.processAchievementsForAttendant(attendantId);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/achievements/process-attendant",
        {
          attendantId,
        },
      );
      expect(result).toBe(3);
    });

    it("should validate attendantId parameter", async () => {
      await expect(
        AchievementApiClient.processAchievementsForAttendant(""),
      ).rejects.toThrow("Dados inválidos");
    });

    it("should handle HttpClientError", async () => {
      const error = Object.create(HttpClientError.prototype);
      error.message = "Attendant not found";
      error.status = 404;
      error.name = "HttpClientError";

      mockHttpClient.post.mockRejectedValue(error);

      await expect(
        AchievementApiClient.processAchievementsForAttendant("attendant-123"),
      ).rejects.toThrow("Attendant not found");
    });

    it("should handle generic errors", async () => {
      mockHttpClient.post.mockRejectedValue(new Error("Network error"));

      await expect(
        AchievementApiClient.processAchievementsForAttendant("attendant-123"),
      ).rejects.toThrow("Erro ao processar conquistas para atendente");
    });
  });

  describe("processAllAchievements", () => {
    it("should process all achievements successfully", async () => {
      const mockResult: ProcessResult = {
        attendantsProcessed: 45,
        achievementsUnlocked: 23,
        xpAwarded: 5750,
        errors: [],
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result = await AchievementApiClient.processAllAchievements();

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/achievements/process",
      );
      expect(result).toEqual(mockResult);
    });

    it("should handle processing errors", async () => {
      const mockResult: ProcessResult = {
        attendantsProcessed: 45,
        achievementsUnlocked: 20,
        xpAwarded: 5000,
        errors: [
          "Failed to process attendant-456",
          "Achievement criteria error",
        ],
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result = await AchievementApiClient.processAllAchievements();

      expect(result.errors).toHaveLength(2);
      expect(result.attendantsProcessed).toBe(45);
    });
  });

  describe("processSeasonAchievements", () => {
    it("should process season achievements successfully", async () => {
      const seasonId = "season-2024-q1";
      const mockResult: ProcessResult = {
        attendantsProcessed: 30,
        achievementsUnlocked: 15,
        xpAwarded: 3750,
        errors: [],
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result =
        await AchievementApiClient.processSeasonAchievements(seasonId);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/achievements/process-season",
        {
          seasonId,
        },
      );
      expect(result).toEqual(mockResult);
    });

    it("should validate seasonId parameter", async () => {
      await expect(
        AchievementApiClient.processSeasonAchievements(""),
      ).rejects.toThrow("Dados inválidos");
    });
  });

  // === TESTES DE VERIFICAÇÃO DE CONQUISTAS ===

  describe("checkAchievementCriteria", () => {
    it("should check achievement criteria successfully", async () => {
      const attendantId = "attendant-123";
      const achievementId = "expert-evaluator";
      const mockResponse = { meetscriteria: true };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await AchievementApiClient.checkAchievementCriteria(
        attendantId,
        achievementId,
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/achievements/check",
        {
          attendantId,
          achievementId,
        },
      );
      expect(result).toBe(true);
    });

    it("should return false when criteria not met", async () => {
      const mockResponse = { meetscriteria: false };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const result = await AchievementApiClient.checkAchievementCriteria(
        "attendant-123",
        "expert-evaluator",
      );

      expect(result).toBe(false);
    });

    it("should validate parameters", async () => {
      await expect(
        AchievementApiClient.checkAchievementCriteria("", "achievement-id"),
      ).rejects.toThrow("Dados inválidos");

      await expect(
        AchievementApiClient.checkAchievementCriteria("attendant-id", ""),
      ).rejects.toThrow("Dados inválidos");
    });
  });

  describe("getUnlockedAchievements", () => {
    it("should get unlocked achievements without optional parameters", async () => {
      const attendantId = "attendant-123";
      const mockAchievements: UnlockedAchievement[] = [
        {
          id: "unlock-1",
          achievementId: "first-evaluation",
          attendantId,
          seasonId: "season-2024-q1",
          unlockedAt: new Date("2024-01-15T10:30:00Z"),
          xpGained: 100,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result =
        await AchievementApiClient.getUnlockedAchievements(attendantId);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/unlocked/${attendantId}`,
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should get unlocked achievements with seasonId", async () => {
      const attendantId = "attendant-123";
      const seasonId = "season-2024-q1";
      const mockAchievements: UnlockedAchievement[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getUnlockedAchievements(
        attendantId,
        seasonId,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/unlocked/${attendantId}?seasonId=${seasonId}`,
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should get unlocked achievements with includeDetails", async () => {
      const attendantId = "attendant-123";
      const mockAchievements: UnlockedAchievement[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getUnlockedAchievements(
        attendantId,
        undefined,
        true,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/unlocked/${attendantId}?includeDetails=true`,
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should get unlocked achievements with all parameters", async () => {
      const attendantId = "attendant-123";
      const seasonId = "season-2024-q1";
      const mockAchievements: UnlockedAchievement[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getUnlockedAchievements(
        attendantId,
        seasonId,
        true,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/unlocked/${attendantId}?seasonId=${seasonId}&includeDetails=true`,
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should validate attendantId parameter", async () => {
      await expect(
        AchievementApiClient.getUnlockedAchievements(""),
      ).rejects.toThrow("Dados inválidos");
    });
  });

  describe("getAvailableAchievements", () => {
    it("should get available achievements successfully", async () => {
      const mockAchievements: AchievementConfig[] = [
        {
          id: "first-evaluation",
          title: "Primeira Avaliação",
          description: "Recebeu sua primeira avaliação",
          icon: "🎯",
          xpReward: 100,
          criteria: { evaluationCount: 1 },
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getAvailableAchievements();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/achievements/available",
      );
      expect(result).toEqual(mockAchievements);
    });
  });

  // === TESTES DE ESTATÍSTICAS DE CONQUISTAS ===

  describe("getAchievementStats", () => {
    it("should get achievement stats without parameters", async () => {
      const mockStats: AchievementStats = {
        totalAchievements: 25,
        activeAchievements: 23,
        totalUnlocked: 89,
        averageUnlocksPerAttendant: 2.1,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await AchievementApiClient.getAchievementStats();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/achievements/stats",
      );
      expect(result).toEqual(mockStats);
    });

    it("should get achievement stats with seasonId", async () => {
      const seasonId = "season-2024-q1";
      const mockStats: AchievementStats = {
        totalAchievements: 25,
        activeAchievements: 23,
        totalUnlocked: 45,
        averageUnlocksPerAttendant: 1.5,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await AchievementApiClient.getAchievementStats(seasonId);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/stats?seasonId=${seasonId}`,
      );
      expect(result).toEqual(mockStats);
    });

    it("should get achievement stats with attendantId", async () => {
      const attendantId = "attendant-123";
      const mockStats: AchievementStats = {
        totalAchievements: 25,
        activeAchievements: 23,
        totalUnlocked: 5,
        averageUnlocksPerAttendant: 5.0,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await AchievementApiClient.getAchievementStats(
        undefined,
        attendantId,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/stats?attendantId=${attendantId}`,
      );
      expect(result).toEqual(mockStats);
    });

    it("should get achievement stats with both parameters", async () => {
      const seasonId = "season-2024-q1";
      const attendantId = "attendant-123";
      const mockStats: AchievementStats = {
        totalAchievements: 25,
        activeAchievements: 23,
        totalUnlocked: 3,
        averageUnlocksPerAttendant: 3.0,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await AchievementApiClient.getAchievementStats(
        seasonId,
        attendantId,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/stats?seasonId=${seasonId}&attendantId=${attendantId}`,
      );
      expect(result).toEqual(mockStats);
    });
  });

  describe("getPopularAchievements", () => {
    it("should get popular achievements with default limit", async () => {
      const mockAchievements: PopularAchievement[] = [
        {
          achievementId: "first-evaluation",
          title: "Primeira Avaliação",
          description: "Recebeu sua primeira avaliação",
          unlockedCount: 45,
          percentage: 100.0,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getPopularAchievements();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/achievements/popular?limit=10",
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should get popular achievements with custom limit", async () => {
      const mockAchievements: PopularAchievement[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getPopularAchievements(5);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/achievements/popular?limit=5",
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should get popular achievements with seasonId", async () => {
      const seasonId = "season-2024-q1";
      const mockAchievements: PopularAchievement[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getPopularAchievements(
        10,
        seasonId,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/popular?limit=10&seasonId=${seasonId}`,
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should validate limit parameter", async () => {
      await expect(
        AchievementApiClient.getPopularAchievements(0),
      ).rejects.toThrow("Dados inválidos");

      await expect(
        AchievementApiClient.getPopularAchievements(101),
      ).rejects.toThrow("Dados inválidos");
    });
  });

  // === TESTES DE MÉTODOS AUXILIARES ===

  describe("isAchievementUnlocked", () => {
    it("should return true when achievement is unlocked", async () => {
      const attendantId = "attendant-123";
      const achievementId = "first-evaluation";
      const mockAchievements: UnlockedAchievement[] = [
        {
          id: "unlock-1",
          achievementId,
          attendantId,
          seasonId: "season-2024-q1",
          unlockedAt: new Date(),
          xpGained: 100,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.isAchievementUnlocked(
        attendantId,
        achievementId,
      );

      expect(result).toBe(true);
    });

    it("should return false when achievement is not unlocked", async () => {
      const attendantId = "attendant-123";
      const achievementId = "expert-evaluator";
      const mockAchievements: UnlockedAchievement[] = [
        {
          id: "unlock-1",
          achievementId: "first-evaluation",
          attendantId,
          seasonId: "season-2024-q1",
          unlockedAt: new Date(),
          xpGained: 100,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.isAchievementUnlocked(
        attendantId,
        achievementId,
      );

      expect(result).toBe(false);
    });

    it("should return false on error", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Network error"));

      const result = await AchievementApiClient.isAchievementUnlocked(
        "attendant-123",
        "achievement-id",
      );

      expect(result).toBe(false);
    });
  });

  describe("getRecentUnlockedAchievements", () => {
    it("should get recent unlocked achievements with default limit", async () => {
      const mockAchievements: UnlockedAchievement[] = [
        {
          id: "unlock-1",
          achievementId: "first-evaluation",
          attendantId: "attendant-123",
          seasonId: "season-2024-q1",
          unlockedAt: new Date(),
          xpGained: 100,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result = await AchievementApiClient.getRecentUnlockedAchievements();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/achievements/recent?limit=10",
      );
      expect(result).toEqual(mockAchievements);
    });

    it("should get recent unlocked achievements with custom limit", async () => {
      const mockAchievements: UnlockedAchievement[] = [];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAchievements,
      });

      const result =
        await AchievementApiClient.getRecentUnlockedAchievements(20);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/achievements/recent?limit=20",
      );
      expect(result).toEqual(mockAchievements);
    });
  });

  describe("getAchievementProgress", () => {
    it("should get achievement progress successfully", async () => {
      const attendantId = "attendant-123";
      const achievementId = "expert-evaluator";
      const mockProgress: AchievementProgress = {
        achievementId,
        attendantId,
        currentProgress: 75,
        targetProgress: 100,
        percentage: 75.0,
        isUnlocked: false,
        criteria: { evaluationCount: 100 },
        currentValues: { evaluationCount: 75 },
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockProgress,
      });

      const result = await AchievementApiClient.getAchievementProgress(
        attendantId,
        achievementId,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/achievements/progress/${achievementId}?attendantId=${attendantId}`,
      );
      expect(result).toEqual(mockProgress);
    });
  });

  // === TESTES DE COMPATIBILIDADE ===

  describe("Compatibility aliases", () => {
    it("should maintain AchievementProcessor compatibility", async () => {
      const { AchievementProcessor } = require("../achievementApiClient");
      expect(AchievementProcessor).toBe(AchievementApiClient);
    });
  });
});
