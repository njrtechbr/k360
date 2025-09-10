/**
 * Testes para o hook useApiMutation
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiMutation, useApiCreate } from '../useApiMutation';
import { httpClient } from '@/lib/httpClient';

// Mock do httpClient
jest.mock('@/lib/httpClient', () => ({
  httpClient: {
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('useApiMutation', () => {
  beforeEach(() => {
    mockHttpClient.post.mockClear();
    mockHttpClient.put.mockClear();
    mockHttpClient.delete.mockClear();
  });

  it('should execute mutation successfully', async () => {
    const mockData = { id: 1, name: 'New User' };
    const mutationFn = jest.fn().mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiMutation(mutationFn)
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);

    const variables = { name: 'New User' };
    
    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mutationFn).toHaveBeenCalledWith(variables);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('should handle mutation errors', async () => {
    const errorMessage = 'Validation failed';
    const mutationFn = jest.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useApiMutation(mutationFn)
    );

    const variables = { name: '' };

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).rejects.toThrow(errorMessage);
    });

    expect(result.current.data).toBe(null);
    expect(result.current.loading).toBe(false);
    expect(result.current.success).toBe(false);
    expect(result.current.error).toBe(errorMessage);
  });

  it('should call onSuccess callback', async () => {
    const mockData = { id: 1, name: 'New User' };
    const onSuccess = jest.fn();
    const mutationFn = jest.fn().mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiMutation(mutationFn, { onSuccess })
    );

    const variables = { name: 'New User' };
    
    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData, variables);
  });

  it('should call onError callback', async () => {
    const errorMessage = 'Validation failed';
    const onError = jest.fn();
    const mutationFn = jest.fn().mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useApiMutation(mutationFn, { onError })
    );

    const variables = { name: '' };

    await act(async () => {
      await expect(result.current.mutateAsync(variables)).rejects.toThrow();
    });

    expect(onError).toHaveBeenCalledWith(errorMessage, variables);
  });

  it('should reset state', async () => {
    const mockData = { id: 1, name: 'New User' };
    const mutationFn = jest.fn().mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiMutation(mutationFn)
    );

    // Executa mutação
    await act(async () => {
      await result.current.mutateAsync({ name: 'New User' });
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.success).toBe(true);

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBe(null);
    expect(result.current.success).toBe(false);
    expect(result.current.error).toBe(null);
  });
});

describe('useApiCreate', () => {
  it('should create resource successfully', async () => {
    const mockData = { id: 1, name: 'New User' };
    mockHttpClient.post.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiCreate('/api/users')
    );

    const variables = { name: 'New User' };
    
    await act(async () => {
      await result.current.mutateAsync(variables);
    });

    expect(mockHttpClient.post).toHaveBeenCalledWith('/api/users', variables);
    expect(result.current.data).toEqual(mockData);
  });
});