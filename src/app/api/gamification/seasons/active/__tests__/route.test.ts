/**
 * @jest-environment node
 */

import { NextRequest } from "next/server";
import { GET } from "../route";
import { getServerSession } from "next-auth";
import { GamificationService } from "@/services/gamificationService";

// Mock das dependências
jest.mock("next-auth");
jest.mock("@/services/gamificationService");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockGamificationService = GamificationService as jest.Mocked<
  typeof GamificationService
>;

// Mock de temporada ativa (período atual)
const mockActiveSeason = {
  id: "season-1",
  name: "Temporada de Verão 2025",
  startDate: new Date("2025-01-01"),
  endDate: new Date("2025-12-31"),
  active: true,
  xpMultiplier: 1.5,
};

// Mock de temporada inativa
const mockInactiveSeason = {
  id: "season-2",
  name: "Temporada Antiga",
  startDate: new Date("2023-01-01"),
  endDate: new Date("2023-03-31"),
  active: false,
  xpMultiplier: 1.0,
};

describe("/api/gamification/seasons/active", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return active season successfully", async () => {
    // Mock da sessão autenticada
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    } as any);

    // Mock do serviço retornando temporadas
    mockGamificationService.findAllSeasons.mockResolvedValueOnce([
      mockActiveSeason,
      mockInactiveSeason,
    ]);

    const request = new NextRequest(
      "http://localhost:3000/api/gamification/seasons/active",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBe("season-1");
    expect(data.data.name).toBe("Temporada de Verão 2025");
    expect(data.data.status.isActive).toBe(true);
    expect(data.data.status.label).toBe("active");
  });

  it("should return null when no active season exists", async () => {
    // Mock da sessão autenticada
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    } as any);

    // Mock do serviço retornando apenas temporadas inativas
    mockGamificationService.findAllSeasons.mockResolvedValueOnce([
      mockInactiveSeason,
    ]);

    const request = new NextRequest(
      "http://localhost:3000/api/gamification/seasons/active",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toBe(null);
    expect(data.message).toBe("Nenhuma temporada ativa encontrada");
  });

  it("should include stats when requested", async () => {
    // Mock da sessão autenticada
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    } as any);

    // Mock do serviço
    mockGamificationService.findAllSeasons.mockResolvedValueOnce([
      mockActiveSeason,
    ]);
    mockGamificationService.calculateSeasonRankings.mockResolvedValueOnce([
      {
        attendantName: "João Silva",
        totalXp: 2500,
        position: 1,
      },
      {
        attendantName: "Maria Santos",
        totalXp: 2000,
        position: 2,
      },
    ] as any);

    const request = new NextRequest(
      "http://localhost:3000/api/gamification/seasons/active?includeStats=true",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats).toBeDefined();
    expect(data.data.stats.totalParticipants).toBe(2);
    expect(data.data.stats.totalXpDistributed).toBe(4500);
    expect(data.data.stats.topPerformer.name).toBe("João Silva");
    expect(data.data.stats.topPerformer.xp).toBe(2500);
  });

  it("should return 401 when user is not authenticated", async () => {
    // Mock de sessão não autenticada
    mockGetServerSession.mockResolvedValueOnce(null);

    const request = new NextRequest(
      "http://localhost:3000/api/gamification/seasons/active",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Não autorizado");
  });

  it("should handle service errors gracefully", async () => {
    // Mock da sessão autenticada
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    } as any);

    // Mock do serviço com erro
    mockGamificationService.findAllSeasons.mockRejectedValueOnce(
      new Error("Database connection failed"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/gamification/seasons/active",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Erro interno do servidor");
  });

  it("should handle stats calculation errors gracefully", async () => {
    // Mock da sessão autenticada
    mockGetServerSession.mockResolvedValueOnce({
      user: { id: "1", role: "ADMIN" },
    } as any);

    // Mock do serviço
    mockGamificationService.findAllSeasons.mockResolvedValueOnce([
      mockActiveSeason,
    ]);
    mockGamificationService.calculateSeasonRankings.mockRejectedValueOnce(
      new Error("Stats calculation failed"),
    );

    const request = new NextRequest(
      "http://localhost:3000/api/gamification/seasons/active?includeStats=true",
    );
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats).toBe(null);
  });
});
