/**
 * Exportações centralizadas dos hooks de API
 */

export { useApiQuery } from './useApiQuery';
export type { UseApiQueryOptions, UseApiQueryResult } from './useApiQuery';

export { 
  useApiMutation, 
  useApiCreate, 
  useApiUpdate, 
  useApiDelete 
} from './useApiMutation';
export type { 
  UseApiMutationOptions, 
  UseApiMutationResult, 
  MutationFunction 
} from './useApiMutation';

// Re-export dos tipos de API
export type {
  ApiResponse,
  ApiError,
  ApiState,
  ApiMutationState,
  ApiQueryParams,
  ApiListResponse,
  ApiCreateResponse,
  ApiUpdateResponse,
  ApiDeleteResponse,
  HttpClientConfig,
} from '@/lib/api-types';

export {
  ApiErrorType,
  HttpClientError,
  getErrorType,
  getErrorMessage,
  isValidationError,
  isAuthenticationError,
  isAuthorizationError,
  isNotFoundError,
  isServerError,
} from '@/lib/api-types';