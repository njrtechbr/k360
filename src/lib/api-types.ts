/**
 * Tipos padronizados para respostas de API e tratamento de erros
 * Garante consistência em todas as comunicações com APIs REST
 */

// Re-export dos tipos do httpClient para centralizar
export type {
  ApiResponse,
  ApiError,
  HttpClientConfig,
} from './httpClient';

export { HttpClientError } from './httpClient';

// Tipos específicos para diferentes operações
export interface ApiListResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiCreateResponse<T> extends ApiResponse<T> {
  message: string;
}

export interface ApiUpdateResponse<T> extends ApiResponse<T> {
  message: string;
}

export interface ApiDeleteResponse extends ApiResponse<null> {
  message: string;
}

// Estados de loading e erro para hooks
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch?: Date;
}

export interface ApiMutationState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Parâmetros de query comuns
export interface ApiQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

// Tipos de erro específicos
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
}

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ApiValidationError extends ApiError {
  details: Record<string, string[]>;
  validationErrors: ValidationError[];
}

// Utilitários para tratamento de erro
export const getErrorType = (error: any): ApiErrorType => {
  if (!error.status) return ApiErrorType.NETWORK_ERROR;
  
  switch (error.status) {
    case 400:
      return ApiErrorType.VALIDATION_ERROR;
    case 401:
      return ApiErrorType.AUTHENTICATION_ERROR;
    case 403:
      return ApiErrorType.AUTHORIZATION_ERROR;
    case 404:
      return ApiErrorType.NOT_FOUND_ERROR;
    case 408:
      return ApiErrorType.TIMEOUT_ERROR;
    case 429:
      return ApiErrorType.RATE_LIMIT_ERROR;
    case 500:
    case 502:
    case 503:
    case 504:
      return ApiErrorType.SERVER_ERROR;
    default:
      return ApiErrorType.SERVER_ERROR;
  }
};

export const getErrorMessage = (error: any): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error?.error) {
    return error.error;
  }
  
  return 'Erro desconhecido';
};

export const isValidationError = (error: any): error is ApiValidationError => {
  return error?.status === 400 && error?.details;
};

export const isAuthenticationError = (error: any): boolean => {
  return error?.status === 401;
};

export const isAuthorizationError = (error: any): boolean => {
  return error?.status === 403;
};

export const isNotFoundError = (error: any): boolean => {
  return error?.status === 404;
};

export const isServerError = (error: any): boolean => {
  return error?.status >= 500;
};