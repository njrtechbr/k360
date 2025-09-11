/**
 * HTTP Client Service com retry logic e error handling
 * Centraliza todas as comunicações HTTP com APIs REST
 */

export interface HttpClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, string[]>; // Validation errors
  code?: string;
  status?: number;
}

export class HttpClientError extends Error {
  public status: number;
  public code?: string;
  public details?: Record<string, string[]>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "HttpClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class HttpClient {
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig = {}) {
    this.config = {
      baseURL: config.baseURL || "",
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private shouldRetry(error: any, attempt: number): boolean {
    if (attempt >= this.config.retries) return false;

    // Retry em casos de erro de rede ou 5xx
    if (!error.status) return true; // Network error
    if (error.status >= 500) return true; // Server error
    if (error.status === 408) return true; // Request timeout
    if (error.status === 429) return true; // Rate limit

    return false;
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    attempt: number = 1,
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const fullUrl = this.config.baseURL + url;
      const response = await fetch(fullUrl, {
        ...options,
        headers: {
          ...this.config.headers,
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseData = await response.json();

      if (!response.ok) {
        const error = new HttpClientError(
          responseData.error || `HTTP ${response.status}`,
          response.status,
          responseData.code,
          responseData.details,
        );

        if (this.shouldRetry(error, attempt)) {
          await this.delay(this.config.retryDelay * attempt);
          return this.makeRequest<T>(url, options, attempt + 1);
        }

        throw error;
      }

      return responseData as ApiResponse<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof HttpClientError) {
        throw error;
      }

      // Network or other errors
      const networkError = new HttpClientError(
        error instanceof Error ? error.message : "Network error",
        0,
      );

      if (this.shouldRetry(networkError, attempt)) {
        await this.delay(this.config.retryDelay * attempt);
        return this.makeRequest<T>(url, options, attempt + 1);
      }

      throw networkError;
    }
  }

  async get<T>(url: string, config?: RequestInit): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "GET",
      ...config,
    });
  }

  async post<T>(
    url: string,
    data?: any,
    config?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async put<T>(
    url: string,
    data?: any,
    config?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async patch<T>(
    url: string,
    data?: any,
    config?: RequestInit,
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
      ...config,
    });
  }

  async delete<T>(url: string, config?: RequestInit): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, {
      method: "DELETE",
      ...config,
    });
  }
}

// Instância padrão do HTTP Client
export const httpClient = new HttpClient();

// Função utilitária para criar cliente com configuração customizada
export const createHttpClient = (config: HttpClientConfig): HttpClient => {
  return new HttpClient(config);
};
