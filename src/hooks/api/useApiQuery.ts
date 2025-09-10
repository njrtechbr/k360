/**
 * Hook base para operações de query (GET) com cache e gerenciamento de estado
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { httpClient } from '@/lib/httpClient';
import type { ApiResponse, ApiState, ApiQueryParams } from '@/lib/api-types';
import { getErrorMessage } from '@/lib/api-types';

export interface UseApiQueryOptions {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  refetchOnMount?: boolean;
  staleTime?: number;
  cacheTime?: number;
  retry?: boolean;
  retryDelay?: number;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

export interface UseApiQueryResult<T> extends ApiState<T> {
  refetch: () => Promise<void>;
  isStale: boolean;
  isFetching: boolean;
}

// Cache simples em memória
const queryCache = new Map<string, {
  data: any;
  timestamp: number;
  staleTime: number;
}>();

export function useApiQuery<T>(
  queryKey: string[],
  url: string,
  params?: ApiQueryParams,
  options: UseApiQueryOptions = {}
): UseApiQueryResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    staleTime = 5 * 60 * 1000, // 5 minutos
    cacheTime = 10 * 60 * 1000, // 10 minutos
    retry = true,
    retryDelay = 1000,
    onSuccess,
    onError,
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const [isFetching, setIsFetching] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gera chave única para cache
  const cacheKey = JSON.stringify({ queryKey, url, params });

  // Verifica se dados estão em cache e são válidos
  const getCachedData = useCallback(() => {
    const cached = queryCache.get(cacheKey);
    if (!cached) return null;

    const now = Date.now();
    const isExpired = now - cached.timestamp > cacheTime;
    
    if (isExpired) {
      queryCache.delete(cacheKey);
      return null;
    }

    return cached;
  }, [cacheKey, cacheTime]);

  // Verifica se dados estão stale
  const isStale = useCallback(() => {
    const cached = getCachedData();
    if (!cached) return true;

    const now = Date.now();
    return now - cached.timestamp > cached.staleTime;
  }, [getCachedData]);

  // Função principal de fetch
  const fetchData = useCallback(async (isRetry = false) => {
    // Cancela requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      setIsFetching(true);
      
      if (!isRetry) {
        setState(prev => ({ ...prev, loading: true, error: null }));
      }

      // Constrói URL com parâmetros
      let fullUrl = url;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            searchParams.append(key, String(value));
          }
        });
        const queryString = searchParams.toString();
        if (queryString) {
          fullUrl += (url.includes('?') ? '&' : '?') + queryString;
        }
      }

      const response: ApiResponse<T> = await httpClient.get(fullUrl, {
        signal: abortControllerRef.current.signal,
      });

      if (response.success) {
        const now = Date.now();
        
        // Atualiza cache
        queryCache.set(cacheKey, {
          data: response.data,
          timestamp: now,
          staleTime,
        });

        setState({
          data: response.data,
          loading: false,
          error: null,
          lastFetch: new Date(now),
        });

        onSuccess?.(response.data);
      } else {
        throw new Error(response.error || 'Erro na requisição');
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Requisição cancelada, não atualiza estado
      }

      const errorMessage = getErrorMessage(error);
      
      // Retry automático em caso de erro de rede
      if (retry && !isRetry && (!error.status || error.status >= 500)) {
        retryTimeoutRef.current = setTimeout(() => {
          fetchData(true);
        }, retryDelay);
        return;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      onError?.(errorMessage);
    } finally {
      setIsFetching(false);
    }
  }, [url, params, cacheKey, staleTime, retry, retryDelay, onSuccess, onError]);

  // Função de refetch manual
  const refetch = useCallback(async () => {
    if (!enabled) return;
    await fetchData();
  }, [enabled, fetchData]);

  // Efeito principal - executa fetch quando necessário
  useEffect(() => {
    if (!enabled) return;

    // Verifica cache primeiro
    const cached = getCachedData();
    if (cached && refetchOnMount) {
      setState({
        data: cached.data,
        loading: false,
        error: null,
        lastFetch: new Date(cached.timestamp),
      });

      // Se dados estão stale, faz refetch em background
      if (isStale()) {
        fetchData();
      }
    } else if (refetchOnMount || !cached) {
      fetchData();
    }

    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [enabled, refetchOnMount]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      if (isStale()) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled]);

  return {
    ...state,
    refetch,
    isStale: isStale(),
    isFetching,
  };
}