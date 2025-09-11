/**
 * Testes de integração para endpoints de API
 * Testa a comunicação completa entre HTTP client e APIs
 */

import { NextRequest } from "next/server";
import { httpClient } from "@/lib/httpClient";

// Mock das rotas de API
jest.mock("../users/route", () => ({
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  DELETE: jest.fn(),
}));

jest.mock("../attendants/route", () => ({
  GET: jest.fn(),
  POST: jest.fn(),
  PUT: jest.fn(),
  DELETE: jest.fn(),
}));

jest.mock("../evaluations/route", () => ({
  GET: jest.fn(),
  POST: jest.fn(),
}));

jest.mock("../gamification/route", () => ({
  GET: jest.fn(),
  POST: jest.fn(),
}));

// Mock do fetch global para simular respostas de API
global.fetch = jest.fn();

describe("API Integration Tests", () => {
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("Users API Integration", () => {
    it("should fetch users list successfully", async () => {
      const mockUsers = [
        { id: "1", name: "User 1", email: "user1@test.com" },
        { id: "2", name: "User 2", email: "user2@test.com" },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockUsers,
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
          },
        }),
      } as any);

      const response = await httpClient.get("/api/users");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockUsers);
      expect(response.pagination).toBeDefined();
    });

    it("should create user successfully", async () => {
      const newUser = { name: "New User", email: "new@test.com" };
      const createdUser = { id: "3", ...newUser };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: createdUser,
          message: "User created successfully",
        }),
      } as any);

      const response = await httpClient.post("/api/users", newUser);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(newUser),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdUser);
      expect(response.message).toBe("User created successfully");
    });

    it("should handle user validation errors", async () => {
      const invalidUser = { name: "", email: "invalid-email" };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Validation failed",
          code: "VALIDATION_ERROR",
          details: {
            name: ["Name is required"],
            email: ["Invalid email format"],
          },
        }),
      } as any);

      await expect(httpClient.post("/api/users", invalidUser)).rejects.toThrow(
        "Validation failed",
      );
    });

    it("should update user successfully", async () => {
      const updateData = { name: "Updated User" };
      const updatedUser = {
        id: "1",
        name: "Updated User",
        email: "user1@test.com",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: updatedUser,
          message: "User updated successfully",
        }),
      } as any);

      const response = await httpClient.put("/api/users/1", updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(updatedUser);
    });

    it("should delete user successfully", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: "User deleted successfully" },
        }),
      } as any);

      const response = await httpClient.delete("/api/users/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users/1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );

      expect(response.success).toBe(true);
    });
  });

  describe("Attendants API Integration", () => {
    it("should fetch attendants with filters", async () => {
      const mockAttendants = [
        { id: "1", name: "Attendant 1", setor: "Vendas" },
        { id: "2", name: "Attendant 2", setor: "Suporte" },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockAttendants,
        }),
      } as any);

      const response = await httpClient.get(
        "/api/attendants?setor=Vendas&active=true",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/attendants?setor=Vendas&active=true",
        expect.any(Object),
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockAttendants);
    });

    it("should import attendants from CSV", async () => {
      const importData = {
        csvData: "name,email,setor\nTest User,test@test.com,Vendas",
        validateOnly: false,
      };

      const importResult = {
        imported: 1,
        errors: [],
        duplicates: [],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: importResult,
          message: "1 attendant imported successfully",
        }),
      } as any);

      const response = await httpClient.post(
        "/api/attendants/import",
        importData,
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(importResult);
    });

    it("should handle attendant not found error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Attendant not found",
          code: "NOT_FOUND",
        }),
      } as any);

      await expect(httpClient.get("/api/attendants/999")).rejects.toThrow(
        "Attendant not found",
      );
    });
  });

  describe("Evaluations API Integration", () => {
    it("should fetch evaluations with pagination", async () => {
      const mockEvaluations = [
        { id: "1", attendantId: "1", rating: 5, comment: "Excellent" },
        { id: "2", attendantId: "2", rating: 4, comment: "Good" },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockEvaluations,
          pagination: {
            page: 1,
            limit: 20,
            total: 50,
            totalPages: 3,
          },
        }),
      } as any);

      const response = await httpClient.get("/api/evaluations?page=1&limit=20");

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockEvaluations);
      expect(response.pagination?.total).toBe(50);
    });

    it("should create evaluation successfully", async () => {
      const newEvaluation = {
        attendantId: "1",
        rating: 5,
        comment: "Excellent service",
      };

      const createdEvaluation = {
        id: "1",
        ...newEvaluation,
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: createdEvaluation,
          message: "Evaluation created successfully",
        }),
      } as any);

      const response = await httpClient.post("/api/evaluations", newEvaluation);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdEvaluation);
    });

    it("should handle evaluation validation errors", async () => {
      const invalidEvaluation = {
        attendantId: "",
        rating: 6, // Invalid rating
      };

      mockFetch.mockResolvedValue({
        ok: false,
        status: 422,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Validation failed",
          details: {
            attendantId: ["Attendant ID is required"],
            rating: ["Rating must be between 1 and 5"],
          },
        }),
      } as any);

      await expect(
        httpClient.post("/api/evaluations", invalidEvaluation),
      ).rejects.toThrow("Validation failed");
    });
  });

  describe("Gamification API Integration", () => {
    it("should fetch gamification data", async () => {
      const mockGamificationData = {
        seasons: [{ id: "1", name: "Season 1", active: true }],
        achievements: [
          { id: "1", name: "First Evaluation", type: "MILESTONE" },
        ],
        xpEvents: [
          { id: "1", attendantId: "1", points: 100, type: "EVALUATION" },
        ],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockGamificationData,
        }),
      } as any);

      const response = await httpClient.get("/api/gamification");

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockGamificationData);
    });

    it("should fetch active season", async () => {
      const mockActiveSeason = {
        id: "1",
        name: "Current Season",
        active: true,
        startDate: "2024-01-01",
        endDate: "2024-12-31",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockActiveSeason,
        }),
      } as any);

      const response = await httpClient.get("/api/gamification/seasons/active");

      expect(response.success).toBe(true);
      expect(response.data).toEqual(mockActiveSeason);
    });

    it("should handle no active season", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "No active season found",
          code: "NO_ACTIVE_SEASON",
        }),
      } as any);

      await expect(
        httpClient.get("/api/gamification/seasons/active"),
      ).rejects.toThrow("No active season found");
    });

    it("should create XP grant successfully", async () => {
      const xpGrant = {
        attendantId: "1",
        points: 50,
        reason: "Manual XP grant",
        type: "MANUAL",
      };

      const createdXpGrant = {
        id: "1",
        ...xpGrant,
        createdAt: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: createdXpGrant,
          message: "XP grant created successfully",
        }),
      } as any);

      const response = await httpClient.post(
        "/api/gamification/xp-grants",
        xpGrant,
      );

      expect(response.success).toBe(true);
      expect(response.data).toEqual(createdXpGrant);
    });
  });

  describe("Error Handling Integration", () => {
    it("should handle 500 server errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Internal server error",
          code: "INTERNAL_ERROR",
        }),
      } as any);

      await expect(httpClient.get("/api/users")).rejects.toThrow(
        "Internal server error",
      );
    });

    it("should handle network timeouts", async () => {
      mockFetch.mockRejectedValue(new Error("Request timeout"));

      await expect(httpClient.get("/api/users")).rejects.toThrow(
        "Request timeout",
      );
    });

    it("should handle malformed JSON responses", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      } as any);

      await expect(httpClient.get("/api/users")).rejects.toThrow();
    });

    it("should handle authentication errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Unauthorized",
          code: "UNAUTHORIZED",
        }),
      } as any);

      await expect(httpClient.get("/api/users")).rejects.toThrow(
        "Unauthorized",
      );
    });

    it("should handle authorization errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Forbidden",
          code: "FORBIDDEN",
        }),
      } as any);

      await expect(httpClient.get("/api/users")).rejects.toThrow("Forbidden");
    });
  });

  describe("Performance and Caching", () => {
    it("should handle concurrent requests", async () => {
      const mockData1 = [{ id: "1", name: "User 1" }];
      const mockData2 = [{ id: "1", name: "Attendant 1" }];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockData1,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: mockData2,
          }),
        } as any);

      const [usersResponse, attendantsResponse] = await Promise.all([
        httpClient.get("/api/users"),
        httpClient.get("/api/attendants"),
      ]);

      expect(usersResponse.data).toEqual(mockData1);
      expect(attendantsResponse.data).toEqual(mockData2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should handle large response payloads", async () => {
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: String(i + 1),
        name: `User ${i + 1}`,
        email: `user${i + 1}@test.com`,
      }));

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: largeDataset,
          pagination: {
            page: 1,
            limit: 1000,
            total: 1000,
            totalPages: 1,
          },
        }),
      } as any);

      const response = await httpClient.get("/api/users?limit=1000");

      expect(response.success).toBe(true);
      expect(response.data).toHaveLength(1000);
      expect(response.pagination?.total).toBe(1000);
    });

    it("should handle requests with custom headers", async () => {
      const mockData = [{ id: "1", name: "User 1" }];

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockData,
        }),
      } as any);

      await httpClient.get("/api/users", {
        headers: {
          Authorization: "Bearer token123",
          "X-Custom-Header": "custom-value",
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "/api/users",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer token123",
            "X-Custom-Header": "custom-value",
          }),
        }),
      );
    });
  });
});
