/**
 * Hook base para operações de mutação (POST, PUT, DELETE) com gerenciamento de estado
 */

import { useState, useCallback, useRef } from "react";
import { httpClient } from "@/lib/httpClient";
import type { ApiResponse, ApiMutationState } from "@/lib/api-types";
import { getErrorMessage } from "@/lib/api-types";

export interface UseApiMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: string, variables: TVariables) => void;
  onSettled?: (
    data: TData | null,
    error: string | null,
    variables: TVariables,
  ) => void;
}

export interface UseApiMutationResult<TData, TVariables>
  extends ApiMutationState<TData> {
  mutate: (variables: TVariables) => Promise<TData>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

export type MutationFunction<TData, TVariables> = (
  variables: TVariables,
) => Promise<ApiResponse<TData>>;

export function useApiMutation<TData = any, TVariables = any>(
  mutationFn: MutationFunction<TData, TVariables>,
  options: UseApiMutationOptions<TData, TVariables> = {},
): UseApiMutationResult<TData, TVariables> {
  const { onSuccess, onError, onSettled } = options;

  const [state, setState] = useState<ApiMutationState<TData>>({
    data: null,
    loading: false,
    error: null,
    success: false,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
      success: false,
    });
  }, []);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      // Cancela requisição anterior se existir
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        success: false,
      }));

      try {
        const response = await mutationFn(variables);

        if (response.success) {
          setState({
            data: response.data,
            loading: false,
            error: null,
            success: true,
          });

          onSuccess?.(response.data, variables);
          onSettled?.(response.data, null, variables);

          return response.data;
        } else {
          throw new Error(response.error || "Erro na operação");
        }
      } catch (error: any) {
        if (error.name === "AbortError") {
          throw error; // Re-throw para que o caller possa tratar
        }

        const errorMessage = getErrorMessage(error);

        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMessage,
          success: false,
        }));

        onError?.(errorMessage, variables);
        onSettled?.(null, errorMessage, variables);

        throw error;
      }
    },
    [mutationFn, onSuccess, onError, onSettled],
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData> => {
      try {
        return await mutateAsync(variables);
      } catch (error) {
        // mutate não re-throw o erro, apenas atualiza o estado
        return Promise.reject(error);
      }
    },
    [mutateAsync],
  );

  return {
    ...state,
    mutate,
    mutateAsync,
    reset,
  };
}

// Hooks específicos para diferentes tipos de mutação
export function useApiCreate<TData = any, TVariables = any>(
  url: string,
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  return useApiMutation<TData, TVariables>(
    async (variables: TVariables) => httpClient.post<TData>(url, variables),
    options,
  );
}

export function useApiUpdate<TData = any, TVariables = any>(
  url: string | ((variables: TVariables) => string),
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  return useApiMutation<TData, TVariables>(async (variables: TVariables) => {
    const endpoint = typeof url === "function" ? url(variables) : url;
    return httpClient.put<TData>(endpoint, variables);
  }, options);
}

export function useApiDelete<TData = any, TVariables = any>(
  url: string | ((variables: TVariables) => string),
  options?: UseApiMutationOptions<TData, TVariables>,
) {
  return useApiMutation<TData, TVariables>(async (variables: TVariables) => {
    const endpoint = typeof url === "function" ? url(variables) : url;
    return httpClient.delete<TData>(endpoint);
  }, options);
}
