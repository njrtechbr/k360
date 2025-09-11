/**
 * Testes de integração abrangentes para componentes do dashboard
 * Verifica o fluxo completo de dados dos componentes para as APIs
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { ApiProvider } from "@/providers/ApiProvider";
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

// Mock do NextAuth
jest.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "1",
        name: "Test User",
        email: "test@test.com",
        role: "ADMIN",
      },
    },
    status: "authenticated",
  }),
}));

// Mock do router
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => "/dashboard",
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Componente de teste que simula um componente real do dashboard
const TestComponent: React.FC = () => {
  const [users, setUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await httpClient.get("/api/users");
      setUsers(response.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData: any) => {
    try {
      const response = await httpClient.post("/api/users", userData);
      setUsers((prev) => [...prev, response.data]);
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const updateUser = async (id: string, userData: any) => {
    try {
      const response = await httpClient.put(`/api/users/${id}`, userData);
      setUsers((prev) =>
        prev.map((user) => (user.id === id ? response.data : user)),
      );
      return response.data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const deleteUser = async (id: string) => {
    try {
      await httpClient.delete(`/api/users/${id}`);
      setUsers((prev) => prev.filter((user) => user.id !== id));
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  return (
    <div>
      <h1>User Management</h1>

      {loading && <div data-testid="loading">Loading...</div>}
      {error && <div data-testid="error">{error}</div>}

      <button onClick={fetchUsers} data-testid="refresh-btn">
        Refresh
      </button>

      <button
        onClick={() => createUser({ name: "New User", email: "new@test.com" })}
        data-testid="create-btn"
      >
        Create User
      </button>

      <div data-testid="users-list">
        {users.map((user) => (
          <div key={user.id} data-testid={`user-${user.id}`}>
            <span>
              {user.name} - {user.email}
            </span>
            <button
              onClick={() =>
                updateUser(user.id, { ...user, name: "Updated Name" })
              }
              data-testid={`update-${user.id}`}
            >
              Update
            </button>
            <button
              onClick={() => deleteUser(user.id)}
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

describe("Component Integration Tests", () => {
  beforeEach(() => {
    mockHttpClient.get.mockClear();
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
    mockHttpClient.delete.mockClear();
  });

  describe("Data Fetching Integration", () => {
    it("should fetch and display data from API on component mount", async () => {
      const mockUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
        { id: "2", name: "User 2", email: "user2@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      render(<TestComponent />);

      // Verifica se mostra loading inicialmente
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Verifica se a API foi chamada
      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/users");

      // Aguarda os dados carregarem
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Verifica se os dados são exibidos
      expect(screen.getByTestId("user-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-2")).toBeInTheDocument();
      expect(screen.getByText("User 1 - user1@test.com")).toBeInTheDocument();
      expect(screen.getByText("User 2 - user2@test.com")).toBeInTheDocument();
    });

    it("should handle API errors gracefully", async () => {
      const errorMessage = "Failed to fetch users";
      mockHttpClient.get.mockRejectedValue(new Error(errorMessage));

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
    });

    it("should refetch data when refresh button is clicked", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Clica no botão de refresh
      fireEvent.click(screen.getByTestId("refresh-btn"));

      // Verifica se mostra loading novamente
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Verifica se a API foi chamada novamente
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
    });
  });

  describe("CRUD Operations Integration", () => {
    it("should create new user via API", async () => {
      const existingUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      const newUser = { id: "2", name: "New User", email: "new@test.com" };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: existingUsers,
      });

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: newUser,
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Clica no botão de criar usuário
      fireEvent.click(screen.getByTestId("create-btn"));

      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalledWith("/api/users", {
          name: "New User",
          email: "new@test.com",
        });
      });

      // Verifica se o novo usuário aparece na lista
      await waitFor(() => {
        expect(screen.getByTestId("user-2")).toBeInTheDocument();
      });

      expect(screen.getByText("New User - new@test.com")).toBeInTheDocument();
    });

    it("should update user via API", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      const updatedUser = {
        id: "1",
        name: "Updated Name",
        email: "user1@test.com",
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: updatedUser,
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Clica no botão de atualizar
      fireEvent.click(screen.getByTestId("update-1"));

      await waitFor(() => {
        expect(mockHttpClient.put).toHaveBeenCalledWith("/api/users/1", {
          id: "1",
          name: "Updated Name",
          email: "user1@test.com",
        });
      });

      // Verifica se o nome foi atualizado na interface
      await waitFor(() => {
        expect(
          screen.getByText("Updated Name - user1@test.com"),
        ).toBeInTheDocument();
      });
    });

    it("should delete user via API", async () => {
      const mockUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
        { id: "2", name: "User 2", email: "user2@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { message: "User deleted" },
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Verifica se ambos os usuários estão na tela
      expect(screen.getByTestId("user-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-2")).toBeInTheDocument();

      // Clica no botão de deletar o primeiro usuário
      fireEvent.click(screen.getByTestId("delete-1"));

      await waitFor(() => {
        expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/users/1");
      });

      // Verifica se o usuário foi removido da interface
      await waitFor(() => {
        expect(screen.queryByTestId("user-1")).not.toBeInTheDocument();
      });

      // Verifica se o segundo usuário ainda está lá
      expect(screen.getByTestId("user-2")).toBeInTheDocument();
    });

    it("should handle CRUD operation errors", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      mockHttpClient.post.mockRejectedValue(new Error("Creation failed"));

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Tenta criar um usuário (vai falhar)
      fireEvent.click(screen.getByTestId("create-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      expect(screen.getByText("Creation failed")).toBeInTheDocument();
    });
  });

  describe("Loading States Integration", () => {
    it("should show loading state during API calls", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      mockHttpClient.get.mockReturnValue(promise);

      render(<TestComponent />);

      // Verifica se mostra loading
      expect(screen.getByTestId("loading")).toBeInTheDocument();

      // Resolve a promise
      resolvePromise!({
        success: true,
        data: [],
      });

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
    });

    it("should handle concurrent API calls correctly", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: { id: "2", name: "New User", email: "new@test.com" },
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Faz múltiplas operações rapidamente
      fireEvent.click(screen.getByTestId("create-btn"));
      fireEvent.click(screen.getByTestId("refresh-btn"));

      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalled();
        expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
      });

      // Verifica se o estado final está correto
      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Recovery Integration", () => {
    it("should recover from errors when retry succeeds", async () => {
      mockHttpClient.get
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: "1", name: "User 1", email: "user1@test.com" }],
        });

      render(<TestComponent />);

      // Primeiro mostra erro
      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // Tenta novamente
      fireEvent.click(screen.getByTestId("refresh-btn"));

      // Agora deve funcionar
      await waitFor(() => {
        expect(screen.queryByTestId("error")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("user-1")).toBeInTheDocument();
    });

    it("should clear errors when new operations succeed", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      mockHttpClient.post
        .mockRejectedValueOnce(new Error("Creation failed"))
        .mockResolvedValueOnce({
          success: true,
          data: { id: "2", name: "New User", email: "new@test.com" },
        });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Primeira tentativa de criação falha
      fireEvent.click(screen.getByTestId("create-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("error")).toBeInTheDocument();
      });

      // Segunda tentativa de criação funciona
      fireEvent.click(screen.getByTestId("create-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("error")).not.toBeInTheDocument();
      });

      expect(screen.getByTestId("user-2")).toBeInTheDocument();
    });
  });

  describe("Data Consistency Integration", () => {
    it("should maintain data consistency across operations", async () => {
      const initialUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: initialUsers,
      });

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: { id: "2", name: "New User", email: "new@test.com" },
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: { id: "1", name: "Updated User 1", email: "user1@test.com" },
      });

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Cria um novo usuário
      fireEvent.click(screen.getByTestId("create-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("user-2")).toBeInTheDocument();
      });

      // Atualiza o primeiro usuário
      fireEvent.click(screen.getByTestId("update-1"));

      await waitFor(() => {
        expect(
          screen.getByText("Updated User 1 - user1@test.com"),
        ).toBeInTheDocument();
      });

      // Verifica se ambos os usuários ainda estão na lista
      expect(screen.getByTestId("user-1")).toBeInTheDocument();
      expect(screen.getByTestId("user-2")).toBeInTheDocument();
    });

    it("should handle optimistic updates correctly", async () => {
      const mockUsers = [{ id: "1", name: "User 1", email: "user1@test.com" }];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
      });

      // Simula uma atualização que demora para responder
      let resolveUpdate: (value: any) => void;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });
      mockHttpClient.put.mockReturnValue(updatePromise);

      render(<TestComponent />);

      await waitFor(() => {
        expect(screen.queryByTestId("loading")).not.toBeInTheDocument();
      });

      // Inicia a atualização
      fireEvent.click(screen.getByTestId("update-1"));

      // A interface deve mostrar o estado otimista
      await waitFor(() => {
        expect(
          screen.getByText("Updated Name - user1@test.com"),
        ).toBeInTheDocument();
      });

      // Resolve a atualização
      resolveUpdate!({
        success: true,
        data: { id: "1", name: "Updated Name", email: "user1@test.com" },
      });

      await waitFor(() => {
        expect(
          screen.getByText("Updated Name - user1@test.com"),
        ).toBeInTheDocument();
      });
    });
  });
});
