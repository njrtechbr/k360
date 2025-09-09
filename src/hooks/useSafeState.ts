import { useState, useCallback } from 'react';

/**
 * Configuração para o hook useSafeState
 */
interface SafeStateConfig<T> {
  /** Valor inicial para o estado */
  initialValue: T;
  /** Função de validação opcional para verificar se o valor é válido */
  validator?: (value: any) => value is T;
  /** Valor de fallback usado quando a validação falha */
  fallback?: T;
  /** Se deve logar avisos quando usar fallback */
  enableWarnings?: boolean;
}

/**
 * Estado retornado pelo hook useSafeState
 */
interface SafeState<T> {
  /** Dados atuais */
  data: T;
  /** Estado de carregamento */
  loading: boolean;
  /** Erro atual, se houver */
  error: string | null;
  /** Função para atualizar os dados com validação */
  setData: (newData: any) => void;
  /** Função para definir estado de loading */
  setLoading: (loading: boolean) => void;
  /** Função para definir erro */
  setError: (error: string | null) => void;
  /** Função para resetar o estado para valores iniciais */
  reset: () => void;
  /** Função para limpar apenas o erro */
  clearError: () => void;
}

/**
 * Hook customizado que gerencia dados, loading e error states com validação automática
 * 
 * @param config Configuração do hook incluindo valor inicial, validador e fallback
 * @returns Estado seguro com funções de controle
 * 
 * @example
 * ```typescript
 * const attendantsState = useSafeState({
 *   initialValue: [] as Attendant[],
 *   validator: (data): data is Attendant[] => Array.isArray(data),
 *   fallback: [],
 *   enableWarnings: true
 * });
 * 
 * // Uso seguro
 * attendantsState.setData(apiResponse); // Validação automática
 * if (attendantsState.loading) return <Loading />;
 * if (attendantsState.error) return <Error message={attendantsState.error} />;
 * return <Table data={attendantsState.data} />;
 * ```
 */
export function useSafeState<T>(config: SafeStateConfig<T>): SafeState<T> {
  const {
    initialValue,
    validator,
    fallback = initialValue,
    enableWarnings = true
  } = config;

  // Estados internos
  const [data, setDataInternal] = useState<T>(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Função para definir dados com validação automática
   */
  const setData = useCallback((newData: any) => {
    try {
      // Se há validador, usa ele para verificar os dados
      if (validator && !validator(newData)) {
        if (enableWarnings) {
          console.warn('useSafeState: Dados inválidos fornecidos, usando fallback', {
            received: newData,
            fallback,
            validator: validator.toString()
          });
        }
        setDataInternal(fallback);
        return;
      }

      // Se não há validador ou validação passou, usa os dados
      setDataInternal(newData ?? fallback);
      
      // Limpa erro se dados foram definidos com sucesso
      setError(null);
    } catch (err) {
      if (enableWarnings) {
        console.error('useSafeState: Erro ao definir dados', err);
      }
      setDataInternal(fallback);
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao processar dados');
    }
  }, [validator, fallback, enableWarnings]);

  /**
   * Função para resetar o estado para valores iniciais
   */
  const reset = useCallback(() => {
    setDataInternal(initialValue);
    setLoading(false);
    setError(null);
  }, [initialValue]);

  /**
   * Função para limpar apenas o erro
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    setData,
    setLoading,
    setError,
    reset,
    clearError
  };
}

/**
 * Validadores comuns para uso com useSafeState
 */
export const validators = {
  /**
   * Valida se o valor é um array
   */
  isArray: (data: any): data is any[] => Array.isArray(data),

  /**
   * Valida se o valor é um array de objetos com propriedades específicas
   */
  isArrayOfObjects: (requiredProps: string[]) => (data: any): data is object[] => {
    return Array.isArray(data) && data.every(item => 
      item && 
      typeof item === 'object' && 
      requiredProps.every(prop => prop in item)
    );
  },

  /**
   * Valida se o valor é um objeto com propriedades específicas
   */
  isObjectWithProps: (requiredProps: string[]) => (data: any): data is object => {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return false;
    }
    return requiredProps.every(prop => prop in data);
  },

  /**
   * Valida se o valor é uma string não vazia
   */
  isNonEmptyString: (data: any): data is string => {
    return typeof data === 'string' && data.trim().length > 0;
  },

  /**
   * Valida se o valor é um número válido
   */
  isValidNumber: (data: any): data is number => {
    return typeof data === 'number' && !isNaN(data) && isFinite(data);
  }
};