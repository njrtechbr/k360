/**
 * Testes abrangentes para o hook useApiMutation
 * Cobre todos os tipos de mutação, error handling e callbacks
 */

import { renderHook, waitFor, act } from "@testing-library/react";
import {
  useApiMutation,
  useApiCreate,
  useApiUpdate,
  useApiDelete,
} from "../useApiMutation";
import { httpClient } from "@/lib/httpClient";
import { HttpClientError } from "@/lib/httpClient";

// Mock do httpClient
jest.mock("@/lib/httpClient", () => ({
  httpClient: {
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock do AbortController
const mockAbort = jest.fn();
const mockAbortController = {
  abort: mockAbort,
  signal: { aborted: false } as AbortSignal,
};

global.AbortController = jest.fn(() => mockAbortController) as any;

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe("useApiMutation", () => {
  beforeEach(() => {
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
    mockHttpClient.patch.mockClear();
    mockHttpClient.delete.mockClear();
    mockAbort.mockClear();
  });

  describe("Basic Functionality", () => {
    it("should have correct initial state", () => {
      const mutationFn = jest.fn();
      const { result } = renderHook(() => useApiMutation(mutationFn));

      expect(result.current.data).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(false);
      expect(typeof result.current.mutate).toBe("function");
      expect(typeof result.current.mutateAsync).toBe("function");
      expect(typeof result.current.reset).toBe("function");
    });

    it("should execute mutation successfully with mutateAsync", async () => {
      const mockData = { id: 1, name: "New User", email: "user@test.com" };
      const mutationFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
        message: "User created successfully",
      });

      const { result } = renderHook(() => useApiMutation(mutationFn));

      const variables = { name: "New User", email: "user@test.com" };

      await act(async () => {
        const response = await result.current.mutateAsync(variables);
        expect(response).toEqual(mockData);
      });

      expect(mutationFn).toHaveBeenCalledWith(variables);
      expect(mutationFn).toHaveBeenCalledTimes(1);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBe(null);
    });

    it("should execute mutation successfully with mutate", async () => {
      const mockData = { id: 1, name: "New User" };
      const mutationFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() => useApiMutation(mutationFn));

      const variables = { name: "New User" };

      await act(async () => {
        await result.current.mutate(variables);
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.success).toBe(true);
    });

    it("should show loading state during mutation", async () => {
      let resolvePromise: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      const mutationFn = jest.fn().mockReturnValue(promise);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      const variables = { name: "New User" };

      act(() => {
        result.current.mutate(variables);
      });

      // Durante a execução, loading deve ser true
      expect(result.current.loading).toBe(true);
      expect(result.current.success).toBe(false);

      // Resolve a promise
      act(() => {
        resolvePromise!({ success: true, data: { id: 1 } });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.success).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle API errors with HttpClientError", async () => {
      const error = new HttpClientError(
        "Validation failed",
        422,
        "VALIDATION_ERROR",
        { name: ["Name is required"], email: ["Invalid email"] },
      );

      const mutationFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      const variables = { name: "", email: "invalid" };

      await act(async () => {
        await expect(result.current.mutateAsync(variables)).rejects.toThrow(
          error,
        );
      });

      expect(result.current.data).toBe(null);
      expect(result.current.loading).toBe(false);
      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe("Validation failed");
    });

    it("should handle network errors", async () => {
      const networkError = new Error("Network connection failed");
      const mutationFn = jest.fn().mockRejectedValue(networkError);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toThrow(
          networkError,
        );
      });

      expect(result.current.error).toBe("Network connection failed");
    });

    it("should handle API response errors", async () => {
      const mutationFn = jest.fn().mockResolvedValue({
        success: false,
        error: "User already exists",
        code: "DUPLICATE_USER",
      });

      const { result } = renderHook(() => useApiMutation(mutationFn));

      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toThrow(
          "User already exists",
        );
      });

      expect(result.current.error).toBe("User already exists");
      expect(result.current.success).toBe(false);
    });

    it("should handle AbortError gracefully", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";

      const mutationFn = jest.fn().mockRejectedValue(abortError);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toThrow(
          abortError,
        );
      });

      // AbortError deve ser re-thrown para que o caller possa tratar
      expect(result.current.error).toBe("AbortError");
    });

    it("should handle generic errors", async () => {
      const genericError = "Something went wrong";
      const mutationFn = jest.fn().mockRejectedValue(genericError);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toThrow();
      });

      expect(result.current.error).toBe("Something went wrong");
    });
  });

  describe("Callbacks", () => {
    it("should call onSuccess callback with correct parameters", async () => {
      const mockData = { id: 1, name: "New User" };
      const onSuccess = jest.fn();
      const mutationFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiMutation(mutationFn, { onSuccess }),
      );

      const variables = { name: "New User" };

      await act(async () => {
        await result.current.mutateAsync(variables);
      });

      expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    it("should call onError callback with correct parameters", async () => {
      const errorMessage = "Validation failed";
      const onError = jest.fn();
      const mutationFn = jest.fn().mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useApiMutation(mutationFn, { onError }),
      );

      const variables = { name: "" };

      await act(async () => {
        await expect(result.current.mutateAsync(variables)).rejects.toThrow();
      });

      expect(onError).toHaveBeenCalledWith(errorMessage, variables);
      expect(onError).toHaveBeenCalledTimes(1);
    });

    it("should call onSettled callback on success", async () => {
      const mockData = { id: 1, name: "New User" };
      const onSettled = jest.fn();
      const mutationFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiMutation(mutationFn, { onSettled }),
      );

      const variables = { name: "New User" };

      await act(async () => {
        await result.current.mutateAsync(variables);
      });

      expect(onSettled).toHaveBeenCalledWith(mockData, null, variables);
    });

    it("should call onSettled callback on error", async () => {
      const errorMessage = "Validation failed";
      const onSettled = jest.fn();
      const mutationFn = jest.fn().mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() =>
        useApiMutation(mutationFn, { onSettled }),
      );

      const variables = { name: "" };

      await act(async () => {
        await expect(result.current.mutateAsync(variables)).rejects.toThrow();
      });

      expect(onSettled).toHaveBeenCalledWith(null, errorMessage, variables);
    });

    it("should call all callbacks in correct order", async () => {
      const callOrder: string[] = [];
      const mockData = { id: 1, name: "New User" };

      const onSuccess = jest.fn(() => callOrder.push("onSuccess"));
      const onSettled = jest.fn(() => callOrder.push("onSettled"));

      const mutationFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() =>
        useApiMutation(mutationFn, { onSuccess, onSettled }),
      );

      await act(async () => {
        await result.current.mutateAsync({ name: "New User" });
      });

      expect(callOrder).toEqual(["onSuccess", "onSettled"]);
    });
  });

  describe("State Management", () => {
    it("should reset state correctly", async () => {
      const mockData = { id: 1, name: "New User" };
      const mutationFn = jest.fn().mockResolvedValue({
        success: true,
        data: mockData,
      });

      const { result } = renderHook(() => useApiMutation(mutationFn));

      // Executa mutação
      await act(async () => {
        await result.current.mutateAsync({ name: "New User" });
      });

      expect(result.current.data).toEqual(mockData);
      expect(result.current.success).toBe(true);
      expect(result.current.error).toBe(null);

      // Reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBe(null);
      expect(result.current.success).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.loading).toBe(false);
    });

    it("should reset error state on new mutation", async () => {
      const mutationFn = jest
        .fn()
        .mockRejectedValueOnce(new Error("First error"))
        .mockResolvedValueOnce({ success: true, data: { id: 1 } });

      const { result } = renderHook(() => useApiMutation(mutationFn));

      // Primeira mutação com erro
      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toThrow();
      });

      expect(result.current.error).toBe("First error");

      // Segunda mutação com sucesso
      await act(async () => {
        await result.current.mutateAsync({});
      });

      expect(result.current.error).toBe(null);
      expect(result.current.success).toBe(true);
    });

    it("should handle multiple concurrent mutations", async () => {
      let resolveFirst: (value: any) => void;
      let resolveSecond: (value: any) => void;

      const firstPromise = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      const secondPromise = new Promise((resolve) => {
        resolveSecond = resolve;
      });

      const mutationFn = jest
        .fn()
        .mockReturnValueOnce(firstPromise)
        .mockReturnValueOnce(secondPromise);

      const { result } = renderHook(() => useApiMutation(mutationFn));

      // Inicia primeira mutação
      act(() => {
        result.current.mutate({ id: 1 });
      });

      expect(result.current.loading).toBe(true);

      // Inicia segunda mutação (deve cancelar a primeira)
      act(() => {
        result.current.mutate({ id: 2 });
      });

      // Resolve primeira mutação (deve ser ignorada)
      act(() => {
        resolveFirst!({ success: true, data: { id: 1 } });
      });

      // Resolve segunda mutação
      act(() => {
        resolveSecond!({ success: true, data: { id: 2 } });
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual({ id: 2 });
      expect(mockAbort).toHaveBeenCalled();
    });
  });

  describe("Difference between mutate and mutateAsync", () => {
    it("mutateAsync should re-throw errors", async () => {
      const error = new Error("Mutation failed");
      const mutationFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      await act(async () => {
        await expect(result.current.mutateAsync({})).rejects.toThrow(error);
      });
    });

    it("mutate should not re-throw errors but update state", async () => {
      const error = new Error("Mutation failed");
      const mutationFn = jest.fn().mockRejectedValue(error);
      const { result } = renderHook(() => useApiMutation(mutationFn));

      await act(async () => {
        // mutate não deve re-throw, mas deve retornar rejected promise
        await expect(result.current.mutate({})).rejects.toThrow(error);
      });

      expect(result.current.error).toBe("Mutation failed");
    });
  });
});

describe("useApiCreate", () => {
  beforeEach(() => {
    mockHttpClient.post.mockClear();
  });

  it("should create resource successfully", async () => {
    const mockData = { id: 1, name: "New User", email: "user@test.com" };
    mockHttpClient.post.mockResolvedValue({
      success: true,
      data: mockData,
      message: "User created successfully",
    });

    const { result } = renderHook(() => useApiCreate("/api/users"));

    const variables = { name: "New User", email: "user@test.com" };

    await act(async () => {
      const response = await result.current.mutateAsync(variables);
      expect(response).toEqual(mockData);
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith("/api/users", variables);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.success).toBe(true);
  });

  it("should handle create errors", async () => {
    const error = new HttpClientError("Validation failed", 422);
    mockHttpClient.post.mockRejectedValue(error);

    const { result } = renderHook(() => useApiCreate("/api/users"));

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow(error);
    });

    expect(result.current.error).toBe("Validation failed");
  });

  it("should work with callbacks", async () => {
    const mockData = { id: 1, name: "New User" };
    const onSuccess = jest.fn();

    mockHttpClient.post.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiCreate("/api/users", { onSuccess }),
    );

    const variables = { name: "New User" };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
  });
});

describe("useApiUpdate", () => {
  beforeEach(() => {
    mockHttpClient.put.mockClear();
  });

  it("should update resource with static URL", async () => {
    const mockData = { id: 1, name: "Updated User" };
    mockHttpClient.put.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => useApiUpdate("/api/users/1"));

    const variables = { name: "Updated User" };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mockHttpClient.put).toHaveBeenCalledWith("/api/users/1", variables);
    expect(result.current.data).toEqual(mockData);
  });

  it("should update resource with dynamic URL", async () => {
    const mockData = { id: 2, name: "Updated User" };
    mockHttpClient.put.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiUpdate((variables: any) => `/api/users/${variables.id}`),
    );

    const variables = { id: 2, name: "Updated User" };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mockHttpClient.put).toHaveBeenCalledWith("/api/users/2", variables);
    expect(result.current.data).toEqual(mockData);
  });

  it("should handle update errors", async () => {
    const error = new HttpClientError("User not found", 404);
    mockHttpClient.put.mockRejectedValue(error);

    const { result } = renderHook(() => useApiUpdate("/api/users/999"));

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow(error);
    });

    expect(result.current.error).toBe("User not found");
  });
});

describe("useApiDelete", () => {
  beforeEach(() => {
    mockHttpClient.delete.mockClear();
  });

  it("should delete resource with static URL", async () => {
    const mockData = { message: "User deleted successfully" };
    mockHttpClient.delete.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() => useApiDelete("/api/users/1"));

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/users/1");
    expect(result.current.data).toEqual(mockData);
  });

  it("should delete resource with dynamic URL", async () => {
    const mockData = { message: "User deleted successfully" };
    mockHttpClient.delete.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiDelete((variables: any) => `/api/users/${variables.id}`),
    );

    const variables = { id: 3 };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mockHttpClient.delete).toHaveBeenCalledWith("/api/users/3");
    expect(result.current.data).toEqual(mockData);
  });

  it("should handle delete errors", async () => {
    const error = new HttpClientError("Cannot delete user", 403);
    mockHttpClient.delete.mockRejectedValue(error);

    const { result } = renderHook(() => useApiDelete("/api/users/1"));

    await act(async () => {
      await expect(result.current.mutateAsync({})).rejects.toThrow(error);
    });

    expect(result.current.error).toBe("Cannot delete user");
  });

  it("should work with callbacks", async () => {
    const mockData = { message: "Deleted" };
    const onSuccess = jest.fn();

    mockHttpClient.delete.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiDelete("/api/users/1", { onSuccess }),
    );

    const variables = { confirm: true };

    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
  });
});
