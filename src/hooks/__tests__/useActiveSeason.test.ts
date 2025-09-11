/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useActiveSeason } from "../useActiveSeason";
import { httpClient } from "@/lib/httpClient";
import type { ActiveSeasonData } from "../useActiveSeason";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Mock data
const mockActiveSeasonData: ActiveSeasonData = {
  id: "season-1",
  name: "Temporada de Verão 2024",
  startDate: "2024-01-01T00:00:00.000Z",
  endDate: "2024-03-31T23:59:59.999Z",
  active: true,
  xpMultiplier: 1.5,
  status: {
    label: "active",
    isActive: true,
    hasStarted: true,
    hasEnded: false,
    progress: 45.5,
    remainingDays: 30,
  },
  duration: {
    totalDays: 90,
    elapsedDays: 41,
    remainingDays: 30,
  },
};

const mockActiveSeasonWithStats: ActiveSeasonData = {
  ...mockActiveSeasonData,
  stats: {
    totalParticipants: 25,
    totalXpDistributed: 15000,
    averageXpPerParticipant: 600,
    topPerformer: {
      name: "João Silva",
      xp: 2500,
    },
  },
};

describe("useActiveSeason", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should fetch active season successfully", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      success: true,
      data: mockActiveSeasonData,
    });

    const { result } = renderHook(() => useActiveSeason());

    // Estado inicial
    expect(result.current.isLoading).toBe(true);
    expect(result.current.activeSeason).toBe(null);
    expect(result.current.error).toBe(null);

    // Aguardar carregamento
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verificar dados carregados
    expect(result.current.activeSeason).toEqual(mockActiveSeasonData);
    expect(result.current.hasActiveSeason).toBe(true);
    expect(result.current.seasonProgress).toBe(45.5);
    expect(result.current.remainingDays).toBe(30);
    expect(result.current.error).toBe(null);

    // Verificar chamada da API
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      "/api/gamification/seasons/active",
      {
        signal: expect.any(AbortSignal),
      },
    );
  });

  it("should fetch active season with stats when includeStats is true", async () => {
    mockHttpClient.get.mockResolvedValueOnce({
      success: true,
      data: mockActiveSeasonWithStats,
    });

    const { result } = renderHook(() =>
      useActiveSeason({ includeStats: true }),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSeason).toEqual(mockActiveSeasonWithStats);
    expect(result.current.totalParticipants).toBe(25);
    expect(result.current.totalXpDistributed).toBe(15000);

    // Verificar chamada da API com parâmetros
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      "/api/gamification/seasons/active?includeStats=true",
      { signal: expect.any(AbortSignal) },
    );
  });

  it("should not fetch when disabled", () => {
    const { result } = renderHook(() => useActiveSeason({ enabled: false }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.activeSeason).toBe(null);
    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  it("should provide convenience properties", () => {
    const { result } = renderHook(() => useActiveSeason({ enabled: false }));

    // Verificar propriedades de conveniência com valores padrão
    expect(result.current.seasonProgress).toBe(0);
    expect(result.current.remainingDays).toBe(0);
    expect(result.current.totalParticipants).toBe(0);
    expect(result.current.totalXpDistributed).toBe(0);
    expect(result.current.hasActiveSeason).toBe(false);
  });
});
