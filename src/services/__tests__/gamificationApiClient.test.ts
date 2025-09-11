import {
  GamificationApiClient,
  CreateSeasonData,
  UpdateSeasonData,
  CreateAchievementData,
} from "../gamificationApiClient";
import { httpClient } from "@/lib/httpClient";
import {
  GamificationSeason,
  XpEvent,
  AchievementConfig,
  UnlockedAchievement,
} from "@prisma/client";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("GamificationApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Temporadas", () => {
    describe("findAllSeasons", () => {
      it("deve buscar todas as temporadas com sucesso", async () => {
        const mockSeasons = [
          {
            id: "1",
            name: "Temporada 1",
            startDate: new Date("2024-01-01"),
            endDate: new Date("2024-12-31"),
            active: true,
            xpMultiplier: 1.5,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { seasons: mockSeasons },
        });

        const result = await GamificationApiClient.findAllSeasons();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/seasons",
        );
        expect(result).toEqual(mockSeasons);
      });

      it("deve tratar erro ao buscar temporadas", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        await expect(GamificationApiClient.findAllSeasons()).rejects.toThrow(
          "Falha ao buscar temporadas",
        );
      });
    });

    describe("findActiveSeason", () => {
      it("deve buscar temporada ativa com sucesso", async () => {
        const mockSeason: GamificationSeason = {
          id: "1",
          name: "Temporada Ativa",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          active: true,
          xpMultiplier: 1.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockSeason,
        });

        const result = await GamificationApiClient.findActiveSeason();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/seasons/active",
        );
        expect(result).toEqual(mockSeason);
      });

      it("deve retornar null quando não há temporada ativa", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: null,
        });

        const result = await GamificationApiClient.findActiveSeason();

        expect(result).toBeNull();
      });
    });

    describe("createSeason", () => {
      it("deve criar temporada com sucesso", async () => {
        const seasonData: CreateSeasonData = {
          name: "Nova Temporada",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          active: true,
          xpMultiplier: 1.5,
        };

        const mockCreatedSeason: GamificationSeason = {
          id: "1",
          ...seasonData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockCreatedSeason,
        });

        const result = await GamificationApiClient.createSeason(seasonData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/seasons",
          seasonData,
        );
        expect(result).toEqual(mockCreatedSeason);
      });

      it("deve validar datas antes de criar", async () => {
        const invalidSeasonData: CreateSeasonData = {
          name: "Temporada Inválida",
          startDate: new Date("2024-12-31"),
          endDate: new Date("2024-01-01"), // Data de fim antes do início
          active: true,
          xpMultiplier: 1.5,
        };

        await expect(
          GamificationApiClient.createSeason(invalidSeasonData),
        ).rejects.toThrow("Data de fim deve ser posterior à data de início");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });

      it("deve validar dados obrigatórios", async () => {
        const invalidData = {
          name: "", // Nome vazio
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          active: true,
          xpMultiplier: 1.5,
        } as CreateSeasonData;

        await expect(
          GamificationApiClient.createSeason(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("updateSeason", () => {
      it("deve atualizar temporada com sucesso", async () => {
        const updateData: UpdateSeasonData = {
          name: "Temporada Atualizada",
          active: false,
        };

        const mockUpdatedSeason: GamificationSeason = {
          id: "1",
          name: "Temporada Atualizada",
          startDate: new Date("2024-01-01"),
          endDate: new Date("2024-12-31"),
          active: false,
          xpMultiplier: 1.5,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.put.mockResolvedValue({
          success: true,
          data: mockUpdatedSeason,
        });

        const result = await GamificationApiClient.updateSeason(
          "1",
          updateData,
        );

        expect(mockHttpClient.put).toHaveBeenCalledWith(
          "/api/gamification/seasons?id=1",
          updateData,
        );
        expect(result).toEqual(mockUpdatedSeason);
      });
    });

    describe("deleteSeason", () => {
      it("deve deletar temporada com sucesso", async () => {
        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: { message: "Temporada deletada com sucesso" },
        });

        await GamificationApiClient.deleteSeason("1");

        expect(mockHttpClient.delete).toHaveBeenCalledWith(
          "/api/gamification/seasons?id=1",
        );
      });
    });
  });

  describe("Eventos XP", () => {
    describe("findXpEventsByAttendant", () => {
      it("deve buscar eventos XP por atendente", async () => {
        const mockEvents: XpEvent[] = [
          {
            id: "1",
            attendantId: "att1",
            points: 100,
            basePoints: 100,
            multiplier: 1,
            reason: "Avaliação 5 estrelas",
            date: new Date(),
            type: "evaluation",
            relatedId: "eval1",
            seasonId: "season1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { events: mockEvents },
        });

        const result =
          await GamificationApiClient.findXpEventsByAttendant("att1");

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/xp-events?attendantId=att1",
        );
        expect(result).toEqual(mockEvents);
      });
    });

    describe("calculateTotalXp", () => {
      it("deve calcular XP total do atendente", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { stats: { totalXp: 500 } },
        });

        const result = await GamificationApiClient.calculateTotalXp("att1");

        expect(result).toBe(500);
      });

      it("deve retornar 0 em caso de erro", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await GamificationApiClient.calculateTotalXp("att1");

        expect(result).toBe(0);
      });
    });

    describe("createXpEvent", () => {
      it("deve criar evento XP com sucesso", async () => {
        const eventData = {
          attendantId: "att1",
          points: 100,
          reason: "Avaliação 5 estrelas",
          type: "evaluation",
        };

        const mockCreatedEvent: XpEvent = {
          id: "1",
          ...eventData,
          basePoints: 100,
          multiplier: 1,
          date: new Date(),
          relatedId: "",
          seasonId: "season1",
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockCreatedEvent,
        });

        // Mock para checkAchievements
        jest
          .spyOn(GamificationApiClient, "checkAchievements")
          .mockResolvedValue([]);

        const result = await GamificationApiClient.createXpEvent(eventData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/xp-events",
          eventData,
        );
        expect(result).toEqual(mockCreatedEvent);
        expect(GamificationApiClient.checkAchievements).toHaveBeenCalledWith(
          "att1",
        );
      });
    });
  });

  describe("Conquistas", () => {
    describe("findAllAchievements", () => {
      it("deve buscar todas as conquistas", async () => {
        const mockAchievements: AchievementConfig[] = [
          {
            id: "first_evaluation",
            title: "Primeira Avaliação",
            description: "Receba sua primeira avaliação",
            xp: 50,
            active: true,
            icon: "🎯",
            color: "bg-blue-500",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockAchievements,
        });

        const result = await GamificationApiClient.findAllAchievements();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/achievements",
        );
        expect(result).toEqual(mockAchievements);
      });
    });

    describe("createAchievement", () => {
      it("deve criar conquista com sucesso", async () => {
        const achievementData: CreateAchievementData = {
          id: "new_achievement",
          title: "Nova Conquista",
          description: "Descrição da conquista",
          xp: 100,
          active: true,
          icon: "🏆",
          color: "bg-gold-500",
        };

        const mockCreatedAchievement: AchievementConfig = {
          ...achievementData,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockCreatedAchievement,
        });

        const result =
          await GamificationApiClient.createAchievement(achievementData);

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/achievements",
          achievementData,
        );
        expect(result).toEqual(mockCreatedAchievement);
      });

      it("deve validar dados obrigatórios", async () => {
        const invalidData = {
          id: "", // ID vazio
          title: "Conquista",
          description: "Descrição",
          xp: 100,
          active: true,
          icon: "🏆",
          color: "bg-gold-500",
        } as CreateAchievementData;

        await expect(
          GamificationApiClient.createAchievement(invalidData),
        ).rejects.toThrow("Dados inválidos");

        expect(mockHttpClient.post).not.toHaveBeenCalled();
      });
    });

    describe("findUnlockedAchievements", () => {
      it("deve buscar conquistas desbloqueadas", async () => {
        const mockUnlocked: UnlockedAchievement[] = [
          {
            id: "1",
            attendantId: "att1",
            achievementId: "first_evaluation",
            xpGained: 50,
            unlockedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockUnlocked,
        });

        const result =
          await GamificationApiClient.findUnlockedAchievements("att1");

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/achievements",
        );
        expect(result).toEqual(mockUnlocked);
      });
    });

    describe("unlockAchievement", () => {
      it("deve desbloquear conquista com sucesso", async () => {
        const mockUnlocked: UnlockedAchievement = {
          id: "1",
          attendantId: "att1",
          achievementId: "first_evaluation",
          xpGained: 50,
          unlockedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockUnlocked,
        });

        const result = await GamificationApiClient.unlockAchievement(
          "att1",
          "first_evaluation",
        );

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/achievements",
          {
            achievementId: "first_evaluation",
          },
        );
        expect(result).toEqual(mockUnlocked);
      });
    });

    describe("checkAchievements", () => {
      it("deve verificar conquistas automaticamente", async () => {
        const mockNewUnlocked: UnlockedAchievement[] = [
          {
            id: "1",
            attendantId: "att1",
            achievementId: "ten_evaluations",
            xpGained: 100,
            unlockedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: mockNewUnlocked,
        });

        const result = await GamificationApiClient.checkAchievements("att1");

        expect(mockHttpClient.post).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/check-achievements",
          {},
        );
        expect(result).toEqual(mockNewUnlocked);
      });

      it("deve retornar array vazio em caso de erro", async () => {
        mockHttpClient.post.mockRejectedValue(new Error("Network error"));

        const result = await GamificationApiClient.checkAchievements("att1");

        expect(result).toEqual([]);
      });
    });
  });

  describe("Rankings", () => {
    describe("calculateSeasonRankings", () => {
      it("deve calcular rankings da temporada", async () => {
        const mockRankings = [
          {
            attendantId: "att1",
            attendantName: "João Silva",
            totalXp: 1000,
            position: 1,
          },
          {
            attendantId: "att2",
            attendantName: "Maria Santos",
            totalXp: 800,
            position: 2,
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockRankings,
        });

        const result =
          await GamificationApiClient.calculateSeasonRankings("season1");

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/leaderboard?seasonId=season1",
        );
        expect(result).toEqual(mockRankings);
      });

      it("deve calcular rankings gerais quando não especifica temporada", async () => {
        const mockRankings = [
          {
            attendantId: "att1",
            attendantName: "João Silva",
            totalXp: 1000,
            position: 1,
          },
        ];

        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: mockRankings,
        });

        const result = await GamificationApiClient.calculateSeasonRankings();

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/leaderboard",
        );
        expect(result).toEqual(mockRankings);
      });
    });

    describe("resetXpEvents", () => {
      it("deve resetar eventos XP com sucesso", async () => {
        mockHttpClient.delete.mockResolvedValue({
          success: true,
          data: { count: 150 },
        });

        const result = await GamificationApiClient.resetXpEvents("season1");

        expect(mockHttpClient.delete).toHaveBeenCalledWith(
          "/api/gamification/xp-events/reset?seasonId=season1",
        );
        expect(result).toBe(150);
      });
    });
  });

  describe("Métodos auxiliares", () => {
    describe("checkAchievementCriteria", () => {
      it("deve verificar critérios de conquista", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { eligible: true },
        });

        const result = await GamificationApiClient.checkAchievementCriteria(
          "att1",
          "first_evaluation",
        );

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/achievements/first_evaluation/check",
        );
        expect(result).toBe(true);
      });

      it("deve retornar false em caso de erro", async () => {
        mockHttpClient.get.mockRejectedValue(new Error("Network error"));

        const result = await GamificationApiClient.checkAchievementCriteria(
          "att1",
          "first_evaluation",
        );

        expect(result).toBe(false);
      });
    });

    describe("checkFiveStarStreak", () => {
      it("deve verificar sequência de 5 estrelas", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { hasStreak: true },
        });

        const result = await GamificationApiClient.checkFiveStarStreak(
          "att1",
          5,
        );

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/streak?required=5",
        );
        expect(result).toBe(true);
      });
    });

    describe("checkHighAverage", () => {
      it("deve verificar média alta", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { hasHighAverage: true },
        });

        const result = await GamificationApiClient.checkHighAverage(
          "att1",
          4.5,
          50,
        );

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/average?required=4.5&min=50",
        );
        expect(result).toBe(true);
      });
    });

    describe("checkRankingPosition", () => {
      it("deve verificar posição no ranking", async () => {
        mockHttpClient.get.mockResolvedValue({
          success: true,
          data: { hasPosition: true },
        });

        const result = await GamificationApiClient.checkRankingPosition(
          "att1",
          "monthly_champion",
        );

        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/gamification/attendants/att1/ranking/monthly_champion",
        );
        expect(result).toBe(true);
      });
    });
  });
});
