/**
 * Testes abrangentes para o hook useApiQuery
 * Cobre caching, retry logic, window focus, e todos os cenários de uso
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useApiQuery } from "../useApiQuery";
import { httpClient } from "@/lib/httpClient";
import { HttpClientError } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient", () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

// Mock do AbortController
const mockAbort = jest.fn();
const mockAbortController = {
  abort: mockAbort,
  signal: { aborted: false } as AbortSignal,
};

global.AbortController = jest.fn(() => mockAbortController) as any;

// Mock de timers para testes de retry
jest.useFakeTimers();

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("useApiQuery", () => {
  beforeEach(() => {
    mockHttpClient.get.mockClear();
    mockAbort.mockClear();
    jest.clearAllTimers();

    // Limpa cache entre testes
    const queryCache = (useApiQuery as any).__cache__;
    if (queryCache) {
      queryCache.clear();
    }
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Basic Functionality", () => {
    it("should fetch data successfully", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
        message: "Success",
      });

      const { result } = renderHook(() => useApiQuery(["users"], "/api/users"));

      expect(result.current.loading).toBe(true);
      expect(result.current.data).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
      expect(result.current.lastFetch).toBeInstanceOf(Date);
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/users",
        expect.any(Object),
      );
    });

    it("should handle API errors", async () => {
      const error = new HttpClientError("User not found", 404, "NOT_FOUND");
      mockHttpClient.get.mockRejectedValue(error);

      const { result } = renderHook(() =>
        useApiQuery(["users-error"], "/api/users-error", undefined, {
          retry: false,
          refetchOnMount: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("User not found");
      expect(result.current.data).toBe(null);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      mockHttpClient.get.mockRejectedValue(networkError);

      const { result } = renderHook(() =>
        useApiQuery(["network-error"], "/api/network-error", undefined, {
          retry: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Network connection failed");
    });

    it("should not fetch when disabled", () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const { result } = renderHook(() =>
        useApiQuery(["users"], "/api/users", undefined, { enabled: false }),
      );

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toBe(null);
      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });

    it("should enable/disable dynamically", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      let enabled = false;
      const { result, rerender } = renderHook(() =>
        useApiQuery(["users-dynamic"], "/api/users", undefined, { enabled }),
      );

      expect(mockHttpClient.get).not.toHaveBeenCalled();

      // Habilita o hook
      enabled = true;
      rerender();

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockData);
    });
  });

  describe("Query Parameters", () => {
    it("should handle query parameters correctly", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const params = { page: 1, limit: 10, search: "test user" };

      renderHook(() => useApiQuery(["users-params"], "/api/users", params));

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/users?page=1&limit=10&search=test+user",
          expect.any(Object),
        );
      });
    });

    it("should handle undefined and null parameters", async () => {
      const mockData = [];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const params = {
        page: 1,
        search: undefined,
        filter: null,
        active: true,
      };

      renderHook(() =>
        useApiQuery(["users-null-params"], "/api/users", params),
      );

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/users?page=1&active=true",
          expect.any(Object),
        );
      });
    });

    it("should handle empty parameters", async () => {
      const mockData = [];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      renderHook(() => useApiQuery(["users-empty-params"], "/api/users", {}));

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledWith(
          "/api/users",
          expect.any(Object),
        );
      });
    });

    it("should update when parameters change", async () => {
      const mockData1 = [{ id: 1, name: "User 1" }];
      const mockData2 = [{ id: 2, name: "User 2" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      let params = { page: 1 };
      const { result, rerender } = renderHook(() =>
        useApiQuery(["users-changing-params"], "/api/users", params),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Muda os parâmetros
      params = { page: 2 };
      rerender();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(
        1,
        "/api/users?page=1",
        expect.any(Object),
      );
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(
        2,
        "/api/users?page=2",
        expect.any(Object),
      );
    });
  });

  describe("Caching", () => {
    it("should use cached data when available", async () => {
      const mockData = [{ id: 1, name: "Cached User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Primeira renderização
      const { result: result1 } = renderHook(() =>
        useApiQuery(["users-cache"], "/api/users"),
      );

      await waitFor(() => {
        expect(result1.current.loading).toBe(false);
      });

      expect(result1.current.data).toEqual(mockData);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // Segunda renderização com mesma chave - deve usar cache
      const { result: result2 } = renderHook(() =>
        useApiQuery(["users-cache"], "/api/users"),
      );

      // Dados devem estar disponíveis imediatamente do cache
      expect(result2.current.data).toEqual(mockData);
      expect(result2.current.loading).toBe(false);

      // Não deve fazer nova requisição se dados não estão stale
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });
    });

    it("should refetch stale data in background", async () => {
      const mockData1 = [{ id: 1, name: "Old Data" }];
      const mockData2 = [{ id: 1, name: "Fresh Data" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      // Primeira renderização
      const { result: result1 } = renderHook(() =>
        useApiQuery(["users-stale"], "/api/users", undefined, {
          staleTime: 100, // 100ms stale time
        }),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData1);
      });

      // Espera dados ficarem stale
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // Segunda renderização - deve mostrar dados cached mas refetch em background
      const { result: result2 } = renderHook(() =>
        useApiQuery(["users-stale"], "/api/users", undefined, {
          staleTime: 100,
        }),
      );

      // Dados cached devem estar disponíveis imediatamente
      expect(result2.current.data).toEqual(mockData1);

      // Deve fazer refetch em background
      await waitFor(() => {
        expect(result2.current.data).toEqual(mockData2);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it("should respect cache time and expire old data", async () => {
      const mockData = [{ id: 1, name: "Expired Data" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Primeira renderização
      const { result: result1 } = renderHook(() =>
        useApiQuery(["users-expire"], "/api/users", undefined, {
          cacheTime: 100, // 100ms cache time
        }),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData);
      });

      // Espera cache expirar
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      // Segunda renderização - cache expirado, deve fazer nova requisição
      const { result: result2 } = renderHook(() =>
        useApiQuery(["users-expire"], "/api/users", undefined, {
          cacheTime: 100,
        }),
      );

      expect(result2.current.loading).toBe(true);

      await waitFor(() => {
        expect(result2.current.loading).toBe(false);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("Retry Logic", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should retry on network errors", async () => {
      const networkError = new Error("Network error");
      const mockData = [{ id: 1, name: "Success after retry" }];

      mockHttpClient.get
        .mockRejectedValueOnce(networkError)
        .mockResolvedValueOnce({ success: true, data: mockData });

      const { result } = renderHook(() =>
        useApiQuery(["users-retry"], "/api/users", undefined, {
          retry: true,
          retryDelay: 1000,
        }),
      );

      expect(result.current.loading).toBe(true);

      // Avança timer para retry
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.error).toBe(null);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it("should retry on 5xx server errors", async () => {
      const serverError = new HttpClientError("Internal server error", 500);
      const mockData = [{ id: 1, name: "Success after retry" }];

      mockHttpClient.get
        .mockRejectedValueOnce(serverError)
        .mockResolvedValueOnce({ success: true, data: mockData });

      const { result } = renderHook(() =>
        useApiQuery(["users-server-retry"], "/api/users", undefined, {
          retry: true,
          retryDelay: 1000,
        }),
      );

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it("should NOT retry on 4xx client errors", async () => {
      const clientError = new HttpClientError("Bad request", 400);

      mockHttpClient.get.mockRejectedValue(clientError);

      const { result } = renderHook(() =>
        useApiQuery(["users-no-retry"], "/api/users", undefined, {
          retry: true,
          retryDelay: 1000,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Bad request");
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it("should not retry when retry is disabled", async () => {
      const networkError = new Error("Network error");

      mockHttpClient.get.mockRejectedValue(networkError);

      const { result } = renderHook(() =>
        useApiQuery(["users-no-retry-disabled"], "/api/users", undefined, {
          retry: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toBe("Network error");
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("Refetch Functionality", () => {
    it("should have refetch function available", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiQuery(["users-refetch"], "/api/users"),
      );

      expect(typeof result.current.refetch).toBe("function");

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(mockData);
    });

    it("should refetch data when refetch is called", async () => {
      const mockData1 = [{ id: 1, name: "Original Data" }];
      const mockData2 = [{ id: 1, name: "Refetched Data" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      const { result } = renderHook(() =>
        useApiQuery(["users-manual-refetch"], "/api/users"),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Chama refetch manualmente
      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.data).toEqual(mockData2);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it("should not refetch when disabled", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiQuery(["users-refetch-disabled"], "/api/users", undefined, {
          enabled: false,
        }),
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockHttpClient.get).not.toHaveBeenCalled();
    });
  });

  describe("Window Focus Refetch", () => {
    it("should refetch on window focus when enabled", async () => {
      const mockData1 = [{ id: 1, name: "Original Data" }];
      const mockData2 = [{ id: 1, name: "Focused Data" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      const { result } = renderHook(() =>
        useApiQuery(["users-focus"], "/api/users", undefined, {
          refetchOnWindowFocus: true,
          staleTime: 0, // Dados sempre stale para forçar refetch
        }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData1);
      });

      // Simula focus na janela
      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it("should not refetch on window focus when disabled", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      renderHook(() =>
        useApiQuery(["users-no-focus"], "/api/users", undefined, {
          refetchOnWindowFocus: false,
        }),
      );

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });

      // Simula focus na janela
      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      // Não deve fazer nova requisição
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });
  });

  describe("Callbacks", () => {
    it("should call onSuccess callback", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      const onSuccess = jest.fn();

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiQuery(["users-success"], "/api/users", undefined, { onSuccess }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should call onError callback", async () => {
      const errorMessage = "Failed to fetch users";
      const onError = jest.fn();

      mockHttpClient.get.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useApiQuery(["users-error-cb"], "/api/users", undefined, {
          onError,
          retry: false,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(onError).toHaveBeenCalledWith(errorMessage);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should call callbacks on refetch", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      const onSuccess = jest.fn();

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiQuery(["users-refetch-cb"], "/api/users", undefined, {
          onSuccess,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);

      // Refetch manual
      await act(async () => {
        await result.current.refetch();
      });

      expect(onSuccess).toHaveBeenCalledTimes(2);
    });
  });

  describe("Loading States", () => {
    it("should track isFetching separately from loading", async () => {
      const mockData1 = [{ id: 1, name: "Cached Data" }];
      const mockData2 = [{ id: 1, name: "Fresh Data" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      const { result } = renderHook(() =>
        useApiQuery(["users-fetching"], "/api/users"),
      );

      // Estado inicial
      expect(result.current.loading).toBe(true);
      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.isFetching).toBe(false);
      });

      // Refetch - loading deve ser false (dados em cache), isFetching true
      act(() => {
        result.current.refetch();
      });

      expect(result.current.loading).toBe(false); // Dados já existem
      expect(result.current.isFetching).toBe(true); // Mas está fazendo fetch

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });
    });

    it("should track stale state correctly", async () => {
      const mockData = [{ id: 1, name: "Test User" }];
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiQuery(["users-stale-state"], "/api/users", undefined, {
          staleTime: 100,
        }),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Dados devem estar fresh inicialmente
      expect(result.current.isStale).toBe(false);

      // Espera dados ficarem stale
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(result.current.isStale).toBe(true);
    });
  });

  describe("Request Cancellation", () => {
    it("should cancel previous request when component unmounts", async () => {
      mockHttpClient.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      const { unmount } = renderHook(() =>
        useApiQuery(["users-cancel"], "/api/users"),
      );

      unmount();

      expect(mockAbort).toHaveBeenCalled();
    });

    it("should cancel previous request when new request is made", async () => {
      const mockData1 = [{ id: 1, name: "Data 1" }];
      const mockData2 = [{ id: 2, name: "Data 2" }];

      mockHttpClient.get
        .mockImplementationOnce(() => new Promise(() => {})) // Never resolves
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      let url = "/api/users/1";
      const { result, rerender } = renderHook(() =>
        useApiQuery(["users-cancel-new"], url),
      );

      // Muda URL para forçar nova requisição
      url = "/api/users/2";
      rerender();

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData2);
      });

      expect(mockAbort).toHaveBeenCalled();
    });
  });
});
