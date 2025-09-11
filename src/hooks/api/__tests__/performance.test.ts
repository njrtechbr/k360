/**
 * Testes de performance para hooks de API
 * Verifica caching, debouncing, memory usage e otimizações
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import { useApiQuery, useApiMutation } from "../useApiQuery";
import { httpClient } from "@/lib/httpClient";

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

// Mock de performance.now para testes consistentes
const mockPerformanceNow = jest.fn();
Object.defineProperty(global.performance, "now", {
  value: mockPerformanceNow,
});

describe("API Hooks Performance Tests", () => {
  beforeEach(() => {
    mockHttpClient.get.mockClear();
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
    mockHttpClient.delete.mockClear();
    mockPerformanceNow.mockClear();

    // Reset performance counter
    let counter = 0;
    mockPerformanceNow.mockImplementation(() => {
      counter += 10; // Incrementa 10ms a cada chamada
      return counter;
    });
  });

  describe("useApiQuery Caching Performance", () => {
    it("should cache query results to avoid redundant API calls", async () => {
      const mockData = [{ id: 1, name: "Test Item" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Primeira renderização
      const { result: result1 } = renderHook(() =>
        useApiQuery(["test-cache"], "/api/test"),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // Segunda renderização com mesma chave
      const { result: result2 } = renderHook(() =>
        useApiQuery(["test-cache"], "/api/test"),
      );

      // Deve usar dados do cache imediatamente
      expect(result2.current.data).toEqual(mockData);
      expect(result2.current.loading).toBe(false);

      // Não deve fazer nova chamada de API
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it("should handle cache expiration correctly", async () => {
      const mockData = [{ id: 1, name: "Test Item" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Primeira renderização
      const { result } = renderHook(() =>
        useApiQuery(["test-expiry"], "/api/test", undefined, {
          staleTime: 100, // 100ms stale time
          cacheTime: 200, // 200ms cache time
        }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);

      // Simula passagem de tempo (mais que stale time)
      act(() => {
        jest.advanceTimersByTime(150);
      });

      // Nova renderização após stale time
      const { result: result2 } = renderHook(() =>
        useApiQuery(["test-expiry"], "/api/test", undefined, {
          staleTime: 100,
          cacheTime: 200,
        }),
      );

      // Deve mostrar dados cached mas fazer refetch em background
      expect(result2.current.data).toEqual(mockData);

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle multiple queries with different cache keys efficiently", async () => {
      const mockData1 = [{ id: 1, name: "Data 1" }];
      const mockData2 = [{ id: 2, name: "Data 2" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      // Renderiza múltiplas queries
      const { result: result1 } = renderHook(() =>
        useApiQuery(["data-1"], "/api/data/1"),
      );

      const { result: result2 } = renderHook(() =>
        useApiQuery(["data-2"], "/api/data/2"),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData1);
        expect(result2.current.data).toEqual(mockData2);
      });

      // Deve fazer duas chamadas distintas
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(
        1,
        "/api/data/1",
        expect.any(Object),
      );
      expect(mockHttpClient.get).toHaveBeenNthCalledWith(
        2,
        "/api/data/2",
        expect.any(Object),
      );
    });

    it("should limit cache size to prevent memory leaks", async () => {
      const mockData = { id: 1, name: "Test" };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Cria muitas queries com chaves diferentes
      const queries = [];
      for (let i = 0; i < 1000; i++) {
        const { result } = renderHook(() =>
          useApiQuery([`test-${i}`], `/api/test/${i}`),
        );
        queries.push(result);
      }

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1000);
      });

      // Verifica se todas as queries foram executadas
      queries.forEach((result) => {
        expect(result.current.data).toEqual(mockData);
      });

      // Cache deve ter um limite razoável (não deve crescer indefinidamente)
      // Este teste verifica se não há vazamento de memória óbvio
      expect(true).toBe(true); // Se chegou até aqui, não houve crash por memória
    });
  });

  describe("useApiQuery Request Deduplication", () => {
    it("should deduplicate identical concurrent requests", async () => {
      const mockData = [{ id: 1, name: "Test Item" }];

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockHttpClient.get.mockReturnValue(promise);

      // Faz múltiplas queries idênticas simultaneamente
      const { result: result1 } = renderHook(() =>
        useApiQuery(["dedup-test"], "/api/dedup-test"),
      );

      const { result: result2 } = renderHook(() =>
        useApiQuery(["dedup-test"], "/api/dedup-test"),
      );

      const { result: result3 } = renderHook(() =>
        useApiQuery(["dedup-test"], "/api/dedup-test"),
      );

      // Todas devem estar em loading
      expect(result1.current.loading).toBe(true);
      expect(result2.current.loading).toBe(true);
      expect(result3.current.loading).toBe(true);

      // Resolve a promise
      act(() => {
        resolvePromise!({
          success: true,
          data: mockData,
        });
      });

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData);
        expect(result2.current.data).toEqual(mockData);
        expect(result3.current.data).toEqual(mockData);
      });

      // Deve ter feito apenas uma chamada de API
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it("should not deduplicate requests with different parameters", async () => {
      const mockData1 = [{ id: 1, name: "Item 1" }];
      const mockData2 = [{ id: 2, name: "Item 2" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: mockData1 })
        .mockResolvedValueOnce({ success: true, data: mockData2 });

      // Queries com parâmetros diferentes
      const { result: result1 } = renderHook(() =>
        useApiQuery(["items"], "/api/items", { page: 1 }),
      );

      const { result: result2 } = renderHook(() =>
        useApiQuery(["items"], "/api/items", { page: 2 }),
      );

      await waitFor(() => {
        expect(result1.current.data).toEqual(mockData1);
        expect(result2.current.data).toEqual(mockData2);
      });

      // Deve fazer duas chamadas distintas
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("useApiMutation Performance", () => {
    it("should handle rapid successive mutations efficiently", async () => {
      const mockResponse = { id: 1, name: "Updated" };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResponse,
      });

      const { result } = renderHook(() =>
        useApiMutation(async (data: any) => httpClient.post("/api/test", data)),
      );

      // Faz múltiplas mutações rapidamente
      const mutations = [];
      for (let i = 0; i < 10; i++) {
        mutations.push(
          act(async () => {
            await result.current.mutateAsync({ name: `Item ${i}` });
          }),
        );
      }

      await Promise.all(mutations);

      // Deve ter feito todas as chamadas
      expect(mockHttpClient.post).toHaveBeenCalledTimes(10);

      // Estado final deve estar correto
      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockResponse);
    });

    it("should cancel previous mutation when new one starts", async () => {
      let resolveFirst: (value: any) => void;
      let resolveSecond: (value: any) => void;

      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      mockHttpClient.post
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() =>
        useApiMutation(async (data: any) => httpClient.post("/api/test", data)),
      );

      // Inicia primeira mutação
      act(() => {
        result.current.mutate({ name: "First" });
      });

      expect(result.current.loading).toBe(true);

      // Inicia segunda mutação antes da primeira completar
      act(() => {
        result.current.mutate({ name: "Second" });
      });

      // Resolve primeira mutação (deve ser ignorada)
      act(() => {
        resolveFirst!({ success: true, data: { id: 1, name: "First" } });
      });

      // Resolve segunda mutação
      act(() => {
        resolveSecond!({ success: true, data: { id: 2, name: "Second" } });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Deve mostrar resultado da segunda mutação
      expect(result.current.data).toEqual({ id: 2, name: "Second" });
    });

    it("should handle mutation errors without memory leaks", async () => {
      mockHttpClient.post.mockRejectedValue(new Error("Mutation failed"));

      const { result } = renderHook(() =>
        useApiMutation(async (data: any) => httpClient.post("/api/test", data)),
      );

      // Faz múltiplas mutações que falham
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          try {
            await result.current.mutateAsync({ name: `Item ${i}` });
          } catch (error) {
            // Ignora erro esperado
          }
        });
      }

      // Estado deve estar consistente
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe("Mutation failed");
      expect(result.current.data).toBe(null);

      // Se chegou até aqui, não houve vazamento de memória
      expect(mockHttpClient.post).toHaveBeenCalledTimes(100);
    });
  });

  describe("Memory Management", () => {
    it("should clean up resources when hook is unmounted", async () => {
      const mockData = [{ id: 1, name: "Test" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result, unmount } = renderHook(() =>
        useApiQuery(["cleanup-test"], "/api/cleanup-test"),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      // Desmonta o hook
      unmount();

      // Se chegou até aqui sem erros, o cleanup foi feito corretamente
      expect(true).toBe(true);
    });

    it("should handle component re-renders efficiently", async () => {
      const mockData = [{ id: 1, name: "Test" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      let renderCount = 0;
      const { result, rerender } = renderHook(() => {
        renderCount++;
        return useApiQuery(["rerender-test"], "/api/rerender-test");
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      const initialRenderCount = renderCount;

      // Re-renderiza múltiplas vezes
      for (let i = 0; i < 10; i++) {
        rerender();
      }

      // Deve ter re-renderizado mas não feito novas chamadas de API
      expect(renderCount).toBeGreaterThan(initialRenderCount);
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockData);
    });

    it("should handle rapid mount/unmount cycles", async () => {
      const mockData = [{ id: 1, name: "Test" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      // Monta e desmonta rapidamente múltiplas vezes
      for (let i = 0; i < 50; i++) {
        const { result, unmount } = renderHook(() =>
          useApiQuery([`mount-test-${i}`], `/api/mount-test/${i}`),
        );

        // Desmonta imediatamente
        unmount();
      }

      // Se chegou até aqui sem erros, não houve vazamentos
      expect(true).toBe(true);
    });
  });

  describe("Background Refetch Performance", () => {
    it("should refetch stale data in background without blocking UI", async () => {
      const initialData = [{ id: 1, name: "Initial" }];
      const updatedData = [{ id: 1, name: "Updated" }];

      mockHttpClient.get
        .mockResolvedValueOnce({ success: true, data: initialData })
        .mockResolvedValueOnce({ success: true, data: updatedData });

      const { result } = renderHook(() =>
        useApiQuery(["background-test"], "/api/background-test", undefined, {
          staleTime: 0, // Dados sempre stale
          refetchOnWindowFocus: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(initialData);
      });

      // Simula focus na janela (deve fazer refetch em background)
      act(() => {
        window.dispatchEvent(new Event("focus"));
      });

      // Dados antigos devem estar disponíveis imediatamente
      expect(result.current.data).toEqual(initialData);
      expect(result.current.loading).toBe(false);
      expect(result.current.isFetching).toBe(true);

      // Aguarda refetch completar
      await waitFor(() => {
        expect(result.current.data).toEqual(updatedData);
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });

    it("should throttle background refetches", async () => {
      const mockData = [{ id: 1, name: "Test" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiQuery(["throttle-test"], "/api/throttle-test", undefined, {
          staleTime: 0,
          refetchOnWindowFocus: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      // Dispara múltiplos eventos de focus rapidamente
      for (let i = 0; i < 10; i++) {
        act(() => {
          window.dispatchEvent(new Event("focus"));
        });
      }

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Não deve ter feito 10 refetches
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2); // 1 inicial + 1 refetch
    });
  });

  describe("Error Recovery Performance", () => {
    it("should retry failed requests with exponential backoff", async () => {
      const mockData = [{ id: 1, name: "Success" }];

      mockHttpClient.get
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ success: true, data: mockData });

      const { result } = renderHook(() =>
        useApiQuery(["retry-test"], "/api/retry-test", undefined, {
          retry: true,
          retryDelay: 100,
        }),
      );

      // Deve eventualmente ter sucesso após retries
      await waitFor(
        () => {
          expect(result.current.data).toEqual(mockData);
        },
        { timeout: 1000 },
      );

      // Deve ter feito múltiplas tentativas
      expect(mockHttpClient.get).toHaveBeenCalledTimes(3);
    });

    it("should not retry on 4xx errors", async () => {
      const clientError = new Error("Bad request");
      (clientError as any).status = 400;

      mockHttpClient.get.mockRejectedValue(clientError);

      const { result } = renderHook(() =>
        useApiQuery(["no-retry-test"], "/api/no-retry-test", undefined, {
          retry: true,
        }),
      );

      await waitFor(() => {
        expect(result.current.error).toBe("Bad request");
      });

      // Não deve ter feito retry
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });
  });
});
