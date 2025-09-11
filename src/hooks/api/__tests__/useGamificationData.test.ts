/**
 * Testes para o hook useGamificationData
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useGamificationData,
  useGamificationReadOnly,
} from "../useGamificationData";
import { httpClient } from "@/lib/httpClient";
import type {
  GamificationConfig,
  Achievement,
  LevelReward,
  GamificationSeason,
  XpEvent,
  UnlockedAchievement,
} from "@/lib/types";

// Mock do httpClient
jest.mock("@/lib/httpClient", () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Dados de teste
const mockGamificationConfig = {
  ratingScores: { "1": -5, "2": -2, "3": 1, "4": 3, "5": 5 },
  achievements: [
    {
      id: "first-evaluation",
      title: "Primeira Avaliação",
      description: "Recebeu sua primeira avaliação",
      xp: 10,
      active: true,
      icon: "🎯",
      color: "bg-blue-500",
    },
  ] as Achievement[],
  levelRewards: [
    {
      level: 1,
      title: "Iniciante",
      description: "Primeiro nível alcançado",
      active: true,
      icon: "🌟",
      color: "bg-green-500",
    },
  ] as LevelReward[],
  seasons: [
    {
      id: "season-1",
      name: "Temporada 1",
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-12-31T23:59:59Z",
      active: true,
      xpMultiplier: 1.5,
    },
  ] as GamificationSeason[],
  globalXpMultiplier: 1,
};

const mockXpEvents: XpEvent[] = [
  {
    id: "xp-1",
    attendantId: "attendant-1",
    points: 15,
    basePoints: 10,
    multiplier: 1.5,
    reason: "Avaliação 5 estrelas",
    date: "2024-01-15T10:00:00Z",
    type: "evaluation",
    relatedId: "eval-1",
  },
];

const mockUnlockedAchievements: UnlockedAchievement[] = [
  {
    id: "unlocked-1",
    attendantId: "attendant-1",
    achievementId: "first-evaluation",
    unlockedAt: "2024-01-15T10:00:00Z",
    xpGained: 10,
  },
];

const mockLeaderboard = [
  {
    attendantId: "attendant-1",
    attendantName: "João Silva",
    totalXp: 150,
    level: 2,
    position: 1,
    unlockedAchievements: 3,
  },
  {
    attendantId: "attendant-2",
    attendantName: "Maria Santos",
    totalXp: 120,
    level: 2,
    position: 2,
    unlockedAchievements: 2,
  },
];

describe("useGamificationData", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockHttpClient.get.mockImplementation((url: string) => {
      if (url === "/api/gamification") {
        return Promise.resolve({ success: true, data: mockGamificationConfig });
      }
      if (url === "/api/gamification/xp-events") {
        return Promise.resolve({ success: true, data: mockXpEvents });
      }
      if (url === "/api/gamification/achievements/unlocked") {
        return Promise.resolve({
          success: true,
          data: mockUnlockedAchievements,
        });
      }
      if (url === "/api/gamification/seasons") {
        return Promise.resolve({
          success: true,
          data: mockGamificationConfig.seasons,
        });
      }
      if (url === "/api/gamification/seasons/active") {
        return Promise.resolve({
          success: true,
          data: mockGamificationConfig.seasons[0],
        });
      }
      if (url === "/api/gamification/leaderboard") {
        return Promise.resolve({ success: true, data: mockLeaderboard });
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
  });

  describe("Carregamento de dados", () => {
    it("deve carregar configuração de gamificação com sucesso", async () => {
      const { result } = renderHook(() => useGamificationData());

      // Inicialmente deve estar carregando
      expect(result.current.isLoading).toBe(true);
      expect(result.current.config.data).toBeNull();

      // Aguardar carregamento
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verificar dados carregados
      expect(result.current.config.data).toEqual(mockGamificationConfig);
      expect(result.current.achievements.data).toEqual(
        mockGamificationConfig.achievements,
      );
      expect(result.current.levelRewards.data).toEqual(
        mockGamificationConfig.levelRewards,
      );
      expect(result.current.seasons.data).toEqual(
        mockGamificationConfig.seasons,
      );
      expect(result.current.seasons.activeSeason).toEqual(
        mockGamificationConfig.seasons[0],
      );
    });

    it("deve carregar eventos de XP com sucesso", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.xpEvents.data).toEqual(mockXpEvents);
      });
    });

    it("deve carregar conquistas desbloqueadas com sucesso", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.unlockedAchievements.data).toEqual(
          mockUnlockedAchievements,
        );
      });
    });

    it("deve carregar leaderboard com sucesso", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.leaderboard.data).toEqual(mockLeaderboard);
      });
    });
  });

  describe("Tratamento de erros", () => {
    it("deve ter estrutura de erro definida", () => {
      const { result } = renderHook(() => useGamificationData());

      // Verifica se a estrutura de erro está presente
      expect(result.current.config).toHaveProperty("error");
      expect(result.current.hasError).toBeDefined();
    });
  });

  describe("Funções utilitárias", () => {
    it("deve calcular nível a partir do XP corretamente", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Testes de cálculo de nível
      expect(result.current.getLevelFromXp(0)).toBe(1);
      expect(result.current.getLevelFromXp(100)).toBe(2);
      expect(result.current.getLevelFromXp(400)).toBe(3);
      expect(result.current.getLevelFromXp(900)).toBe(4);
    });

    it("deve calcular XP necessário para nível corretamente", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Testes de cálculo de XP para nível
      expect(result.current.getXpForLevel(1)).toBe(0);
      expect(result.current.getXpForLevel(2)).toBe(100);
      expect(result.current.getXpForLevel(3)).toBe(400);
      expect(result.current.getXpForLevel(4)).toBe(900);
    });

    it("deve calcular multiplicador de temporada corretamente", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Data dentro da temporada
      const dateInSeason = new Date("2024-06-15T12:00:00Z");
      expect(result.current.calculateSeasonMultiplier(dateInSeason)).toBe(1.5);

      // Data fora da temporada
      const dateOutSeason = new Date("2025-01-15T12:00:00Z");
      expect(result.current.calculateSeasonMultiplier(dateOutSeason)).toBe(1);
    });

    it("deve filtrar eventos de XP por atendente", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.xpEvents.data).toEqual(mockXpEvents);
      });

      const attendantEvents =
        result.current.xpEvents.getByAttendant("attendant-1");
      expect(attendantEvents).toHaveLength(1);
      expect(attendantEvents[0].attendantId).toBe("attendant-1");

      const noEvents = result.current.xpEvents.getByAttendant("attendant-999");
      expect(noEvents).toHaveLength(0);
    });

    it("deve calcular XP total corretamente", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.xpEvents.data).toEqual(mockXpEvents);
      });

      // XP total geral
      const totalXp = result.current.xpEvents.getTotalXp();
      expect(totalXp).toBe(15);

      // XP total por atendente
      const attendantXp = result.current.xpEvents.getTotalXp("attendant-1");
      expect(attendantXp).toBe(15);

      const noXp = result.current.xpEvents.getTotalXp("attendant-999");
      expect(noXp).toBe(0);
    });

    it("deve buscar posição no leaderboard corretamente", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.leaderboard.data).toEqual(mockLeaderboard);
      });

      const firstPlace = result.current.leaderboard.getByPosition(1);
      expect(firstPlace?.attendantId).toBe("attendant-1");

      const attendantEntry =
        result.current.leaderboard.getByAttendant("attendant-2");
      expect(attendantEntry?.position).toBe(2);
      expect(attendantEntry?.attendantName).toBe("Maria Santos");
    });
  });

  describe("Operações de atualização", () => {
    it("deve atualizar conquista com sucesso", async () => {
      mockHttpClient.put.mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.achievements.updateAchievement(
          "first-evaluation",
          {
            title: "Novo Título",
            xp: 20,
          },
        );
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/gamification/achievements/first-evaluation",
        { id: "first-evaluation", title: "Novo Título", xp: 20 },
      );
    });

    it("deve criar temporada com sucesso", async () => {
      mockHttpClient.post.mockResolvedValue({ success: true, data: {} });

      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const newSeason = {
        name: "Nova Temporada",
        startDate: "2024-01-01T00:00:00Z",
        endDate: "2024-12-31T23:59:59Z",
        active: true,
        xpMultiplier: 2,
      };

      await act(async () => {
        await result.current.seasons.createSeason(newSeason);
      });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/gamification/seasons",
        newSeason,
      );
    });
  });

  describe("Refresh de dados", () => {
    it("deve fazer refresh de todos os dados", async () => {
      const { result } = renderHook(() => useGamificationData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Limpar mocks para contar novas chamadas
      jest.clearAllMocks();

      await act(async () => {
        await result.current.refreshAll();
      });

      // Verificar se todas as APIs foram chamadas novamente (com signal)
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/xp-events",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/achievements/unlocked",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/seasons",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/seasons/active",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/gamification/leaderboard",
        expect.objectContaining({ signal: expect.any(Object) }),
      );
    });
  });
});

describe("useGamificationReadOnly", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockHttpClient.get.mockImplementation((url: string) => {
      if (url === "/api/gamification") {
        return Promise.resolve({ success: true, data: mockGamificationConfig });
      }
      if (url === "/api/gamification/xp-events") {
        return Promise.resolve({ success: true, data: mockXpEvents });
      }
      if (url === "/api/gamification/achievements/unlocked") {
        return Promise.resolve({
          success: true,
          data: mockUnlockedAchievements,
        });
      }
      if (url === "/api/gamification/seasons") {
        return Promise.resolve({
          success: true,
          data: mockGamificationConfig.seasons,
        });
      }
      if (url === "/api/gamification/seasons/active") {
        return Promise.resolve({
          success: true,
          data: mockGamificationConfig.seasons[0],
        });
      }
      if (url === "/api/gamification/leaderboard") {
        return Promise.resolve({ success: true, data: mockLeaderboard });
      }

      return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
  });

  it("deve fornecer dados somente leitura", async () => {
    const { result } = renderHook(() => useGamificationReadOnly());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verificar se dados estão disponíveis
    expect(result.current.config).toEqual(mockGamificationConfig);
    expect(result.current.achievements).toEqual(
      mockGamificationConfig.achievements,
    );
    expect(result.current.activeSeason).toEqual(
      mockGamificationConfig.seasons[0],
    );

    // Verificar se funções utilitárias estão disponíveis
    expect(typeof result.current.getLevelFromXp).toBe("function");
    expect(typeof result.current.getXpForLevel).toBe("function");
    expect(typeof result.current.calculateSeasonMultiplier).toBe("function");

    // Verificar se não há funções de mutação
    expect(result.current).not.toHaveProperty("updateAchievement");
    expect(result.current).not.toHaveProperty("createSeason");
    expect(result.current).not.toHaveProperty("refreshAll");
  });

  it("deve filtrar dados por atendente quando especificado", async () => {
    const { result } = renderHook(() =>
      useGamificationReadOnly({ attendantId: "attendant-1" }),
    );

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 3000 },
    );

    // Verificar se a API foi chamada com o attendantId correto
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      "/api/gamification/xp-events/attendant/attendant-1",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      "/api/gamification/achievements/attendant/attendant-1",
      expect.objectContaining({ signal: expect.any(Object) }),
    );
  });
});
