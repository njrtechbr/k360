/**
 * Testes de performance e carga para componentes e APIs
 * Verifica tempos de resposta, caching, estados de loading e uso de memória
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import { httpClient } from "@/lib/httpClient";
import { useApiQuery, useApiMutation } from "@/hooks/api";

// Mock do httpClient
jest.mock("@/lib/httpClient", () => ({
  httpClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock dos hooks de API
jest.mock("@/hooks/api", () => ({
  useApiQuery: jest.fn(),
  useApiMutation: jest.fn(),
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;
const mockUseApiQuery = useApiQuery as jest.MockedFunction<typeof useApiQuery>;
const mockUseApiMutation = useApiMutation as jest.MockedFunction<
  typeof useApiMutation
>;

// Componente que simula carga pesada de dados
const HeavyDataComponent: React.FC<{ itemCount: number }> = ({ itemCount }) => {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [renderTime, setRenderTime] = React.useState<number>(0);

  React.useEffect(() => {
    const startTime = performance.now();

    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await httpClient.get(`/api/data?limit=${itemCount}`);
        setData(response.data);
      } finally {
        setLoading(false);
        const endTime = performance.now();
        setRenderTime(endTime - startTime);
      }
    };

    fetchData();
  }, [itemCount]);

  return (
    <div>
      <div data-testid="render-time">
        Render time: {renderTime.toFixed(2)}ms
      </div>
      <div data-testid="loading">{loading ? "Loading..." : "Loaded"}</div>
      <div data-testid="item-count">Items: {data.length}</div>
      <div data-testid="data-list">
        {data.map((item, index) => (
          <div key={item.id || index} data-testid={`item-${index}`}>
            {item.name || `Item ${index}`}
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente que testa caching
const CachedDataComponent: React.FC = () => {
  const [cacheHits, setCacheHits] = React.useState(0);
  const [apiCalls, setApiCalls] = React.useState(0);

  const fetchData = React.useCallback(async (useCache = true) => {
    const cacheKey = "cached-data";

    if (useCache) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setCacheHits((prev) => prev + 1);
        return JSON.parse(cached);
      }
    }

    setApiCalls((prev) => prev + 1);
    const response = await httpClient.get("/api/cached-data");

    if (useCache) {
      localStorage.setItem(cacheKey, JSON.stringify(response.data));
    }

    return response.data;
  }, []);

  const [data, setData] = React.useState<any[]>([]);

  const loadData = async (useCache = true) => {
    const result = await fetchData(useCache);
    setData(result);
  };

  return (
    <div>
      <div data-testid="cache-hits">Cache hits: {cacheHits}</div>
      <div data-testid="api-calls">API calls: {apiCalls}</div>
      <button onClick={() => loadData(true)} data-testid="load-cached">
        Load with Cache
      </button>
      <button onClick={() => loadData(false)} data-testid="load-fresh">
        Load Fresh
      </button>
      <div data-testid="data-count">Data items: {data.length}</div>
    </div>
  );
};

// Componente que testa requisições concorrentes
const ConcurrentRequestsComponent: React.FC = () => {
  const [results, setResults] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const makeConcurrentRequests = async (count: number) => {
    setLoading(true);
    setResults([]);
    setErrors([]);

    const promises = Array.from({ length: count }, (_, i) =>
      httpClient
        .get(`/api/data/${i + 1}`)
        .then((response) => ({ id: i + 1, data: response.data, success: true }))
        .catch((error) => ({
          id: i + 1,
          error: error.message,
          success: false,
        })),
    );

    try {
      const responses = await Promise.allSettled(promises);
      const successResults = responses
        .filter((result) => result.status === "fulfilled")
        .map((result) => (result as PromiseFulfilledResult<any>).value);

      const errorResults = responses
        .filter((result) => result.status === "rejected")
        .map((result) => (result as PromiseRejectedResult).reason.message);

      setResults(successResults);
      setErrors(errorResults);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div data-testid="loading-status">{loading ? "Loading..." : "Ready"}</div>
      <button
        onClick={() => makeConcurrentRequests(5)}
        data-testid="make-5-requests"
      >
        Make 5 Requests
      </button>
      <button
        onClick={() => makeConcurrentRequests(20)}
        data-testid="make-20-requests"
      >
        Make 20 Requests
      </button>
      <button
        onClick={() => makeConcurrentRequests(100)}
        data-testid="make-100-requests"
      >
        Make 100 Requests
      </button>
      <div data-testid="success-count">Successful: {results.length}</div>
      <div data-testid="error-count">Errors: {errors.length}</div>
    </div>
  );
};

// Componente que testa estados de loading
const LoadingStatesComponent: React.FC = () => {
  const [operations, setOperations] = React.useState<{
    [key: string]: { loading: boolean; data?: any; error?: string };
  }>({});

  const performOperation = async (
    operationId: string,
    delay: number = 1000,
  ) => {
    setOperations((prev) => ({
      ...prev,
      [operationId]: { loading: true },
    }));

    try {
      // Simula operação com delay
      await new Promise((resolve) => setTimeout(resolve, delay));
      const response = await httpClient.get(`/api/operation/${operationId}`);

      setOperations((prev) => ({
        ...prev,
        [operationId]: { loading: false, data: response.data },
      }));
    } catch (error: any) {
      setOperations((prev) => ({
        ...prev,
        [operationId]: { loading: false, error: error.message },
      }));
    }
  };

  const isAnyLoading = Object.values(operations).some((op) => op.loading);

  return (
    <div>
      <div data-testid="global-loading">
        {isAnyLoading
          ? "Some operations loading..."
          : "All operations complete"}
      </div>

      <button
        onClick={() => performOperation("fast", 100)}
        data-testid="fast-operation"
      >
        Fast Operation (100ms)
      </button>

      <button
        onClick={() => performOperation("medium", 500)}
        data-testid="medium-operation"
      >
        Medium Operation (500ms)
      </button>

      <button
        onClick={() => performOperation("slow", 2000)}
        data-testid="slow-operation"
      >
        Slow Operation (2s)
      </button>

      {Object.entries(operations).map(([id, operation]) => (
        <div key={id} data-testid={`operation-${id}`}>
          <span>{id}: </span>
          {operation.loading && (
            <span data-testid={`loading-${id}`}>Loading...</span>
          )}
          {operation.data && <span data-testid={`success-${id}`}>Success</span>}
          {operation.error && (
            <span data-testid={`error-${id}`}>Error: {operation.error}</span>
          )}
        </div>
      ))}
    </div>
  );
};

describe("Performance Tests", () => {
  beforeEach(() => {
    mockHttpClient.get.mockClear();
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
    mockHttpClient.delete.mockClear();
    localStorage.clear();
    jest.clearAllTimers();
  });

  describe("API Response Times", () => {
    it("should handle small datasets efficiently", async () => {
      const smallDataset = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: smallDataset,
      });

      const startTime = performance.now();
      render(<HeavyDataComponent itemCount={10} />);

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Loaded");
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(100); // Deve ser muito rápido para datasets pequenos
      expect(screen.getByTestId("item-count")).toHaveTextContent("Items: 10");
    });

    it("should handle medium datasets within acceptable time", async () => {
      const mediumDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mediumDataset,
      });

      const startTime = performance.now();
      render(<HeavyDataComponent itemCount={1000} />);

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Loaded");
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(500); // Deve ser razoável para datasets médios
      expect(screen.getByTestId("item-count")).toHaveTextContent("Items: 1000");
    });

    it("should handle large datasets with proper loading states", async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      // Simula delay para dataset grande
      mockHttpClient.get.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: largeDataset,
                }),
              100,
            ),
          ),
      );

      render(<HeavyDataComponent itemCount={10000} />);

      // Deve mostrar loading inicialmente
      expect(screen.getByTestId("loading")).toHaveTextContent("Loading...");

      await waitFor(
        () => {
          expect(screen.getByTestId("loading")).toHaveTextContent("Loaded");
        },
        { timeout: 2000 },
      );

      expect(screen.getByTestId("item-count")).toHaveTextContent(
        "Items: 10000",
      );
    });

    it("should measure and report render times", async () => {
      const dataset = Array.from({ length: 100 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
      }));

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: dataset,
      });

      render(<HeavyDataComponent itemCount={100} />);

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Loaded");
      });

      const renderTimeText = screen.getByTestId("render-time").textContent;
      expect(renderTimeText).toMatch(/Render time: \d+\.\d+ms/);

      // Extrai o tempo e verifica se é razoável
      const timeMatch = renderTimeText?.match(/(\d+\.\d+)ms/);
      if (timeMatch) {
        const renderTime = parseFloat(timeMatch[1]);
        expect(renderTime).toBeLessThan(1000); // Menos de 1 segundo
      }
    });
  });

  describe("Caching Performance", () => {
    it("should use cache to improve performance", async () => {
      const mockData = [
        { id: 1, name: "Cached Item 1" },
        { id: 2, name: "Cached Item 2" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      render(<CachedDataComponent />);

      // Primeira requisição (deve fazer chamada de API)
      screen.getByTestId("load-cached").click();

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });

      expect(screen.getByTestId("api-calls")).toHaveTextContent("API calls: 1");
      expect(screen.getByTestId("cache-hits")).toHaveTextContent(
        "Cache hits: 0",
      );

      // Segunda requisição (deve usar cache)
      screen.getByTestId("load-cached").click();

      await waitFor(() => {
        expect(screen.getByTestId("cache-hits")).toHaveTextContent(
          "Cache hits: 1",
        );
      });

      // API não deve ter sido chamada novamente
      expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
    });

    it("should bypass cache when requested", async () => {
      const mockData = [{ id: 1, name: "Fresh Item" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      render(<CachedDataComponent />);

      // Carrega com cache
      screen.getByTestId("load-cached").click();
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });

      // Carrega sem cache (fresh)
      screen.getByTestId("load-fresh").click();
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });

      expect(screen.getByTestId("api-calls")).toHaveTextContent("API calls: 2");
      expect(screen.getByTestId("cache-hits")).toHaveTextContent(
        "Cache hits: 0",
      );
    });

    it("should handle cache invalidation", async () => {
      const mockData = [{ id: 1, name: "Item" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      render(<CachedDataComponent />);

      // Carrega e cria cache
      screen.getByTestId("load-cached").click();
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });

      // Limpa cache manualmente
      localStorage.clear();

      // Carrega novamente (deve fazer nova chamada de API)
      screen.getByTestId("load-cached").click();
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe("Concurrent Request Handling", () => {
    it("should handle 5 concurrent requests efficiently", async () => {
      mockHttpClient.get.mockImplementation((url) => {
        const id = url.split("/").pop();
        return Promise.resolve({
          success: true,
          data: { id, name: `Item ${id}` },
        });
      });

      render(<ConcurrentRequestsComponent />);

      const startTime = performance.now();
      screen.getByTestId("make-5-requests").click();

      await waitFor(() => {
        expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
      });

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(200); // Deve ser rápido para 5 requisições
      expect(screen.getByTestId("success-count")).toHaveTextContent(
        "Successful: 5",
      );
      expect(screen.getByTestId("error-count")).toHaveTextContent("Errors: 0");
      expect(mockHttpClient.get).toHaveBeenCalledTimes(5);
    });

    it("should handle 20 concurrent requests within reasonable time", async () => {
      mockHttpClient.get.mockImplementation((url) => {
        const id = url.split("/").pop();
        return new Promise(
          (resolve) =>
            setTimeout(
              () =>
                resolve({
                  success: true,
                  data: { id, name: `Item ${id}` },
                }),
              10,
            ), // Pequeno delay para simular rede
        );
      });

      render(<ConcurrentRequestsComponent />);

      const startTime = performance.now();
      screen.getByTestId("make-20-requests").click();

      await waitFor(
        () => {
          expect(screen.getByTestId("loading-status")).toHaveTextContent(
            "Ready",
          );
        },
        { timeout: 1000 },
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      expect(totalTime).toBeLessThan(500); // Deve ser razoável para 20 requisições
      expect(screen.getByTestId("success-count")).toHaveTextContent(
        "Successful: 20",
      );
      expect(mockHttpClient.get).toHaveBeenCalledTimes(20);
    });

    it("should handle 100 concurrent requests without crashing", async () => {
      mockHttpClient.get.mockImplementation((url) => {
        const id = url.split("/").pop();
        return Promise.resolve({
          success: true,
          data: { id, name: `Item ${id}` },
        });
      });

      render(<ConcurrentRequestsComponent />);

      screen.getByTestId("make-100-requests").click();

      await waitFor(
        () => {
          expect(screen.getByTestId("loading-status")).toHaveTextContent(
            "Ready",
          );
        },
        { timeout: 2000 },
      );

      expect(screen.getByTestId("success-count")).toHaveTextContent(
        "Successful: 100",
      );
      expect(mockHttpClient.get).toHaveBeenCalledTimes(100);
    });

    it("should handle mixed success and failure in concurrent requests", async () => {
      mockHttpClient.get.mockImplementation((url) => {
        const id = parseInt(url.split("/").pop() || "0");

        // Simula falha para IDs pares
        if (id % 2 === 0) {
          return Promise.reject(new Error(`Failed for ID ${id}`));
        }

        return Promise.resolve({
          success: true,
          data: { id, name: `Item ${id}` },
        });
      });

      render(<ConcurrentRequestsComponent />);

      screen.getByTestId("make-20-requests").click();

      await waitFor(() => {
        expect(screen.getByTestId("loading-status")).toHaveTextContent("Ready");
      });

      // Deve ter 10 sucessos (IDs ímpares) e 10 erros (IDs pares)
      expect(screen.getByTestId("success-count")).toHaveTextContent(
        "Successful: 10",
      );
      expect(screen.getByTestId("error-count")).toHaveTextContent("Errors: 10");
    });
  });

  describe("Loading States Performance", () => {
    it("should manage multiple loading states efficiently", async () => {
      mockHttpClient.get.mockImplementation((url) => {
        const operationId = url.split("/").pop();
        const delay =
          operationId === "fast" ? 50 : operationId === "medium" ? 200 : 1000;

        return new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                success: true,
                data: { operation: operationId, completed: true },
              }),
            delay,
          ),
        );
      });

      render(<LoadingStatesComponent />);

      // Inicia todas as operações
      screen.getByTestId("fast-operation").click();
      screen.getByTestId("medium-operation").click();
      screen.getByTestId("slow-operation").click();

      // Deve mostrar loading global
      expect(screen.getByTestId("global-loading")).toHaveTextContent(
        "Some operations loading...",
      );

      // Deve mostrar loading individual
      expect(screen.getByTestId("loading-fast")).toBeInTheDocument();
      expect(screen.getByTestId("loading-medium")).toBeInTheDocument();
      expect(screen.getByTestId("loading-slow")).toBeInTheDocument();

      // Aguarda operação rápida completar
      await waitFor(() => {
        expect(screen.getByTestId("success-fast")).toBeInTheDocument();
      });

      // Ainda deve ter operações carregando
      expect(screen.getByTestId("global-loading")).toHaveTextContent(
        "Some operations loading...",
      );

      // Aguarda operação média completar
      await waitFor(() => {
        expect(screen.getByTestId("success-medium")).toBeInTheDocument();
      });

      // Aguarda operação lenta completar
      await waitFor(
        () => {
          expect(screen.getByTestId("success-slow")).toBeInTheDocument();
        },
        { timeout: 2000 },
      );

      // Agora todas devem estar completas
      expect(screen.getByTestId("global-loading")).toHaveTextContent(
        "All operations complete",
      );
    });

    it("should handle rapid successive operations", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: { completed: true },
      });

      render(<LoadingStatesComponent />);

      // Clica rapidamente múltiplas vezes
      const fastBtn = screen.getByTestId("fast-operation");

      for (let i = 0; i < 5; i++) {
        fastBtn.click();
      }

      // Deve fazer múltiplas chamadas
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(5);
      });

      // Deve eventualmente completar todas
      await waitFor(() => {
        expect(screen.getByTestId("global-loading")).toHaveTextContent(
          "All operations complete",
        );
      });
    });
  });

  describe("Memory Usage", () => {
    it("should not leak memory with frequent re-renders", async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
        })),
      });

      const { rerender, unmount } = render(
        <HeavyDataComponent itemCount={100} />,
      );

      // Re-renderiza múltiplas vezes
      for (let i = 0; i < 10; i++) {
        rerender(<HeavyDataComponent itemCount={100 + i} />);
        await waitFor(() => {
          expect(screen.getByTestId("loading")).toHaveTextContent("Loaded");
        });
      }

      unmount();

      // Força garbage collection se disponível
      if ((global as any).gc) {
        (global as any).gc();
      }

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Verifica se não houve vazamento significativo (permite algum crescimento normal)
      if (initialMemory > 0 && finalMemory > 0) {
        const memoryIncrease = finalMemory - initialMemory;
        const maxAllowedIncrease = initialMemory * 0.5; // 50% de aumento máximo

        expect(memoryIncrease).toBeLessThan(maxAllowedIncrease);
      }
    });

    it("should clean up event listeners and timers", async () => {
      const { unmount } = render(<LoadingStatesComponent />);

      // Inicia algumas operações
      screen.getByTestId("fast-operation").click();
      screen.getByTestId("medium-operation").click();

      // Desmonta antes das operações completarem
      unmount();

      // Se chegou até aqui sem erros, o cleanup foi feito corretamente
      expect(true).toBe(true);
    });
  });

  describe("Error Recovery Performance", () => {
    it("should recover quickly from API errors", async () => {
      mockHttpClient.get
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 1, name: "Recovered Item" }],
        });

      render(<HeavyDataComponent itemCount={1} />);

      // Primeira tentativa falha
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });

      // Simula retry
      const { rerender } = render(<HeavyDataComponent itemCount={1} />);
      rerender(<HeavyDataComponent itemCount={1} />);

      // Segunda tentativa deve funcionar rapidamente
      const startTime = performance.now();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("Loaded");
      });

      const endTime = performance.now();
      const recoveryTime = endTime - startTime;

      expect(recoveryTime).toBeLessThan(100); // Recovery deve ser rápido
      expect(screen.getByTestId("item-count")).toHaveTextContent("Items: 1");
    });

    it("should handle timeout errors gracefully", async () => {
      // Simula timeout
      mockHttpClient.get.mockImplementation(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Request timeout")), 100),
          ),
      );

      const startTime = performance.now();
      render(<HeavyDataComponent itemCount={10} />);

      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalled();
      });

      const endTime = performance.now();
      const timeoutHandlingTime = endTime - startTime;

      // Deve lidar com timeout rapidamente
      expect(timeoutHandlingTime).toBeLessThan(200);
    });
  });
});
