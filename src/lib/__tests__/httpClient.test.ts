/**
 * Testes para o HTTP Client Service
 * Cobre todos os cenários de uso, retry logic e error handling
 */

import { HttpClient, HttpClientError, createHttpClient } from "../httpClient";

// Mock do fetch global
global.fetch = jest.fn();

// Mock do setTimeout para testes de retry
jest.useFakeTimers();

describe("HttpClient", () => {
  let httpClient: HttpClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    httpClient = new HttpClient({
      baseURL: "http://localhost:3000",
      timeout: 5000,
      retries: 2,
      retryDelay: 1000,
    });
    mockFetch.mockClear();
    jest.clearAllTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe("Constructor and Configuration", () => {
    it("should create instance with default config", () => {
      const client = new HttpClient();
      expect(client).toBeInstanceOf(HttpClient);
    });

    it("should create instance with custom config", () => {
      const config = {
        baseURL: "https://api.example.com",
        timeout: 10000,
        retries: 5,
        retryDelay: 2000,
        headers: { Authorization: "Bearer token" },
      };

      const client = new HttpClient(config);
      expect(client).toBeInstanceOf(HttpClient);
    });

    it("should create client using factory function", () => {
      const client = createHttpClient({ baseURL: "https://test.com" });
      expect(client).toBeInstanceOf(HttpClient);
    });
  });

  describe("GET requests", () => {
    it("should make successful GET request", async () => {
      const mockData = { id: 1, name: "Test User" };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockData,
          message: "Success",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.get("/api/users");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
          signal: expect.any(AbortSignal),
        }),
      );

      expect(result).toEqual({
        success: true,
        data: mockData,
        message: "Success",
      });
    });

    it("should handle GET request with custom headers", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: [],
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await httpClient.get("/api/users", {
        headers: { Authorization: "Bearer token123" },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users",
        expect.objectContaining({
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            Authorization: "Bearer token123",
          }),
        }),
      );
    });

    it("should handle 404 errors", async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "User not found",
          code: "NOT_FOUND",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(httpClient.get("/api/users/999")).rejects.toThrow(
        HttpClientError,
      );

      try {
        await httpClient.get("/api/users/999");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).status).toBe(404);
        expect((error as HttpClientError).code).toBe("NOT_FOUND");
        expect((error as HttpClientError).message).toBe("User not found");
      }
    });

    it("should handle validation errors with details", async () => {
      const mockResponse = {
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
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      try {
        await httpClient.get("/api/users/invalid");
      } catch (error) {
        expect(error).toBeInstanceOf(HttpClientError);
        expect((error as HttpClientError).details).toEqual({
          name: ["Name is required"],
          email: ["Invalid email format"],
        });
      }
    });
  });

  describe("POST requests", () => {
    it("should make successful POST request with data", async () => {
      const postData = { name: "New User", email: "user@test.com" };
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 1, ...postData },
          message: "User created successfully",
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.post("/api/users", postData);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ id: 1, ...postData });
    });

    it("should make POST request without data", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: "Action completed" },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await httpClient.post("/api/actions/trigger");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/actions/trigger",
        expect.objectContaining({
          method: "POST",
          body: undefined,
        }),
      );
    });
  });

  describe("PUT requests", () => {
    it("should make successful PUT request", async () => {
      const updateData = { name: "Updated User" };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 1, ...updateData },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.put("/api/users/1", updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users/1",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify(updateData),
        }),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("PATCH requests", () => {
    it("should make successful PATCH request", async () => {
      const patchData = { status: "active" };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 1, status: "active" },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.patch("/api/users/1", patchData);

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users/1",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify(patchData),
        }),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("DELETE requests", () => {
    it("should make successful DELETE request", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { message: "User deleted" },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.delete("/api/users/1");

      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3000/api/users/1",
        expect.objectContaining({
          method: "DELETE",
        }),
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Retry Logic", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should retry on network errors", async () => {
      // Primeira tentativa falha, segunda sucesso
      mockFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { test: true },
          }),
        } as any);

      const resultPromise = httpClient.get("/api/test");

      // Avança o timer para o retry
      jest.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should retry on 5xx server errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          json: jest.fn().mockResolvedValue({
            success: false,
            error: "Internal server error",
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { recovered: true },
          }),
        } as any);

      const resultPromise = httpClient.get("/api/test");

      // Avança o timer para o retry
      jest.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should retry on timeout (408) errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 408,
          json: jest.fn().mockResolvedValue({
            success: false,
            error: "Request timeout",
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { success: true },
          }),
        } as any);

      const resultPromise = httpClient.get("/api/test");

      jest.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should retry on rate limit (429) errors", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          json: jest.fn().mockResolvedValue({
            success: false,
            error: "Rate limit exceeded",
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { success: true },
          }),
        } as any);

      const resultPromise = httpClient.get("/api/test");

      jest.advanceTimersByTime(1000);

      const result = await resultPromise;

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it("should NOT retry on 4xx client errors", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: "Bad request",
        }),
      } as any);

      await expect(httpClient.get("/api/test")).rejects.toThrow(
        HttpClientError,
      );
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should respect max retries limit", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const resultPromise = httpClient.get("/api/test");

      // Avança timers para todos os retries
      jest.advanceTimersByTime(5000);

      await expect(resultPromise).rejects.toThrow("Network error");
      expect(mockFetch).toHaveBeenCalledTimes(3); // 1 inicial + 2 retries
    });

    it("should use exponential backoff for retries", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      const resultPromise = httpClient.get("/api/test");

      // Primeiro retry após 1000ms
      jest.advanceTimersByTime(1000);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Segundo retry após 2000ms (1000 * 2)
      jest.advanceTimersByTime(2000);
      expect(mockFetch).toHaveBeenCalledTimes(3);

      await expect(resultPromise).rejects.toThrow();
    });
  });

  describe("Timeout Handling", () => {
    it("should handle request timeout", async () => {
      // Mock fetch que nunca resolve
      mockFetch.mockImplementation(() => new Promise(() => {}));

      // Mock AbortController
      const mockAbort = jest.fn();
      const mockAbortController = {
        abort: mockAbort,
        signal: { aborted: false } as AbortSignal,
      };

      jest
        .spyOn(global, "AbortController")
        .mockImplementation(() => mockAbortController as any);
      jest.spyOn(global, "setTimeout").mockImplementation((callback, delay) => {
        // Simula timeout chamando abort
        setTimeout(() => {
          mockAbort();
          (callback as Function)();
        }, 0);
        return 123 as any;
      });

      await expect(httpClient.get("/api/slow")).rejects.toThrow();
    });
  });

  describe("Error Handling", () => {
    it("should create HttpClientError with correct properties", () => {
      const error = new HttpClientError(
        "Validation failed",
        422,
        "VALIDATION_ERROR",
        { name: ["Required"], email: ["Invalid"] },
      );

      expect(error.name).toBe("HttpClientError");
      expect(error.message).toBe("Validation failed");
      expect(error.status).toBe(422);
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.details).toEqual({
        name: ["Required"],
        email: ["Invalid"],
      });
    });

    it("should handle malformed JSON responses", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockRejectedValue(new Error("Invalid JSON")),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(httpClient.get("/api/test")).rejects.toThrow();
    });

    it("should handle network errors without status", async () => {
      mockFetch.mockRejectedValue(new Error("Network connection failed"));

      await expect(httpClient.get("/api/test")).rejects.toThrow(
        HttpClientError,
      );

      try {
        await httpClient.get("/api/test");
      } catch (error) {
        expect((error as HttpClientError).status).toBe(0);
        expect((error as HttpClientError).message).toBe(
          "Network connection failed",
        );
      }
    });

    it("should handle generic errors", async () => {
      mockFetch.mockRejectedValue("Unknown error");

      await expect(httpClient.get("/api/test")).rejects.toThrow(
        HttpClientError,
      );
    });
  });

  describe("Request Cancellation", () => {
    it("should cancel previous request when new one is made", async () => {
      const mockAbort = jest.fn();
      const mockAbortController = {
        abort: mockAbort,
        signal: { aborted: false } as AbortSignal,
      };

      jest
        .spyOn(global, "AbortController")
        .mockImplementation(() => mockAbortController as any);

      // Primeira requisição que nunca resolve
      mockFetch.mockImplementationOnce(() => new Promise(() => {}));

      const firstRequest = httpClient.get("/api/test1");

      // Segunda requisição
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { test: 2 },
        }),
      } as any);

      const secondRequest = httpClient.get("/api/test2");

      await secondRequest;

      // Verifica se a primeira requisição foi cancelada
      expect(mockAbort).toHaveBeenCalled();
    });
  });

  describe("Response with Pagination", () => {
    it("should handle paginated responses", async () => {
      const mockData = [{ id: 1 }, { id: 2 }];
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockData,
          pagination: {
            page: 1,
            limit: 10,
            total: 25,
            totalPages: 3,
          },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.get("/api/users");

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });
});
