/**
 * Testes para o hook useApiQuery
 */

import { renderHook, waitFor, act } from '@testing-library/react';
import { useApiQuery } from '../useApiQuery';
import { httpClient } from '@/lib/httpClient';

// Mock do httpClient
jest.mock('@/lib/httpClient', () => ({
  httpClient: {
    get: jest.fn(),
  },
}));

const mockHttpClient = httpClient as jest.Mocked<typeof httpClient>;

describe('useApiQuery', () => {
  beforeEach(() => {
    mockHttpClient.get.mockClear();
  });

  it('should fetch data successfully', async () => {
    const mockData = [{ id: 1, name: 'Test User' }];
    mockHttpClient.get.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiQuery(['users'], '/api/users')
    );

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(mockHttpClient.get).toHaveBeenCalledWith('/api/users', expect.any(Object));
  });

  it('should handle errors', async () => {
    const errorMessage = 'Failed to fetch';
    mockHttpClient.get.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useApiQuery(['users-error'], '/api/users-error', undefined, { 
        retry: false,
        refetchOnMount: true 
      })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe(errorMessage);
  });

  it('should not fetch when disabled', () => {
    mockHttpClient.get.mockResolvedValue({
      success: true,
      data: [],
    });

    renderHook(() =>
      useApiQuery(['users'], '/api/users', undefined, { enabled: false })
    );

    expect(mockHttpClient.get).not.toHaveBeenCalled();
  });

  it('should have refetch function available', async () => {
    const mockData = [{ id: 1, name: 'Test User' }];
    mockHttpClient.get.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiQuery(['users-refetch'], '/api/users-refetch')
    );

    // Verifica se a função refetch está disponível
    expect(typeof result.current.refetch).toBe('function');
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });

  it('should handle query parameters', async () => {
    const mockData = [{ id: 1, name: 'Test User' }];
    mockHttpClient.get.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const params = { page: 1, limit: 10, search: 'test' };

    renderHook(() =>
      useApiQuery(['users'], '/api/users', params)
    );

    await waitFor(() => {
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/api/users?page=1&limit=10&search=test',
        expect.any(Object)
      );
    });
  });

  it('should call onSuccess callback', async () => {
    const mockData = [{ id: 1, name: 'Test User' }];
    const onSuccess = jest.fn();

    mockHttpClient.get.mockResolvedValue({
      success: true,
      data: mockData,
    });

    const { result } = renderHook(() =>
      useApiQuery(['users-success'], '/api/users-success', undefined, { onSuccess })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  it('should call onError callback', async () => {
    const errorMessage = 'Failed to fetch';
    const onError = jest.fn();

    mockHttpClient.get.mockRejectedValue(new Error(errorMessage));

    const { result } = renderHook(() =>
      useApiQuery(['users-error-cb'], '/api/users-error-cb', undefined, { onError, retry: false })
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(onError).toHaveBeenCalledWith(errorMessage);
  });
});