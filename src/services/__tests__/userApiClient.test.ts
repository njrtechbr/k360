/**
 * Testes abrangentes para UserApiClient
 * Cobre todos os métodos, error handling, validação e edge cases
 */

import { UserApiClient } from "../userApiClient";
import { httpClient, HttpClientError } from "@/lib/httpClient";
import { Role } from "@prisma/client";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("UserApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should return all users successfully", async () => {
      const mockUsers = [
        {
          id: "1",
          name: "User 1",
          email: "user1@test.com",
          role: Role.USUARIO,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "2",
          name: "User 2",
          email: "user2@test.com",
          role: Role.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });

      const result = await UserApiClient.findAll();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/users");
      expect(result).toEqual(mockUsers);
    });

    it("should return empty array when no users found", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await UserApiClient.findAll();

      expect(result).toEqual([]);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(UserApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar usuários",
      );
    });

    it("should handle API errors", async () => {
      const apiError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(apiError);

      await expect(UserApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar usuários",
      );
    });

    it("should handle unsuccessful API response", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: false,
        error: "Database connection failed",
        data: null,
      });

      await expect(UserApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar usuários",
      );
    });
  });

  describe("findById", () => {
    it("should return user by id successfully", async () => {
      const mockUser = {
        id: "1",
        name: "User 1",
        email: "user1@test.com",
        role: Role.USUARIO,
        modules: ["module1", "module2"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await UserApiClient.findById("1");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/users/1");
      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found (404)", async () => {
      const notFoundError = new HttpClientError("User not found", 404);
      mockHttpClient.get.mockRejectedValue(notFoundError);

      const result = await UserApiClient.findById("999");

      expect(result).toBeNull();
    });

    it("should throw error for other HTTP errors", async () => {
      const serverError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(serverError);

      await expect(UserApiClient.findById("1")).rejects.toThrow(
        "Erro ao buscar usuário",
      );
    });

    it("should validate id parameter", async () => {
      await expect(UserApiClient.findById("")).rejects.toThrow(
        "ID do usuário é obrigatório",
      );
      await expect(UserApiClient.findById(null as any)).rejects.toThrow(
        "ID do usuário é obrigatório",
      );
      await expect(UserApiClient.findById(undefined as any)).rejects.toThrow(
        "ID do usuário é obrigatório",
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(UserApiClient.findById("1")).rejects.toThrow(
        "Erro ao buscar usuário",
      );
    });
  });

  describe("findByEmail", () => {
    it("should return user by email successfully", async () => {
      const mockUser = {
        id: "1",
        name: "User 1",
        email: "user1@test.com",
        role: Role.USUARIO,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await UserApiClient.findByEmail("user1@test.com");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/users?email=user1@test.com",
      );
      expect(result).toEqual(mockUser);
    });

    it("should return null when user not found by email", async () => {
      const notFoundError = new HttpClientError("User not found", 404);
      mockHttpClient.get.mockRejectedValue(notFoundError);

      const result = await UserApiClient.findByEmail("nonexistent@test.com");

      expect(result).toBeNull();
    });

    it("should validate email parameter", async () => {
      await expect(UserApiClient.findByEmail("")).rejects.toThrow(
        "Email é obrigatório",
      );
      await expect(UserApiClient.findByEmail("invalid-email")).rejects.toThrow(
        "Email inválido",
      );
    });
  });

  describe("create", () => {
    const validUserData = {
      name: "New User",
      email: "newuser@test.com",
      password: "password123",
      role: Role.USUARIO,
      modules: ["module1"],
    };

    it("should create a new user successfully", async () => {
      const mockCreatedUser = {
        id: "1",
        ...validUserData,
        password: "hashed_password",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockCreatedUser,
        message: "User created successfully",
      });

      const result = await UserApiClient.create(validUserData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/users",
        validUserData,
      );
      expect(result).toEqual(mockCreatedUser);
    });

    it("should validate required fields", async () => {
      const invalidData = {
        name: "",
        email: "invalid-email",
        password: "123",
        role: Role.USUARIO,
      };

      await expect(UserApiClient.create(invalidData as any)).rejects.toThrow(
        "Dados inválidos",
      );
    });

    it("should validate name field", async () => {
      const invalidName = { ...validUserData, name: "" };
      await expect(UserApiClient.create(invalidName)).rejects.toThrow(
        "Nome é obrigatório",
      );

      const shortName = { ...validUserData, name: "A" };
      await expect(UserApiClient.create(shortName)).rejects.toThrow(
        "Nome deve ter pelo menos 2 caracteres",
      );
    });

    it("should validate email field", async () => {
      const invalidEmail = { ...validUserData, email: "invalid-email" };
      await expect(UserApiClient.create(invalidEmail)).rejects.toThrow(
        "Email inválido",
      );

      const emptyEmail = { ...validUserData, email: "" };
      await expect(UserApiClient.create(emptyEmail)).rejects.toThrow(
        "Email é obrigatório",
      );
    });

    it("should validate password field", async () => {
      const shortPassword = { ...validUserData, password: "123" };
      await expect(UserApiClient.create(shortPassword)).rejects.toThrow(
        "Senha deve ter pelo menos 6 caracteres",
      );

      const emptyPassword = { ...validUserData, password: "" };
      await expect(UserApiClient.create(emptyPassword)).rejects.toThrow(
        "Senha é obrigatória",
      );
    });

    it("should validate role field", async () => {
      const invalidRole = { ...validUserData, role: "INVALID_ROLE" as Role };
      await expect(UserApiClient.create(invalidRole)).rejects.toThrow(
        "Role inválido",
      );
    });

    it("should handle duplicate email error", async () => {
      const duplicateError = new HttpClientError(
        "Email already exists",
        409,
        "DUPLICATE_EMAIL",
        { email: ["Email já está em uso"] },
      );

      mockHttpClient.post.mockRejectedValue(duplicateError);

      await expect(UserApiClient.create(validUserData)).rejects.toThrow(
        "Email already exists",
      );
    });

    it("should handle validation errors from API", async () => {
      const validationError = new HttpClientError(
        "Validation failed",
        422,
        "VALIDATION_ERROR",
        {
          name: ["Name is required"],
          email: ["Invalid email format"],
        },
      );

      mockHttpClient.post.mockRejectedValue(validationError);

      await expect(UserApiClient.create(validUserData)).rejects.toThrow(
        "Validation failed",
      );
    });
  });

  describe("update", () => {
    const updateData = {
      name: "Updated User",
      email: "updated@test.com",
      role: Role.ADMIN,
    };

    it("should update user successfully", async () => {
      const mockUpdatedUser = {
        id: "1",
        ...updateData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedUser,
        message: "User updated successfully",
      });

      const result = await UserApiClient.update("1", updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/users/1",
        updateData,
      );
      expect(result).toEqual(mockUpdatedUser);
    });

    it("should validate id parameter", async () => {
      await expect(UserApiClient.update("", updateData)).rejects.toThrow(
        "ID do usuário é obrigatório",
      );
    });

    it("should validate update data", async () => {
      const invalidData = { name: "", email: "invalid" };
      await expect(UserApiClient.update("1", invalidData)).rejects.toThrow(
        "Dados inválidos",
      );
    });

    it("should handle user not found error", async () => {
      const notFoundError = new HttpClientError("User not found", 404);
      mockHttpClient.put.mockRejectedValue(notFoundError);

      await expect(UserApiClient.update("999", updateData)).rejects.toThrow(
        "User not found",
      );
    });

    it("should allow partial updates", async () => {
      const partialData = { name: "New Name Only" };
      const mockUpdatedUser = {
        id: "1",
        name: "New Name Only",
        email: "original@test.com",
        role: Role.USUARIO,
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedUser,
      });

      const result = await UserApiClient.update("1", partialData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/users/1",
        partialData,
      );
      expect(result).toEqual(mockUpdatedUser);
    });
  });

  describe("delete", () => {
    it("should delete user successfully", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { message: "User deleted successfully" },
      });

      await UserApiClient.delete("1");

      expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/users/1");
    });

    it("should validate id parameter", async () => {
      await expect(UserApiClient.delete("")).rejects.toThrow(
        "ID do usuário é obrigatório",
      );
    });

    it("should handle user not found error", async () => {
      const notFoundError = new HttpClientError("User not found", 404);
      mockHttpClient.delete.mockRejectedValue(notFoundError);

      await expect(UserApiClient.delete("999")).rejects.toThrow(
        "User not found",
      );
    });

    it("should handle cannot delete error", async () => {
      const cannotDeleteError = new HttpClientError(
        "Cannot delete user with active sessions",
        409,
        "CANNOT_DELETE",
      );
      mockHttpClient.delete.mockRejectedValue(cannotDeleteError);

      await expect(UserApiClient.delete("1")).rejects.toThrow(
        "Cannot delete user with active sessions",
      );
    });
  });

  describe("verifyCredentials", () => {
    it("should return user on valid credentials", async () => {
      const mockUser = {
        id: "1",
        name: "User 1",
        email: "user1@test.com",
        role: Role.USUARIO,
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await UserApiClient.verifyCredentials(
        "user1@test.com",
        "password123",
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith("/api/users/login", {
        email: "user1@test.com",
        password: "password123",
      });
      expect(result).toEqual(mockUser);
    });

    it("should return null on invalid credentials (401)", async () => {
      const unauthorizedError = new HttpClientError("Invalid credentials", 401);
      mockHttpClient.post.mockRejectedValue(unauthorizedError);

      const result = await UserApiClient.verifyCredentials(
        "user1@test.com",
        "wrongpassword",
      );

      expect(result).toBeNull();
    });

    it("should return null on user not found (404)", async () => {
      const notFoundError = new HttpClientError("User not found", 404);
      mockHttpClient.post.mockRejectedValue(notFoundError);

      const result = await UserApiClient.verifyCredentials(
        "nonexistent@test.com",
        "password",
      );

      expect(result).toBeNull();
    });

    it("should throw error for other HTTP errors", async () => {
      const serverError = new HttpClientError("Internal server error", 500);
      mockHttpClient.post.mockRejectedValue(serverError);

      await expect(
        UserApiClient.verifyCredentials("user1@test.com", "password123"),
      ).rejects.toThrow("Erro ao verificar credenciais");
    });

    it("should validate credentials parameters", async () => {
      await expect(
        UserApiClient.verifyCredentials("", "password"),
      ).rejects.toThrow("Email é obrigatório");

      await expect(
        UserApiClient.verifyCredentials("user@test.com", ""),
      ).rejects.toThrow("Senha é obrigatória");

      await expect(
        UserApiClient.verifyCredentials("invalid-email", "password"),
      ).rejects.toThrow("Email inválido");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout");
      mockHttpClient.post.mockRejectedValue(networkError);

      await expect(
        UserApiClient.verifyCredentials("user1@test.com", "password123"),
      ).rejects.toThrow("Erro ao verificar credenciais");
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: { message: "Password changed successfully" },
      });

      await UserApiClient.changePassword("1", "oldpassword", "newpassword123");

      expect(mockHttpClient.put).toHaveBeenCalledWith("/api/users/1/password", {
        currentPassword: "oldpassword",
        newPassword: "newpassword123",
      });
    });

    it("should validate parameters", async () => {
      await expect(
        UserApiClient.changePassword("", "old", "new"),
      ).rejects.toThrow("ID do usuário é obrigatório");

      await expect(
        UserApiClient.changePassword("1", "", "new"),
      ).rejects.toThrow("Senha atual é obrigatória");

      await expect(
        UserApiClient.changePassword("1", "old", ""),
      ).rejects.toThrow("Nova senha é obrigatória");

      await expect(
        UserApiClient.changePassword("1", "old", "123"),
      ).rejects.toThrow("Nova senha deve ter pelo menos 6 caracteres");
    });

    it("should handle incorrect current password", async () => {
      const incorrectPasswordError = new HttpClientError(
        "Current password is incorrect",
        400,
      );
      mockHttpClient.put.mockRejectedValue(incorrectPasswordError);

      await expect(
        UserApiClient.changePassword("1", "wrongpassword", "newpassword123"),
      ).rejects.toThrow("Current password is incorrect");
    });
  });

  describe("hasSuperAdmin", () => {
    it("should return true when super admin exists", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: { hasSuperAdmin: true },
      });

      const result = await UserApiClient.hasSuperAdmin();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/users?checkSuperAdmin=true",
      );
      expect(result).toBe(true);
    });

    it("should return false when no super admin exists", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: { hasSuperAdmin: false },
      });

      const result = await UserApiClient.hasSuperAdmin();

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      const networkError = new Error("Network error");
      mockHttpClient.get.mockRejectedValue(networkError);

      const result = await UserApiClient.hasSuperAdmin();

      expect(result).toBe(false);
    });

    it("should return false on API error", async () => {
      const apiError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(apiError);

      const result = await UserApiClient.hasSuperAdmin();

      expect(result).toBe(false);
    });

    it("should return false on unsuccessful response", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: false,
        error: "Database error",
        data: null,
      });

      const result = await UserApiClient.hasSuperAdmin();

      expect(result).toBe(false);
    });
  });

  describe("getUsersByRole", () => {
    it("should return users filtered by role", async () => {
      const mockAdmins = [
        {
          id: "1",
          name: "Admin 1",
          email: "admin1@test.com",
          role: Role.ADMIN,
        },
        {
          id: "2",
          name: "Admin 2",
          email: "admin2@test.com",
          role: Role.ADMIN,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAdmins,
      });

      const result = await UserApiClient.getUsersByRole(Role.ADMIN);

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/users?role=ADMIN");
      expect(result).toEqual(mockAdmins);
    });

    it("should validate role parameter", async () => {
      await expect(UserApiClient.getUsersByRole("" as Role)).rejects.toThrow(
        "Role é obrigatório",
      );

      await expect(
        UserApiClient.getUsersByRole("INVALID_ROLE" as Role),
      ).rejects.toThrow("Role inválido");
    });
  });

  describe("searchUsers", () => {
    it("should search users by query", async () => {
      const mockUsers = [
        {
          id: "1",
          name: "John Doe",
          email: "john@test.com",
          role: Role.USUARIO,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUsers,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const result = await UserApiClient.searchUsers("John", {
        page: 1,
        limit: 10,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/users?search=John&page=1&limit=10",
      );
      expect(result).toEqual(mockUsers);
    });

    it("should validate search query", async () => {
      await expect(UserApiClient.searchUsers("")).rejects.toThrow(
        "Termo de busca é obrigatório",
      );

      await expect(UserApiClient.searchUsers("ab")).rejects.toThrow(
        "Termo de busca deve ter pelo menos 3 caracteres",
      );
    });

    it("should handle pagination parameters", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      await UserApiClient.searchUsers("test", { page: 2, limit: 5 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/users?search=test&page=2&limit=5",
      );
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain interface compatibility with original service", async () => {
      // Testa se todos os métodos públicos estão disponíveis
      expect(typeof UserApiClient.findAll).toBe("function");
      expect(typeof UserApiClient.findById).toBe("function");
      expect(typeof UserApiClient.create).toBe("function");
      expect(typeof UserApiClient.update).toBe("function");
      expect(typeof UserApiClient.delete).toBe("function");
      expect(typeof UserApiClient.verifyCredentials).toBe("function");
      expect(typeof UserApiClient.hasSuperAdmin).toBe("function");
    });

    it("should return same data structure as original service", async () => {
      const mockUser = {
        id: "1",
        name: "User 1",
        email: "user1@test.com",
        role: Role.USUARIO,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockUser,
      });

      const result = await UserApiClient.findById("1");

      // Verifica se a estrutura de dados é mantida
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("role");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });
  });

  describe("Error Message Localization", () => {
    it("should provide Portuguese error messages", async () => {
      const networkError = new Error("Network error");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(UserApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar usuários",
      );
      await expect(UserApiClient.findById("1")).rejects.toThrow(
        "Erro ao buscar usuário",
      );
    });

    it("should handle validation errors in Portuguese", async () => {
      await expect(UserApiClient.findById("")).rejects.toThrow(
        "ID do usuário é obrigatório",
      );
      await expect(
        UserApiClient.create({
          name: "",
          email: "",
          password: "",
          role: Role.USUARIO,
        }),
      ).rejects.toThrow("Nome é obrigatório");
    });
  });
});
