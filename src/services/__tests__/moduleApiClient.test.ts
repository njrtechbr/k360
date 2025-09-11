import { ModuleApiClient } from "../moduleApiClient";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient");

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

// Mock da classe HttpClientError para testes
const createMockHttpClientError = (message: string, status: number) => {
  const error = new Error(message);
  error.name = "HttpClientError";
  (error as any).status = status;
  // Fazer o erro ser reconhecido como instância de HttpClientError
  Object.setPrototypeOf(error, HttpClientError.prototype);
  return error;
};

describe("ModuleApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("should fetch all modules successfully", async () => {
      const mockModules = [
        {
          id: "1",
          name: "Module 1",
          description: "Test",
          path: "/test1",
          active: true,
        },
        {
          id: "2",
          name: "Module 2",
          description: "Test",
          path: "/test2",
          active: false,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockModules,
      });

      const result = await ModuleApiClient.findAll();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/modules");
      expect(result).toEqual(mockModules);
    });

    it("should handle HTTP client errors", async () => {
      const error = createMockHttpClientError("Network error", 500);
      mockHttpClient.get.mockRejectedValue(error);

      await expect(ModuleApiClient.findAll()).rejects.toThrow("Network error");
    });

    it("should handle generic errors", async () => {
      mockHttpClient.get.mockRejectedValue(new Error("Generic error"));

      await expect(ModuleApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar módulos",
      );
    });
  });

  describe("findActive", () => {
    it("should fetch active modules successfully", async () => {
      const mockModules = [
        {
          id: "1",
          name: "Active Module",
          description: "Test",
          path: "/test",
          active: true,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockModules,
      });

      const result = await ModuleApiClient.findActive();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/modules?active=true",
      );
      expect(result).toEqual(mockModules);
    });
  });

  describe("findById", () => {
    it("should fetch module by id successfully", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockModule,
      });

      const result = await ModuleApiClient.findById("1");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/modules/1");
      expect(result).toEqual(mockModule);
    });

    it("should return null for 404 errors", async () => {
      const error = createMockHttpClientError("Not found", 404);
      mockHttpClient.get.mockRejectedValue(error);

      const result = await ModuleApiClient.findById("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle other HTTP errors", async () => {
      const error = createMockHttpClientError("Server error", 500);
      mockHttpClient.get.mockRejectedValue(error);

      await expect(ModuleApiClient.findById("1")).rejects.toThrow(
        "Server error",
      );
    });
  });

  describe("create", () => {
    it("should create module successfully", async () => {
      const moduleData = {
        id: "1",
        name: "New Module",
        description: "New module description",
        path: "/new-module",
        active: true,
      };

      const mockCreatedModule = { ...moduleData };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockCreatedModule,
      });

      const result = await ModuleApiClient.create(moduleData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/modules",
        moduleData,
      );
      expect(result).toEqual(mockCreatedModule);
    });

    it("should handle validation errors", async () => {
      const invalidData = {
        id: "",
        name: "Test",
        description: "Test",
        path: "/test",
      };

      await expect(ModuleApiClient.create(invalidData as any)).rejects.toThrow(
        "Dados inválidos",
      );
    });

    it("should handle HTTP client errors", async () => {
      const moduleData = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      const error = createMockHttpClientError("Conflict", 409);
      mockHttpClient.post.mockRejectedValue(error);

      await expect(ModuleApiClient.create(moduleData)).rejects.toThrow(
        "Conflict",
      );
    });
  });

  describe("update", () => {
    it("should update module successfully", async () => {
      const updateData = {
        name: "Updated Module",
        description: "Updated description",
      };

      const mockUpdatedModule = {
        id: "1",
        name: "Updated Module",
        description: "Updated description",
        path: "/test",
        active: true,
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedModule,
      });

      const result = await ModuleApiClient.update("1", updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/modules/1",
        updateData,
      );
      expect(result).toEqual(mockUpdatedModule);
    });

    it("should handle validation errors", async () => {
      const invalidData = {
        name: "",
      };

      await expect(ModuleApiClient.update("1", invalidData)).rejects.toThrow(
        "Dados inválidos",
      );
    });
  });

  describe("delete", () => {
    it("should delete module successfully", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: undefined,
      });

      await ModuleApiClient.delete("1");

      expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/modules/1");
    });

    it("should handle HTTP client errors", async () => {
      const error = createMockHttpClientError("Not found", 404);
      mockHttpClient.delete.mockRejectedValue(error);

      await expect(ModuleApiClient.delete("1")).rejects.toThrow("Not found");
    });
  });

  describe("toggleActive", () => {
    it("should toggle module active status successfully", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: false,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockModule,
      });

      const result = await ModuleApiClient.toggleActive("1");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/modules/1?action=toggle",
      );
      expect(result).toEqual(mockModule);
    });
  });

  describe("addUserToModule", () => {
    it("should add user to module successfully", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockModule,
      });

      const result = await ModuleApiClient.addUserToModule("module1", "user1");

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/modules/module1/users",
        { userId: "user1" },
      );
      expect(result).toEqual(mockModule);
    });
  });

  describe("removeUserFromModule", () => {
    it("should remove user from module successfully", async () => {
      const mockModule = {
        id: "1",
        name: "Test Module",
        description: "Test",
        path: "/test",
        active: true,
      };

      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: mockModule,
      });

      const result = await ModuleApiClient.removeUserFromModule(
        "module1",
        "user1",
      );

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/api/modules/module1/users/user1",
      );
      expect(result).toEqual(mockModule);
    });
  });

  describe("getAllModules", () => {
    it("should call findAll method", async () => {
      const mockModules = [
        {
          id: "1",
          name: "Test Module",
          description: "Test",
          path: "/test",
          active: true,
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockModules,
      });

      const result = await ModuleApiClient.getAllModules();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/modules");
      expect(result).toEqual(mockModules);
    });
  });
});
