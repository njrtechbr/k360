/**
 * Testes abrangentes para AttendantApiClient
 * Cobre todos os métodos, validações, import/export e edge cases
 */

import { AttendantApiClient } from "../attendantApiClient";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("AttendantApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockAttendantData = {
    name: "Test Attendant",
    email: "test@test.com",
    funcao: "Atendente",
    setor: "Vendas",
    status: "Ativo",
    telefone: "11999999999",
    rg: "123456789",
    cpf: "12345678901",
    dataAdmissao: new Date("2024-01-01"),
    dataNascimento: new Date("1990-01-01"),
  };

  const mockAttendant = {
    id: "1",
    ...mockAttendantData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("findAll", () => {
    it("should return all attendants successfully", async () => {
      const mockAttendants = [
        mockAttendant,
        {
          id: "2",
          name: "Attendant 2",
          email: "attendant2@test.com",
          funcao: "Supervisor",
          setor: "Suporte",
          status: "Ativo",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendants,
        pagination: {
          page: 1,
          limit: 10,
          total: 2,
          totalPages: 1,
        },
      });

      const result = await AttendantApiClient.findAll();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/attendants");
      expect(result).toEqual(mockAttendants);
    });

    it("should handle filters and pagination", async () => {
      const filters = {
        setor: "Vendas",
        status: "Ativo",
        page: 2,
        limit: 5,
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [mockAttendant],
      });

      const result = await AttendantApiClient.findAll(filters);

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?setor=Vendas&status=Ativo&page=2&limit=5",
      );
      expect(result).toEqual([mockAttendant]);
    });

    it("should return empty array when no attendants found", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await AttendantApiClient.findAll();

      expect(result).toEqual([]);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(AttendantApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar atendentes",
      );
    });

    it("should handle API errors", async () => {
      const apiError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(apiError);

      await expect(AttendantApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar atendentes",
      );
    });

    it("should handle unsuccessful API response", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: false,
        error: "Database connection failed",
        data: null,
      });

      await expect(AttendantApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar atendentes",
      );
    });
  });

  describe("findById", () => {
    it("should return attendant by id successfully", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendant,
      });

      const result = await AttendantApiClient.findById("1");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/attendants/1");
      expect(result).toEqual(mockAttendant);
    });

    it("should return null when attendant not found (404)", async () => {
      const notFoundError = new HttpClientError("Attendant not found", 404);
      mockHttpClient.get.mockRejectedValue(notFoundError);

      const result = await AttendantApiClient.findById("999");

      expect(result).toBeNull();
    });

    it("should throw error for other HTTP errors", async () => {
      const serverError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(serverError);

      await expect(AttendantApiClient.findById("1")).rejects.toThrow(
        "Erro ao buscar atendente",
      );
    });

    it("should validate id parameter", async () => {
      await expect(AttendantApiClient.findById("")).rejects.toThrow(
        "ID do atendente é obrigatório",
      );
      await expect(AttendantApiClient.findById(null as any)).rejects.toThrow(
        "ID do atendente é obrigatório",
      );
      await expect(
        AttendantApiClient.findById(undefined as any),
      ).rejects.toThrow("ID do atendente é obrigatório");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(AttendantApiClient.findById("1")).rejects.toThrow(
        "Erro ao buscar atendente",
      );
    });
  });

  describe("findByEmail", () => {
    it("should return attendant by email successfully", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendant,
      });

      const result = await AttendantApiClient.findByEmail("test@test.com");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?email=test%40test.com",
      );
      expect(result).toEqual(mockAttendant);
    });

    it("should return null when attendant not found by email", async () => {
      const notFoundError = new HttpClientError("Attendant not found", 404);
      mockHttpClient.get.mockRejectedValue(notFoundError);

      const result = await AttendantApiClient.findByEmail(
        "nonexistent@test.com",
      );

      expect(result).toBeNull();
    });

    it("should validate email parameter", async () => {
      await expect(AttendantApiClient.findByEmail("")).rejects.toThrow(
        "Email é obrigatório",
      );
      await expect(
        AttendantApiClient.findByEmail("invalid-email"),
      ).rejects.toThrow("Email inválido");
    });

    it("should handle special characters in email", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendant,
      });

      await AttendantApiClient.findByEmail("test+special@test.com");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?email=test%2Bspecial%40test.com",
      );
    });
  });

  describe("create", () => {
    it("should create a new attendant successfully", async () => {
      const mockCreatedAttendant = {
        id: "1",
        ...mockAttendantData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockCreatedAttendant,
        message: "Attendant created successfully",
      });

      const result = await AttendantApiClient.create(mockAttendantData);

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/attendants",
        mockAttendantData,
      );
      expect(result).toEqual(mockCreatedAttendant);
    });

    it("should validate required fields", async () => {
      const invalidData = {
        name: "",
        email: "invalid-email",
        funcao: "",
        setor: "",
        status: "",
      };

      await expect(
        AttendantApiClient.create(invalidData as any),
      ).rejects.toThrow("Dados inválidos");
    });

    it("should validate name field", async () => {
      const invalidName = { ...mockAttendantData, name: "" };
      await expect(AttendantApiClient.create(invalidName)).rejects.toThrow(
        "Nome é obrigatório",
      );

      const shortName = { ...mockAttendantData, name: "A" };
      await expect(AttendantApiClient.create(shortName)).rejects.toThrow(
        "Nome deve ter pelo menos 2 caracteres",
      );
    });

    it("should validate email field", async () => {
      const invalidEmail = { ...mockAttendantData, email: "invalid-email" };
      await expect(AttendantApiClient.create(invalidEmail)).rejects.toThrow(
        "Email inválido",
      );

      const emptyEmail = { ...mockAttendantData, email: "" };
      await expect(AttendantApiClient.create(emptyEmail)).rejects.toThrow(
        "Email é obrigatório",
      );
    });

    it("should validate CPF field", async () => {
      const invalidCpf = { ...mockAttendantData, cpf: "123" };
      await expect(AttendantApiClient.create(invalidCpf)).rejects.toThrow(
        "CPF inválido",
      );

      const emptyCpf = { ...mockAttendantData, cpf: "" };
      await expect(AttendantApiClient.create(emptyCpf)).rejects.toThrow(
        "CPF é obrigatório",
      );
    });

    it("should validate phone field", async () => {
      const invalidPhone = { ...mockAttendantData, telefone: "123" };
      await expect(AttendantApiClient.create(invalidPhone)).rejects.toThrow(
        "Telefone inválido",
      );
    });

    it("should validate dates", async () => {
      const futureBirthDate = {
        ...mockAttendantData,
        dataNascimento: new Date("2030-01-01"),
      };
      await expect(AttendantApiClient.create(futureBirthDate)).rejects.toThrow(
        "Data de nascimento não pode ser no futuro",
      );

      const futureAdmissionDate = {
        ...mockAttendantData,
        dataAdmissao: new Date("2030-01-01"),
      };
      await expect(
        AttendantApiClient.create(futureAdmissionDate),
      ).rejects.toThrow("Data de admissão não pode ser no futuro");
    });

    it("should handle duplicate email error", async () => {
      const duplicateError = new HttpClientError(
        "Email already exists",
        409,
        "DUPLICATE_EMAIL",
        { email: ["Email já está em uso"] },
      );

      mockHttpClient.post.mockRejectedValue(duplicateError);

      await expect(
        AttendantApiClient.create(mockAttendantData),
      ).rejects.toThrow("Email already exists");
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

      await expect(
        AttendantApiClient.create(mockAttendantData),
      ).rejects.toThrow("Validation failed");
    });
  });

  describe("update", () => {
    const updateData = {
      name: "Updated Attendant",
      email: "updated@test.com",
      funcao: "Supervisor",
    };

    it("should update attendant successfully", async () => {
      const mockUpdatedAttendant = {
        id: "1",
        ...mockAttendantData,
        ...updateData,
        updatedAt: new Date(),
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedAttendant,
        message: "Attendant updated successfully",
      });

      const result = await AttendantApiClient.update("1", updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/attendants/1",
        updateData,
      );
      expect(result).toEqual(mockUpdatedAttendant);
    });

    it("should validate id parameter", async () => {
      await expect(AttendantApiClient.update("", updateData)).rejects.toThrow(
        "ID do atendente é obrigatório",
      );
    });

    it("should validate update data", async () => {
      const invalidData = { name: "", email: "invalid" };
      await expect(AttendantApiClient.update("1", invalidData)).rejects.toThrow(
        "Dados inválidos",
      );
    });

    it("should handle attendant not found error", async () => {
      const notFoundError = new HttpClientError("Attendant not found", 404);
      mockHttpClient.put.mockRejectedValue(notFoundError);

      await expect(
        AttendantApiClient.update("999", updateData),
      ).rejects.toThrow("Attendant not found");
    });

    it("should allow partial updates", async () => {
      const partialData = { name: "New Name Only" };
      const mockUpdatedAttendant = {
        ...mockAttendant,
        name: "New Name Only",
        updatedAt: new Date(),
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedAttendant,
      });

      const result = await AttendantApiClient.update("1", partialData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/attendants/1",
        partialData,
      );
      expect(result).toEqual(mockUpdatedAttendant);
    });
  });

  describe("delete", () => {
    it("should delete attendant successfully", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { message: "Attendant deleted successfully" },
      });

      await AttendantApiClient.delete("1");

      expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/attendants/1");
    });

    it("should validate id parameter", async () => {
      await expect(AttendantApiClient.delete("")).rejects.toThrow(
        "ID do atendente é obrigatório",
      );
    });

    it("should handle attendant not found error", async () => {
      const notFoundError = new HttpClientError("Attendant not found", 404);
      mockHttpClient.delete.mockRejectedValue(notFoundError);

      await expect(AttendantApiClient.delete("999")).rejects.toThrow(
        "Attendant not found",
      );
    });

    it("should handle cannot delete error", async () => {
      const cannotDeleteError = new HttpClientError(
        "Cannot delete attendant with evaluations",
        409,
        "CANNOT_DELETE",
      );
      mockHttpClient.delete.mockRejectedValue(cannotDeleteError);

      await expect(AttendantApiClient.delete("1")).rejects.toThrow(
        "Cannot delete attendant with evaluations",
      );
    });
  });

  describe("createBatch", () => {
    const attendantsData = [
      {
        name: "Attendant 1",
        email: "attendant1@test.com",
        funcao: "Atendente",
        setor: "Vendas",
        status: "Ativo",
        telefone: "11999999999",
        rg: "123456789",
        cpf: "12345678901",
        dataAdmissao: new Date("2024-01-01"),
        dataNascimento: new Date("1990-01-01"),
      },
      {
        name: "Attendant 2",
        email: "attendant2@test.com",
        funcao: "Supervisor",
        setor: "Suporte",
        status: "Ativo",
        telefone: "11888888888",
        rg: "987654321",
        cpf: "10987654321",
        dataAdmissao: new Date("2024-01-01"),
        dataNascimento: new Date("1985-01-01"),
      },
    ];

    it("should create multiple attendants successfully", async () => {
      const mockCreatedAttendants = attendantsData.map((data, index) => ({
        id: String(index + 1),
        ...data,
        importId: "import-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          created: mockCreatedAttendants,
          errors: [],
          duplicates: [],
        },
        message: "2 attendants created successfully",
      });

      const result = await AttendantApiClient.createBatch(
        attendantsData,
        "import-123",
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/attendants/batch",
        {
          attendants: attendantsData.map((data) => ({
            ...data,
            importId: "import-123",
          })),
        },
      );
      expect(result.created).toEqual(mockCreatedAttendants);
    });

    it("should validate attendants data", async () => {
      const invalidData = [{ name: "", email: "invalid" }];
      await expect(
        AttendantApiClient.createBatch(invalidData as any, "import-123"),
      ).rejects.toThrow("Dados inválidos");
    });

    it("should validate import id", async () => {
      await expect(
        AttendantApiClient.createBatch(attendantsData, ""),
      ).rejects.toThrow("ID de importação é obrigatório");
    });

    it("should handle partial success with errors", async () => {
      const mockResult = {
        created: [{ id: "1", ...attendantsData[0], importId: "import-123" }],
        errors: [{ row: 2, error: "Email already exists" }],
        duplicates: [],
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockResult,
      });

      const result = await AttendantApiClient.createBatch(
        attendantsData,
        "import-123",
      );

      expect(result.created).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
    });

    it("should handle empty array", async () => {
      await expect(
        AttendantApiClient.createBatch([], "import-123"),
      ).rejects.toThrow("Lista de atendentes não pode estar vazia");
    });

    it("should handle large batches", async () => {
      const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
        ...mockAttendantData,
        name: `Attendant ${i + 1}`,
        email: `attendant${i + 1}@test.com`,
        cpf: `${String(i + 1).padStart(11, "0")}`,
      }));

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: {
          created: largeBatch.map((data, index) => ({
            id: String(index + 1),
            ...data,
          })),
          errors: [],
          duplicates: [],
        },
      });

      const result = await AttendantApiClient.createBatch(
        largeBatch,
        "import-large",
      );

      expect(result.created).toHaveLength(1000);
    });
  });

  describe("findBySetor", () => {
    it("should return attendants by setor successfully", async () => {
      const mockAttendants = [mockAttendant];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendants,
      });

      const result = await AttendantApiClient.findBySetor("Vendas");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?setor=Vendas",
      );
      expect(result).toEqual(mockAttendants);
    });

    it("should validate setor parameter", async () => {
      await expect(AttendantApiClient.findBySetor("")).rejects.toThrow(
        "Setor é obrigatório",
      );
    });

    it("should handle special characters in setor", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      await AttendantApiClient.findBySetor("Vendas & Marketing");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?setor=Vendas%20%26%20Marketing",
      );
    });

    it("should return empty array when no attendants found in setor", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await AttendantApiClient.findBySetor("Inexistente");

      expect(result).toEqual([]);
    });
  });

  describe("findByFuncao", () => {
    it("should return attendants by funcao successfully", async () => {
      const mockAttendants = [mockAttendant];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendants,
      });

      const result = await AttendantApiClient.findByFuncao("Atendente");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?funcao=Atendente",
      );
      expect(result).toEqual(mockAttendants);
    });

    it("should validate funcao parameter", async () => {
      await expect(AttendantApiClient.findByFuncao("")).rejects.toThrow(
        "Função é obrigatória",
      );
    });
  });

  describe("searchAttendants", () => {
    it("should search attendants by query", async () => {
      const mockAttendants = [mockAttendant];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendants,
        pagination: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      });

      const result = await AttendantApiClient.searchAttendants("Test", {
        page: 1,
        limit: 10,
      });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants?search=Test&page=1&limit=10",
      );
      expect(result).toEqual(mockAttendants);
    });

    it("should validate search query", async () => {
      await expect(AttendantApiClient.searchAttendants("")).rejects.toThrow(
        "Termo de busca é obrigatório",
      );
      await expect(AttendantApiClient.searchAttendants("ab")).rejects.toThrow(
        "Termo de busca deve ter pelo menos 3 caracteres",
      );
    });
  });

  describe("deleteByImportId", () => {
    it("should delete attendants by import id successfully", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { count: 5, message: "5 attendants deleted" },
      });

      const result = await AttendantApiClient.deleteByImportId("import-123");

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/api/attendants/imports/import-123",
      );
      expect(result).toBe(5);
    });

    it("should validate import id parameter", async () => {
      await expect(AttendantApiClient.deleteByImportId("")).rejects.toThrow(
        "ID de importação é obrigatório",
      );
    });

    it("should handle no attendants found for import id", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { count: 0, message: "No attendants found for import ID" },
      });

      const result =
        await AttendantApiClient.deleteByImportId("nonexistent-import");

      expect(result).toBe(0);
    });

    it("should handle delete errors", async () => {
      const deleteError = new HttpClientError(
        "Cannot delete attendants with evaluations",
        409,
      );
      mockHttpClient.delete.mockRejectedValue(deleteError);

      await expect(
        AttendantApiClient.deleteByImportId("import-123"),
      ).rejects.toThrow("Cannot delete attendants with evaluations");
    });
  });

  describe("getImportHistory", () => {
    it("should return import history successfully", async () => {
      const mockHistory = [
        {
          importId: "import-123",
          createdAt: new Date(),
          count: 5,
          status: "completed",
        },
        {
          importId: "import-124",
          createdAt: new Date(),
          count: 3,
          status: "completed",
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockHistory,
      });

      const result = await AttendantApiClient.getImportHistory();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants/imports",
      );
      expect(result).toEqual(mockHistory);
    });

    it("should handle pagination for import history", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      await AttendantApiClient.getImportHistory({ page: 2, limit: 5 });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants/imports?page=2&limit=5",
      );
    });
  });

  describe("getStatistics", () => {
    it("should return attendant statistics successfully", async () => {
      const mockStats = {
        total: 100,
        active: 85,
        inactive: 15,
        bySetor: {
          Vendas: 40,
          Suporte: 35,
          Marketing: 25,
        },
        byFuncao: {
          Atendente: 70,
          Supervisor: 20,
          Gerente: 10,
        },
      };

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockStats,
      });

      const result = await AttendantApiClient.getStatistics();

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants/statistics",
      );
      expect(result).toEqual(mockStats);
    });

    it("should handle statistics with filters", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: { total: 40, active: 35, inactive: 5 },
      });

      await AttendantApiClient.getStatistics({ setor: "Vendas" });

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/attendants/statistics?setor=Vendas",
      );
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain interface compatibility with original service", async () => {
      // Testa se todos os métodos públicos estão disponíveis
      expect(typeof AttendantApiClient.findAll).toBe("function");
      expect(typeof AttendantApiClient.findById).toBe("function");
      expect(typeof AttendantApiClient.findByEmail).toBe("function");
      expect(typeof AttendantApiClient.create).toBe("function");
      expect(typeof AttendantApiClient.update).toBe("function");
      expect(typeof AttendantApiClient.delete).toBe("function");
      expect(typeof AttendantApiClient.createBatch).toBe("function");
      expect(typeof AttendantApiClient.findBySetor).toBe("function");
      expect(typeof AttendantApiClient.deleteByImportId).toBe("function");
    });

    it("should return same data structure as original service", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockAttendant,
      });

      const result = await AttendantApiClient.findById("1");

      // Verifica se a estrutura de dados é mantida
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("email");
      expect(result).toHaveProperty("funcao");
      expect(result).toHaveProperty("setor");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });
  });

  describe("Error Message Localization", () => {
    it("should provide Portuguese error messages", async () => {
      const networkError = new Error("Network error");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(AttendantApiClient.findAll()).rejects.toThrow(
        "Erro ao buscar atendentes",
      );
      await expect(AttendantApiClient.findById("1")).rejects.toThrow(
        "Erro ao buscar atendente",
      );
    });

    it("should handle validation errors in Portuguese", async () => {
      await expect(AttendantApiClient.findById("")).rejects.toThrow(
        "ID do atendente é obrigatório",
      );
      await expect(
        AttendantApiClient.create({
          name: "",
          email: "",
          funcao: "",
          setor: "",
          status: "",
        } as any),
      ).rejects.toThrow("Nome é obrigatório");
    });
  });

  describe("Data Validation Helpers", () => {
    it("should validate CPF format correctly", async () => {
      const validCpfs = ["12345678901", "123.456.789-01"];
      const invalidCpfs = ["123", "12345678900", "abcdefghijk"];

      for (const cpf of validCpfs) {
        const data = { ...mockAttendantData, cpf };
        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { id: "1", ...data },
        });

        await expect(AttendantApiClient.create(data)).resolves.toBeDefined();
      }

      for (const cpf of invalidCpfs) {
        const data = { ...mockAttendantData, cpf };
        await expect(AttendantApiClient.create(data)).rejects.toThrow(
          "CPF inválido",
        );
      }
    });

    it("should validate phone format correctly", async () => {
      const validPhones = [
        "11999999999",
        "(11) 99999-9999",
        "+55 11 99999-9999",
      ];
      const invalidPhones = ["123", "1199999999", "abcdefghijk"];

      for (const telefone of validPhones) {
        const data = { ...mockAttendantData, telefone };
        mockHttpClient.post.mockResolvedValue({
          success: true,
          data: { id: "1", ...data },
        });

        await expect(AttendantApiClient.create(data)).resolves.toBeDefined();
      }

      for (const telefone of invalidPhones) {
        const data = { ...mockAttendantData, telefone };
        await expect(AttendantApiClient.create(data)).rejects.toThrow(
          "Telefone inválido",
        );
      }
    });
  });
});
