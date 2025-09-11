/**
 * @jest-environment jsdom
 */

import { renderHook, waitFor } from "@testing-library/react";
import { useActiveSeason } from "../useActiveSeason";

// Mock fetch para simular chamadas reais da API
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe("useActiveSeason Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should integrate correctly with API response format", async () => {
    const mockApiResponse = {
      success: true,
      data: {
        id: "season-1",
        name: "Temporada Atual",
        startDate: "2025-01-01T00:00:00.000Z",
        endDate: "2025-12-31T23:59:59.999Z",
        active: true,
        xpMultiplier: 1.5,
        status: {
          label: "active",
          isActive: true,
          hasStarted: true,
          hasEnded: false,
          progress: 25.5,
          remainingDays: 275,
        },
        duration: {
          totalDays: 365,
          elapsedDays: 90,
          remainingDays: 275,
        },
      },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockApiResponse,
    } as Response);

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSeason).toEqual(mockApiResponse.data);
    expect(result.current.hasActiveSeason).toBe(true);
    expect(result.current.seasonProgress).toBe(25.5);
    expect(result.current.remainingDays).toBe(275);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/gamification/seasons/active",
      expect.objectContaining({
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("should handle API error responses correctly", async () => {
    const mockErrorResponse = {
      success: false,
      error: "Erro interno do servidor",
    };

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => mockErrorResponse,
    } as Response);

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSeason).toBe(null);
    expect(result.current.hasActiveSeason).toBe(false);
    expect(result.current.error).toBeTruthy();
  });

  it("should handle network errors correctly", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useActiveSeason());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.activeSeason).toBe(null);
    expect(result.current.hasActiveSeason).toBe(false);
    expect(result.current.error).toBe("Network error");
  });
});
