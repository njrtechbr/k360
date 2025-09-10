/**
 * Testes para o HTTP Client Service
 */

import { HttpClient, HttpClientError } from '../httpClient';

// Mock do fetch global
global.fetch = jest.fn();

describe('HttpClient', () => {
  let httpClient: HttpClient;
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    httpClient = new HttpClient({
      baseURL: 'http://localhost:3000',
      timeout: 5000,
      retries: 2,
    });
    mockFetch.mockClear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  describe('GET requests', () => {
    it('should make successful GET request', async () => {
      const mockData = { id: 1, name: 'Test' };
      const mockResponse = {
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: mockData,
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.get('/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result).toEqual({
        success: true,
        data: mockData,
      });
    });

    it('should handle HTTP errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({
          success: false,
          error: 'Not found',
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(httpClient.get('/api/notfound')).rejects.toThrow(HttpClientError);
    });

    it('should retry on network errors', async () => {
      // Primeira tentativa falha, segunda sucesso
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue({
            success: true,
            data: { test: true },
          }),
        } as any);

      const result = await httpClient.get('/api/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });
  });

  describe('POST requests', () => {
    it('should make successful POST request with data', async () => {
      const postData = { name: 'New Item' };
      const mockResponse = {
        ok: true,
        status: 201,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: { id: 1, ...postData },
        }),
      };

      mockFetch.mockResolvedValue(mockResponse as any);

      const result = await httpClient.post('/api/items', postData);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/items',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(postData),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should create HttpClientError with correct properties', () => {
      const error = new HttpClientError('Test error', 400, 'VALIDATION_ERROR', {
        field: ['Required'],
      });

      expect(error.message).toBe('Test error');
      expect(error.status).toBe(400);
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.details).toEqual({ field: ['Required'] });
    });

    it('should handle timeout errors', async () => {
      // Mock fetch que rejeita com timeout
      mockFetch.mockImplementation(() => 
        Promise.reject(new Error('Request timeout'))
      );

      await expect(httpClient.get('/api/slow')).rejects.toThrow('Request timeout');
    });
  });
});