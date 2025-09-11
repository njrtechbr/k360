/**
 * Testes abrangentes para EvaluationApiClient
 * Cobre todos os métodos, validações, análises e edge cases
 */

import { EvaluationApiClient } from "../evaluationApiClient";
import { httpClient, HttpClientError } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient");
const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("EvaluationApiClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockEvaluationData = {
    attendantId: "att1",
    nota: 5,
    comentario: "Excelente atendimento",
    data: new Date("2024-01-01"),
    xpGained: 5,
  };

  const mockEvaluation = {
    id: "1",
    ...mockEvaluationData,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  describe("findAll", () => {
    it("should return all evaluations successfully", async () => {
      const mockEvaluations = [
        mockEvaluation,
        {
          id: "2",
          attendantId: "att2",
          nota: 4,
          comentario: "Bom atendimento",
          data: new Date("2024-01-02"),
          xpGained: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockEvaluations,
      });

      const result = await EvaluationApiClient.findAll();

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/evaluations");
      expect(result).toEqual(mockEvaluations);
    });

    it("should return empty array when no evaluations found", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await EvaluationApiClient.findAll();

      expect(result).toEqual([]);
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(EvaluationApiClient.findAll()).rejects.toThrow(networkError);
    });

    it("should handle API errors", async () => {
      const apiError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(apiError);

      await expect(EvaluationApiClient.findAll()).rejects.toThrow(apiError);
    });
  });

  describe("findById", () => {
    it("should return evaluation by id successfully", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockEvaluation,
      });

      const result = await EvaluationApiClient.findById("1");

      expect(mockHttpClient.get).toHaveBeenCalledWith("/api/evaluations/1");
      expect(result).toEqual(mockEvaluation);
    });

    it("should return null when evaluation not found (404)", async () => {
      const notFoundError = new Error("Evaluation not found");
      (notFoundError as any).status = 404;
      mockHttpClient.get.mockRejectedValue(notFoundError);

      const result = await EvaluationApiClient.findById("999");

      expect(result).toBeNull();
    });

    it("should throw error for other HTTP errors", async () => {
      const serverError = new HttpClientError("Internal server error", 500);
      mockHttpClient.get.mockRejectedValue(serverError);

      await expect(EvaluationApiClient.findById("1")).rejects.toThrow(
        serverError,
      );
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network timeout");
      mockHttpClient.get.mockRejectedValue(networkError);

      await expect(EvaluationApiClient.findById("1")).rejects.toThrow(
        networkError,
      );
    });
  });

  describe("findByAttendantId", () => {
    it("should return evaluations by attendant id successfully", async () => {
      const mockEvaluations = [mockEvaluation];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockEvaluations,
      });

      const result = await EvaluationApiClient.findByAttendantId("att1");

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        "/api/evaluations?attendantId=att1",
      );
      expect(result).toEqual(mockEvaluations);
    });

    it("should return empty array when no evaluations found for attendant", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await EvaluationApiClient.findByAttendantId("nonexistent");

      expect(result).toEqual([]);
    });
  });

  describe("create", () => {
    it("should create a new evaluation successfully", async () => {
      const mockCreatedEvaluation = {
        id: "1",
        ...mockEvaluationData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockCreatedEvaluation,
        message: "Evaluation created successfully",
      });

      const result = await EvaluationApiClient.create(mockEvaluationData);

      // Verifica se a data foi convertida para string ISO
      expect(mockHttpClient.post).toHaveBeenCalledWith("/api/evaluations", {
        ...mockEvaluationData,
        data: mockEvaluationData.data.toISOString(),
      });
      expect(result).toEqual(mockCreatedEvaluation);
    });

    it("should validate required fields using Zod schema", async () => {
      const invalidData = {
        attendantId: "",
        nota: 6, // Nota inválida
        comentario: "Test",
        data: new Date(),
        xpGained: 0,
      };

      await expect(
        EvaluationApiClient.create(invalidData as any),
      ).rejects.toThrow();
    });

    it("should handle API errors", async () => {
      const apiError = new HttpClientError("Attendant not found", 404);
      mockHttpClient.post.mockRejectedValue(apiError);

      await expect(
        EvaluationApiClient.create(mockEvaluationData),
      ).rejects.toThrow(apiError);
    });
  });

  describe("update", () => {
    const updateData = {
      nota: 4,
      comentario: "Atendimento atualizado",
      xpGained: 4,
    };

    it("should update evaluation successfully", async () => {
      const mockUpdatedEvaluation = {
        id: "1",
        ...mockEvaluationData,
        ...updateData,
        updatedAt: new Date(),
      };

      mockHttpClient.put.mockResolvedValue({
        success: true,
        data: mockUpdatedEvaluation,
        message: "Evaluation updated successfully",
      });

      const result = await EvaluationApiClient.update("1", updateData);

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        "/api/evaluations/1",
        updateData,
      );
      expect(result).toEqual(mockUpdatedEvaluation);
    });

    it("should validate update data using Zod schema", async () => {
      const invalidData = { nota: 6, comentario: "a".repeat(1001) };
      await expect(
        EvaluationApiClient.update("1", invalidData),
      ).rejects.toThrow();
    });

    it("should handle API errors", async () => {
      const notFoundError = new HttpClientError("Evaluation not found", 404);
      mockHttpClient.put.mockRejectedValue(notFoundError);

      await expect(
        EvaluationApiClient.update("999", updateData),
      ).rejects.toThrow(notFoundError);
    });
  });

  describe("delete", () => {
    it("should delete evaluation successfully", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { message: "Evaluation deleted successfully" },
      });

      await EvaluationApiClient.delete("1");

      expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/evaluations/1");
    });

    it("should handle API errors", async () => {
      const notFoundError = new HttpClientError("Evaluation not found", 404);
      mockHttpClient.delete.mockRejectedValue(notFoundError);

      await expect(EvaluationApiClient.delete("999")).rejects.toThrow(
        notFoundError,
      );
    });
  });

  describe("createBatch", () => {
    const evaluationsData = [
      {
        attendantId: "att1",
        nota: 5,
        comentario: "Excelente atendimento",
        data: new Date("2024-01-01"),
        xpGained: 5,
      },
      {
        attendantId: "att2",
        nota: 4,
        comentario: "Bom atendimento",
        data: new Date("2024-01-02"),
        xpGained: 3,
      },
    ];

    it("should create multiple evaluations successfully", async () => {
      const mockCreatedEvaluations = evaluationsData.map((data, index) => ({
        id: String(index + 1),
        ...data,
        importId: "import-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      mockHttpClient.post.mockResolvedValue({
        success: true,
        data: mockCreatedEvaluations,
      });

      const result = await EvaluationApiClient.createBatch(
        evaluationsData,
        "import-123",
      );

      // Verifica se as datas foram convertidas para strings ISO
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        "/api/evaluations",
        evaluationsData.map((data) => ({
          ...data,
          data: data.data.toISOString(),
          importId: "import-123",
        })),
      );
      expect(result).toEqual(mockCreatedEvaluations);
    });

    it("should validate evaluations data using Zod schema", async () => {
      const invalidData = [{ attendantId: "", nota: 6 }];
      await expect(
        EvaluationApiClient.createBatch(invalidData as any, "import-123"),
      ).rejects.toThrow();
    });

    it("should handle API errors", async () => {
      const apiError = new HttpClientError("Batch creation failed", 500);
      mockHttpClient.post.mockRejectedValue(apiError);

      await expect(
        EvaluationApiClient.createBatch(evaluationsData, "import-123"),
      ).rejects.toThrow(apiError);
    });
  });

  describe("findByDateRange", () => {
    it("should return evaluations by date range successfully", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      const mockEvaluations = [mockEvaluation];

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockEvaluations,
      });

      const result = await EvaluationApiClient.findByDateRange(
        startDate,
        endDate,
      );

      expect(mockHttpClient.get).toHaveBeenCalledWith(
        `/api/evaluations?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`,
      );
      expect(result).toEqual(mockEvaluations);
    });

    it("should return empty array when no evaluations in date range", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");

      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: [],
      });

      const result = await EvaluationApiClient.findByDateRange(
        startDate,
        endDate,
      );

      expect(result).toEqual([]);
    });

    it("should handle API errors", async () => {
      const startDate = new Date("2024-01-01");
      const endDate = new Date("2024-01-31");
      const apiError = new HttpClientError("Date range error", 400);

      mockHttpClient.get.mockRejectedValue(apiError);

      await expect(
        EvaluationApiClient.findByDateRange(startDate, endDate),
      ).rejects.toThrow(apiError);
    });
  });

  describe("deleteByImportId", () => {
    it("should delete evaluations by import id successfully", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { count: 10 },
      });

      const result = await EvaluationApiClient.deleteByImportId("import-123");

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        "/api/evaluations/imports/import-123",
      );
      expect(result).toBe(10);
    });

    it("should handle no evaluations found for import id", async () => {
      mockHttpClient.delete.mockResolvedValue({
        success: true,
        data: { count: 0 },
      });

      const result =
        await EvaluationApiClient.deleteByImportId("nonexistent-import");

      expect(result).toBe(0);
    });

    it("should handle API errors", async () => {
      const deleteError = new HttpClientError("Cannot delete evaluations", 409);
      mockHttpClient.delete.mockRejectedValue(deleteError);

      await expect(
        EvaluationApiClient.deleteByImportId("import-123"),
      ).rejects.toThrow(deleteError);
    });
  });

  describe("Backward Compatibility", () => {
    it("should maintain interface compatibility with original service", async () => {
      // Testa se todos os métodos públicos estão disponíveis
      expect(typeof EvaluationApiClient.findAll).toBe("function");
      expect(typeof EvaluationApiClient.findById).toBe("function");
      expect(typeof EvaluationApiClient.findByAttendantId).toBe("function");
      expect(typeof EvaluationApiClient.create).toBe("function");
      expect(typeof EvaluationApiClient.update).toBe("function");
      expect(typeof EvaluationApiClient.delete).toBe("function");
      expect(typeof EvaluationApiClient.createBatch).toBe("function");
      expect(typeof EvaluationApiClient.findByDateRange).toBe("function");
      expect(typeof EvaluationApiClient.deleteByImportId).toBe("function");
    });

    it("should return same data structure as original service", async () => {
      mockHttpClient.get.mockResolvedValue({
        success: true,
        data: mockEvaluation,
      });

      const result = await EvaluationApiClient.findById("1");

      // Verifica se a estrutura de dados é mantida
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("attendantId");
      expect(result).toHaveProperty("nota");
      expect(result).toHaveProperty("comentario");
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("xpGained");
      expect(result).toHaveProperty("createdAt");
      expect(result).toHaveProperty("updatedAt");
    });
  });
});
