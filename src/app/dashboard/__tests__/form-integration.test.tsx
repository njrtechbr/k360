/**
 * Testes de integração para formulários e validação
 * Verifica o fluxo completo de validação, submissão e feedback
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { httpClient } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient", () => ({
  httpClient: {
    post: jest.fn(),
    put: jest.fn(),
  },
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Schema de validação para teste
const userSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  role: z.enum(["ADMIN", "USUARIO"], { required_error: "Role é obrigatório" }),
});

type UserFormData = z.infer<typeof userSchema>;

// Componente de formulário de teste
const TestUserForm: React.FC<{
  onSubmit: (data: UserFormData) => Promise<void>;
  initialData?: Partial<UserFormData>;
  isLoading?: boolean;
}> = ({ onSubmit, initialData, isLoading = false }) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    clearErrors,
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: initialData,
  });

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      clearErrors();
      await onSubmit(data);
    } catch (error: any) {
      if (error.details) {
        // Erros de validação do servidor
        Object.entries(error.details).forEach(([field, messages]) => {
          setError(field as keyof UserFormData, {
            message: (messages as string[])[0],
          });
        });
      } else {
        setError("root", { message: error.message });
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} data-testid="user-form">
      <div>
        <label htmlFor="name">Nome</label>
        <input
          id="name"
          {...register("name")}
          data-testid="name-input"
          disabled={isLoading || isSubmitting}
        />
        {errors.name && (
          <span data-testid="name-error">{errors.name.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          {...register("email")}
          data-testid="email-input"
          disabled={isLoading || isSubmitting}
        />
        {errors.email && (
          <span data-testid="email-error">{errors.email.message}</span>
        )}
      </div>

      <div>
        <label htmlFor="role">Role</label>
        <select
          id="role"
          {...register("role")}
          data-testid="role-select"
          disabled={isLoading || isSubmitting}
        >
          <option value="">Selecione...</option>
          <option value="ADMIN">Admin</option>
          <option value="USUARIO">Usuário</option>
        </select>
        {errors.role && (
          <span data-testid="role-error">{errors.role.message}</span>
        )}
      </div>

      {errors.root && <div data-testid="form-error">{errors.root.message}</div>}

      <button
        type="submit"
        disabled={isLoading || isSubmitting}
        data-testid="submit-btn"
      >
        {isSubmitting ? "Salvando..." : "Salvar"}
      </button>
    </form>
  );
};

// Componente wrapper que simula o uso real
const TestFormWrapper: React.FC = () => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [users, setUsers] = React.useState<any[]>([]);
  const [editingUser, setEditingUser] = React.useState<any>(null);

  const handleCreateUser = async (data: UserFormData) => {
    setIsLoading(true);
    try {
      const response = await httpClient.post("/api/users", data);
      setUsers((prev) => [...prev, response.data]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!editingUser) return;

    setIsLoading(true);
    try {
      const response = await httpClient.put(
        `/api/users/${editingUser.id}`,
        data,
      );
      setUsers((prev) =>
        prev.map((user) => (user.id === editingUser.id ? response.data : user)),
      );
      setEditingUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1>User Management</h1>

      <TestUserForm
        onSubmit={editingUser ? handleUpdateUser : handleCreateUser}
        initialData={editingUser}
        isLoading={isLoading}
      />

      <div data-testid="users-list">
        {users.map((user) => (
          <div key={user.id} data-testid={`user-${user.id}`}>
            <span>
              {user.name} - {user.email} ({user.role})
            </span>
            <button
              onClick={() => setEditingUser(user)}
              data-testid={`edit-${user.id}`}
            >
              Edit
            </button>
          </div>
        ))}
      </div>

      {editingUser && (
        <button onClick={() => setEditingUser(null)} data-testid="cancel-edit">
          Cancel Edit
        </button>
      )}
    </div>
  );
};

describe("Form Integration Tests", () => {
  beforeEach(() => {
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
  });

  describe("Form Validation Integration", () => {
    it("should validate form fields using Zod schema", async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();

      render(<TestUserForm onSubmit={mockSubmit} />);

      // Tenta submeter formulário vazio
      await user.click(screen.getByTestId("submit-btn"));

      // Verifica se mostra erros de validação
      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("email-error")).toBeInTheDocument();
        expect(screen.getByTestId("role-error")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Nome deve ter pelo menos 2 caracteres"),
      ).toBeInTheDocument();
      expect(screen.getByText("Email inválido")).toBeInTheDocument();
      expect(screen.getByText("Role é obrigatório")).toBeInTheDocument();

      // Verifica que onSubmit não foi chamado
      expect(mockSubmit).not.toHaveBeenCalled();
    });

    it("should validate individual fields on blur", async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();

      render(<TestUserForm onSubmit={mockSubmit} />);

      // Digita nome muito curto
      await user.type(screen.getByTestId("name-input"), "A");
      await user.tab(); // Blur

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
      });

      // Digita email inválido
      await user.type(screen.getByTestId("email-input"), "invalid-email");
      await user.tab(); // Blur

      await waitFor(() => {
        expect(screen.getByTestId("email-error")).toBeInTheDocument();
      });
    });

    it("should clear validation errors when fields become valid", async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();

      render(<TestUserForm onSubmit={mockSubmit} />);

      // Primeiro cria erro
      await user.type(screen.getByTestId("name-input"), "A");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
      });

      // Depois corrige
      await user.clear(screen.getByTestId("name-input"));
      await user.type(screen.getByTestId("name-input"), "Valid Name");

      await waitFor(() => {
        expect(screen.queryByTestId("name-error")).not.toBeInTheDocument();
      });
    });
  });

  describe("Form Submission Integration", () => {
    it("should submit valid form data to API", async () => {
      const user = userEvent.setup();

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          id: "1",
          name: "Test User",
          email: "test@test.com",
          role: "ADMIN",
        },
      });

      render(<TestFormWrapper />);

      // Preenche formulário
      await user.type(screen.getByTestId("name-input"), "Test User");
      await user.type(screen.getByTestId("email-input"), "test@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "ADMIN");

      // Submete formulário
      await user.click(screen.getByTestId("submit-btn"));

      // Verifica se API foi chamada com dados corretos
      await waitFor(() => {
        expect(mockHttpClient.post).toHaveBeenCalledWith("/api/users", {
          name: "Test User",
          email: "test@test.com",
          role: "ADMIN",
        });
      });

      // Verifica se usuário aparece na lista
      await waitFor(() => {
        expect(screen.getByTestId("user-1")).toBeInTheDocument();
      });

      expect(
        screen.getByText("Test User - test@test.com (ADMIN)"),
      ).toBeInTheDocument();
    });

    it("should handle API validation errors", async () => {
      const user = userEvent.setup();

      const apiError = {
        message: "Validation failed",
        details: {
          email: ["Email already exists"],
          name: ["Name is too short"],
        },
      };

      mockHttpClient.post.mockRejectedValue(apiError);

      render(<TestFormWrapper />);

      // Preenche formulário
      await user.type(screen.getByTestId("name-input"), "Test User");
      await user.type(screen.getByTestId("email-input"), "existing@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "ADMIN");

      // Submete formulário
      await user.click(screen.getByTestId("submit-btn"));

      // Verifica se erros do servidor são exibidos
      await waitFor(() => {
        expect(screen.getByTestId("email-error")).toBeInTheDocument();
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
      });

      expect(screen.getByText("Email already exists")).toBeInTheDocument();
      expect(screen.getByText("Name is too short")).toBeInTheDocument();
    });

    it("should handle generic API errors", async () => {
      const user = userEvent.setup();

      mockHttpClient.post.mockRejectedValue({
        message: "Server error occurred",
      });

      render(<TestFormWrapper />);

      // Preenche formulário
      await user.type(screen.getByTestId("name-input"), "Test User");
      await user.type(screen.getByTestId("email-input"), "test@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "ADMIN");

      // Submete formulário
      await user.click(screen.getByTestId("submit-btn"));

      // Verifica se erro genérico é exibido
      await waitFor(() => {
        expect(screen.getByTestId("form-error")).toBeInTheDocument();
      });

      expect(screen.getByText("Server error occurred")).toBeInTheDocument();
    });

    it("should show loading state during submission", async () => {
      const user = userEvent.setup();

      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockHttpClient.post.mockReturnValue(promise);

      render(<TestFormWrapper />);

      // Preenche formulário
      await user.type(screen.getByTestId("name-input"), "Test User");
      await user.type(screen.getByTestId("email-input"), "test@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "ADMIN");

      // Submete formulário
      await user.click(screen.getByTestId("submit-btn"));

      // Verifica estado de loading
      expect(screen.getByText("Salvando...")).toBeInTheDocument();
      expect(screen.getByTestId("submit-btn")).toBeDisabled();
      expect(screen.getByTestId("name-input")).toBeDisabled();

      // Resolve promise
      resolvePromise!({
        success: true,
        data: {
          id: "1",
          name: "Test User",
          email: "test@test.com",
          role: "ADMIN",
        },
      });

      await waitFor(() => {
        expect(screen.getByText("Salvar")).toBeInTheDocument();
        expect(screen.getByTestId("submit-btn")).not.toBeDisabled();
      });
    });
  });

  describe("Form Edit Mode Integration", () => {
    it("should populate form with existing data for editing", async () => {
      const user = userEvent.setup();

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          id: "1",
          name: "Original User",
          email: "original@test.com",
          role: "USUARIO",
        },
      });

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: {
          id: "1",
          name: "Updated User",
          email: "updated@test.com",
          role: "ADMIN",
        },
      });

      render(<TestFormWrapper />);

      // Primeiro cria um usuário
      await user.type(screen.getByTestId("name-input"), "Original User");
      await user.type(screen.getByTestId("email-input"), "original@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "USUARIO");
      await user.click(screen.getByTestId("submit-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("user-1")).toBeInTheDocument();
      });

      // Clica para editar
      await user.click(screen.getByTestId("edit-1"));

      // Verifica se formulário foi populado
      expect(screen.getByTestId("name-input")).toHaveValue("Original User");
      expect(screen.getByTestId("email-input")).toHaveValue(
        "original@test.com",
      );
      expect(screen.getByTestId("role-select")).toHaveValue("USUARIO");

      // Modifica dados
      await user.clear(screen.getByTestId("name-input"));
      await user.type(screen.getByTestId("name-input"), "Updated User");
      await user.clear(screen.getByTestId("email-input"));
      await user.type(screen.getByTestId("email-input"), "updated@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "ADMIN");

      // Submete atualização
      await user.click(screen.getByTestId("submit-btn"));

      // Verifica se API de update foi chamada
      await waitFor(() => {
        expect(mockHttpClient.put).toHaveBeenCalledWith("/api/users/1", {
          name: "Updated User",
          email: "updated@test.com",
          role: "ADMIN",
        });
      });

      // Verifica se dados foram atualizados na lista
      await waitFor(() => {
        expect(
          screen.getByText("Updated User - updated@test.com (ADMIN)"),
        ).toBeInTheDocument();
      });
    });

    it("should cancel edit mode and reset form", async () => {
      const user = userEvent.setup();

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          id: "1",
          name: "Test User",
          email: "test@test.com",
          role: "USUARIO",
        },
      });

      render(<TestFormWrapper />);

      // Cria um usuário
      await user.type(screen.getByTestId("name-input"), "Test User");
      await user.type(screen.getByTestId("email-input"), "test@test.com");
      await user.selectOptions(screen.getByTestId("role-select"), "USUARIO");
      await user.click(screen.getByTestId("submit-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("user-1")).toBeInTheDocument();
      });

      // Entra em modo de edição
      await user.click(screen.getByTestId("edit-1"));

      // Verifica se está em modo de edição
      expect(screen.getByTestId("name-input")).toHaveValue("Test User");
      expect(screen.getByTestId("cancel-edit")).toBeInTheDocument();

      // Modifica alguns campos
      await user.clear(screen.getByTestId("name-input"));
      await user.type(screen.getByTestId("name-input"), "Modified Name");

      // Cancela edição
      await user.click(screen.getByTestId("cancel-edit"));

      // Verifica se formulário foi resetado
      expect(screen.getByTestId("name-input")).toHaveValue("");
      expect(screen.queryByTestId("cancel-edit")).not.toBeInTheDocument();
    });
  });

  describe("Form Accessibility Integration", () => {
    it("should have proper form labels and associations", () => {
      const mockSubmit = jest.fn();
      render(<TestUserForm onSubmit={mockSubmit} />);

      // Verifica se labels estão associados aos inputs
      expect(screen.getByLabelText("Nome")).toBeInTheDocument();
      expect(screen.getByLabelText("Email")).toBeInTheDocument();
      expect(screen.getByLabelText("Role")).toBeInTheDocument();

      // Verifica se inputs têm IDs corretos
      expect(screen.getByTestId("name-input")).toHaveAttribute("id", "name");
      expect(screen.getByTestId("email-input")).toHaveAttribute("id", "email");
      expect(screen.getByTestId("role-select")).toHaveAttribute("id", "role");
    });

    it("should disable form fields during loading", () => {
      const mockSubmit = jest.fn();
      render(<TestUserForm onSubmit={mockSubmit} isLoading={true} />);

      // Verifica se todos os campos estão desabilitados
      expect(screen.getByTestId("name-input")).toBeDisabled();
      expect(screen.getByTestId("email-input")).toBeDisabled();
      expect(screen.getByTestId("role-select")).toBeDisabled();
      expect(screen.getByTestId("submit-btn")).toBeDisabled();
    });

    it("should have proper error message associations", async () => {
      const user = userEvent.setup();
      const mockSubmit = jest.fn();

      render(<TestUserForm onSubmit={mockSubmit} />);

      // Tenta submeter formulário vazio para gerar erros
      await user.click(screen.getByTestId("submit-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
      });

      // Verifica se mensagens de erro estão próximas aos campos
      const nameInput = screen.getByTestId("name-input");
      const nameError = screen.getByTestId("name-error");

      expect(nameInput.parentElement).toContain(nameError);
    });
  });
});
