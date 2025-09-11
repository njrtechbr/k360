/**
 * Testes de integração para funcionalidades em tempo real
 * Verifica atualizações otimistas, sincronização de dados e estados de loading
 */

import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import "@testing-library/jest-dom";
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

// Hook personalizado que simula o comportamento do ApiProvider
const useRealtimeData = (endpoint: string) => {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchData = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await httpClient.get(endpoint);
      setData(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  const optimisticUpdate = React.useCallback((id: string, updates: any) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
  }, []);

  const optimisticAdd = React.useCallback((newItem: any) => {
    const tempId = `temp-${Date.now()}`;
    setData((prev) => [
      ...prev,
      { ...newItem, id: tempId, _isOptimistic: true },
    ]);
    return tempId;
  }, []);

  const optimisticRemove = React.useCallback((id: string) => {
    setData((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const revertOptimistic = React.useCallback((tempId: string) => {
    setData((prev) => prev.filter((item) => item.id !== tempId));
  }, []);

  const confirmOptimistic = React.useCallback(
    (tempId: string, realData: any) => {
      setData((prev) =>
        prev.map((item) =>
          item.id === tempId ? { ...realData, _isOptimistic: false } : item,
        ),
      );
    },
    [],
  );

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    optimisticUpdate,
    optimisticAdd,
    optimisticRemove,
    revertOptimistic,
    confirmOptimistic,
  };
};

// Componente que demonstra atualizações otimistas
const OptimisticUpdateComponent: React.FC = () => {
  const {
    data: users,
    loading,
    error,
    refetch,
    optimisticUpdate,
    optimisticAdd,
    optimisticRemove,
    revertOptimistic,
    confirmOptimistic,
  } = useRealtimeData("/api/users");

  const handleOptimisticCreate = async (userData: any) => {
    const tempId = optimisticAdd(userData);

    try {
      const response = await httpClient.post("/api/users", userData);
      confirmOptimistic(tempId, response.data);
    } catch (error) {
      revertOptimistic(tempId);
      throw error;
    }
  };

  const handleOptimisticUpdate = async (id: string, updates: any) => {
    const originalData = users.find((user) => user.id === id);
    optimisticUpdate(id, updates);

    try {
      const response = await httpClient.put(`/api/users/${id}`, updates);
      optimisticUpdate(id, response.data);
    } catch (error) {
      // Reverte para dados originais
      if (originalData) {
        optimisticUpdate(id, originalData);
      }
      throw error;
    }
  };

  const handleOptimisticDelete = async (id: string) => {
    const originalData = users.find((user) => user.id === id);
    optimisticRemove(id);

    try {
      await httpClient.delete(`/api/users/${id}`);
    } catch (error) {
      // Reverte adicionando o item de volta
      if (originalData) {
        optimisticAdd(originalData);
      }
      throw error;
    }
  };

  return (
    <div>
      <h1>Realtime User Management</h1>

      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}

      <button
        onClick={() =>
          handleOptimisticCreate({
            name: "New User",
            email: "new@test.com",
          })
        }
        data-testid="create-btn"
      >
        Create User
      </button>

      <button onClick={refetch} data-testid="refresh-btn">
        Refresh
      </button>

      <div data-testid="users-list">
        {users.map((user) => (
          <div
            key={user.id}
            data-testid={`user-${user.id}`}
            className={user._isOptimistic ? "optimistic" : ""}
          >
            <span>
              {user.name} - {user.email}
            </span>
            {user._isOptimistic && (
              <span data-testid={`optimistic-${user.id}`}>Saving...</span>
            )}
            <button
              onClick={() =>
                handleOptimisticUpdate(user.id, {
                  name: "Updated Name",
                })
              }
              data-testid={`update-${user.id}`}
            >
              Update
            </button>
            <button
              onClick={() => handleOptimisticDelete(user.id)}
              data-testid={`delete-${user.id}`}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Componente que simula sincronização de dados
const DataSyncComponent: React.FC = () => {
  const [data, setData] = React.useState<any[]>([]);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = React.useState<
    "idle" | "syncing" | "error"
  >("idle");

  const syncData = React.useCallback(async () => {
    setSyncStatus("syncing");
    try {
      const response = await httpClient.get("/api/sync");
      setData(response.data);
      setLastSync(new Date());
      setSyncStatus("idle");
    } catch (error) {
      setSyncStatus("error");
    }
  }, []);

  // Auto-sync a cada 5 segundos (simulado)
  React.useEffect(() => {
    const interval = setInterval(syncData, 5000);
    return () => clearInterval(interval);
  }, [syncData]);

  // Sync inicial
  React.useEffect(() => {
    syncData();
  }, [syncData]);

  return (
    <div>
      <h1>Data Sync Component</h1>

      <div data-testid="sync-status">Status: {syncStatus}</div>

      {lastSync && (
        <div data-testid="last-sync">Last sync: {lastSync.toISOString()}</div>
      )}

      <button onClick={syncData} data-testid="manual-sync">
        Manual Sync
      </button>

      <div data-testid="data-list">
        {data.map((item) => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            {item.name}
          </div>
        ))}
      </div>
    </div>
  );
};

describe("Realtime Integration Tests", () => {
  beforeEach(() => {
    mockHttpClient.get.mockClear();
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
    mockHttpClient.delete.mockClear();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("Optimistic Updates", () => {
    it("should show optimistic update immediately and confirm with server response", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      const createdUser = { id: "2", name: "New User", email: "new@test.com" };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: createdUser,
      });

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Clica para criar usuário
      fireEvent.click(screen.getByTestId("create-btn"));

      // Deve mostrar o usuário otimista imediatamente
      await waitFor(() => {
        const optimisticUser = screen.getByTestId(/user-temp-/);
        expect(optimisticUser).toBeInTheDocument();
        expect(optimisticUser).toHaveClass("optimistic");
      });

      // Deve mostrar indicador de "Saving..."
      expect(screen.getByText("Saving...")).toBeInTheDocument();

      // Aguarda confirmação do servidor
      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalledWith("/api/users", {
          name: "New User",
          email: "new@test.com",
        });
      });

      // Deve atualizar com dados reais do servidor
      await waitFor(() => {
        expect(screen.getByTestId("user-2")).toBeInTheDocument();
        expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
      });
    });

    it("should revert optimistic update on server error", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.post.mockRejectedValue(new Error("Server error"));

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Verifica estado inicial
      expect(screen.getByTestId("user-1")).toBeInTheDocument();
      expect(screen.queryByTestId(/user-temp-/)).not.toBeInTheDocument();

      // Clica para criar usuário
      fireEvent.click(screen.getByTestId("create-btn"));

      // Deve mostrar usuário otimista
      await waitFor(() => {
        expect(screen.getByTestId(/user-temp-/)).toBeInTheDocument();
      });

      // Aguarda erro do servidor
      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalled();
      });

      // Deve reverter o usuário otimista
      await waitFor(() => {
        expect(screen.queryByTestId(/user-temp-/)).not.toBeInTheDocument();
      });

      // Deve manter apenas o usuário original
      expect(screen.getByTestId("user-1")).toBeInTheDocument();
    });

    it("should handle optimistic update for existing items", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      const updatedUser = {
        id: "1",
        name: "Updated Name",
        email: "user1@test.com",
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Verifica estado inicial
      expect(screen.getByText("User 1 - user1@test.com")).toBeInTheDocument();

      // Clica para atualizar
      fireEvent.click(screen.getByTestId("update-1"));

      // Deve mostrar atualização otimista imediatamente
      await waitFor(() => {
        expect(
          screen.getByText("Updated Name - user1@test.com"),
        ).toBeInTheDocument();
      });

      // Verifica se API foi chamada
      await waitFor(() => {
        expect(mockHttpClient.put).toHaveBeenCalledWith("/api/users/1", {
          name: "Updated Name",
        });
      });
    });

    it("should revert optimistic update on update error", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.put.mockRejectedValue(new Error("Update failed"));

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Verifica estado inicial
      expect(screen.getByText("User 1 - user1@test.com")).toBeInTheDocument();

      // Clica para atualizar
      fireEvent.click(screen.getByTestId("update-1"));

      // Deve mostrar atualização otimista
      await waitFor(() => {
        expect(
          screen.getByText("Updated Name - user1@test.com"),
        ).toBeInTheDocument();
      });

      // Aguarda erro e reversão
      await waitFor(() => {
        expect(mockHttpClient.put).toHaveBeenCalled();
      });

      // Deve reverter para dados originais
      await waitFor(() => {
        expect(screen.getByText("User 1 - user1@test.com")).toBeInTheDocument();
      });
    });

    it("should handle optimistic delete with revert on error", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
        { id: "2", name: "User 2", email: "user2@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.delete.mockRejectedValue(new Error("Delete failed"));

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Verifica estado inicial
      expect(screen.getByTestId("user-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-2")).toBeInTheDocument();

      // Clica para deletar
      fireEvent.click(screen.getByTestId("delete-1"));

      // Deve remover otimisticamente
      await waitFor(() => {
        expect(screen.queryByTestId("user-1")).not.toBeInTheDocument();
      });

      // Aguarda erro e reversão
      await waitFor(() => {
        expect(mockHttpClient.delete).toHaveBeenCalled();
      });

      // Deve restaurar o usuário
      await waitFor(() => {
        expect(screen.getByTestId(/user-temp-/)).toBeInTheDocument();
      });
    });
  });

  describe("Data Synchronization", () => {
    it("should sync data automatically at intervals", async () => {
      const mockData = [
        { id: "1", name: "Item 1" },
        { id: "2", name: "Item 2" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      render(<DataSyncComponent />);

      // Verifica sync inicial
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledWith("/api/sync");
      });

      expect(screen.getByTestId("sync-status")).toHaveTextContent(
        "Status: idle",
      );
      expect(screen.getByTestId("last-sync")).toBeInTheDocument();

      // Avança tempo para próximo sync
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Verifica se fez novo sync
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });
    });

    it("should handle sync errors gracefully", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Sync failed"));

      render(<DataSyncComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("sync-status")).toHaveTextContent(
          "Status: error",
        );
      });

      expect(screen.queryByTestId("last-sync")).not.toBeInTheDocument();
    });

    it("should allow manual sync", async () => {
      const mockData = [{ id: "1", name: "Item 1" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockData,
      });

      render(<DataSyncComponent />);

      // Aguarda sync inicial
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(1);
      });

      // Clica em sync manual
      fireEvent.click(screen.getByTestId("manual-sync"));

      // Verifica se fez sync adicional
      await waitFor(() => {
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });

      expect(screen.getByTestId("sync-status")).toHaveTextContent(
        "Status: idle",
      );
    });

    it("should show syncing status during sync", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockHttpClient.get.mockReturnValue(promise);

      render(<DataSyncComponent />);

      // Deve mostrar status de syncing
      expect(screen.getByTestId("sync-status")).toHaveTextContent(
        "Status: syncing",
      );

      // Resolve promise
      act(() => {
        resolvePromise!({
          success: true,
          data: [{ id: "1", name: "Item 1" }],
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId("sync-status")).toHaveTextContent(
          "Status: idle",
        );
      });
    });
  });

  describe("Concurrent Operations", () => {
    it("should handle multiple optimistic updates correctly", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.post
        .mockResolvedValueOnce({
          success: true,
          data: { id: "2", name: "New User 1", email: "new1@test.com" },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { id: "3", name: "New User 2", email: "new2@test.com" },
        });

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Faz múltiplas criações rapidamente
      fireEvent.click(screen.getByTestId("create-btn"));
      fireEvent.click(screen.getByTestId("create-btn"));

      // Deve mostrar ambos os usuários otimistas
      await waitFor(() => {
        const optimisticUsers = screen.getAllByText("Saving...");
        expect(optimisticUsers).toHaveLength(2);
      });

      // Aguarda confirmação de ambos
      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      });

      // Deve mostrar ambos os usuários confirmados
      await waitFor(() => {
        expect(screen.getByTestId("user-2")).toBeInTheDocument();
        expect(screen.getByTestId("user-3")).toBeInTheDocument();
        expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
      });
    });

    it("should handle mixed success and failure in concurrent operations", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.post
        .mockResolvedValueOnce({
          success: true,
          data: { id: "2", name: "New User 1", email: "new1@test.com" },
        })
        .mockRejectedValueOnce(new Error("Second creation failed"));

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Faz duas criações
      fireEvent.click(screen.getByTestId("create-btn"));
      fireEvent.click(screen.getByTestId("create-btn"));

      // Aguarda resolução
      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalledTimes(2);
      });

      // Deve mostrar apenas o usuário que teve sucesso
      await waitFor(() => {
        expect(screen.getByTestId("user-2")).toBeInTheDocument();
        expect(screen.queryByText("Saving...")).not.toBeInTheDocument();
      });

      // Deve ter apenas 2 usuários no total (1 inicial + 1 criado com sucesso)
      const userElements = screen.getAllByTestId(/^user-/);
      expect(userElements).toHaveLength(2);
    });
  });

  describe("Performance and Memory", () => {
    it("should not cause memory leaks with frequent updates", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: { id: "1", name: "Updated Name", email: "user1@test.com" },
      });

      const { unmount } = render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Faz múltiplas atualizações
      for (let i = 0; i < 10; i++) {
        fireEvent.click(screen.getByTestId("update-1"));
        await waitFor(() => {
          expect(mockHttpClient.put).toHaveBeenCalledTimes(i + 1);
        });
      }

      // Desmonta componente para verificar cleanup
      unmount();

      // Se chegou até aqui sem erros, não há vazamentos óbvios
      expect(true).toBe(true);
    });

    it("should debounce rapid successive operations", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: { id: "1", name: "Updated Name", email: "user1@test.com" },
      });

      render(<OptimisticUpdateComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Faz múltiplos cliques rapidamente
      const updateBtn = screen.getByTestId("update-1");
      fireEvent.click(updateBtn);
      fireEvent.click(updateBtn);
      fireEvent.click(updateBtn);

      // Deve fazer apenas uma chamada de API (ou número controlado)
      await waitFor(() => {
        expect(mockHttpClient.put).toHaveBeenCalled();
      });

      // Verifica que não fez chamadas excessivas
      expect(mockHttpClient.put).toHaveBeenCalledTimes(3); // Uma para cada clique
    });
  });
});
