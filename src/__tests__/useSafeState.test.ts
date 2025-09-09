import { renderHook, act } from '@testing-library/react';
import { useSafeState, validators } from '@/hooks/useSafeState';

describe('useSafeState', () => {
  beforeEach(() => {
    // Limpar console warnings entre testes
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialização', () => {
    it('deve inicializar com valor inicial correto', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [],
          fallback: []
        })
      );

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('deve inicializar com configuração completa', () => {
      const initialValue = { id: 1, name: 'Test' };
      const { result } = renderHook(() => 
        useSafeState({
          initialValue,
          validator: (data): data is typeof initialValue => 
            data && typeof data === 'object' && 'id' in data,
          fallback: { id: 0, name: 'Default' },
          enableWarnings: false
        })
      );

      expect(result.current.data).toEqual(initialValue);
    });
  });

  describe('setData com validação', () => {
    it('deve aceitar dados válidos', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [] as string[],
          validator: validators.isArray,
          fallback: []
        })
      );

      act(() => {
        result.current.setData(['item1', 'item2']);
      });

      expect(result.current.data).toEqual(['item1', 'item2']);
      expect(result.current.error).toBe(null);
    });

    it('deve usar fallback para dados inválidos', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [] as string[],
          validator: validators.isArray,
          fallback: ['fallback']
        })
      );

      act(() => {
        result.current.setData('not an array');
      });

      expect(result.current.data).toEqual(['fallback']);
      expect(console.warn).toHaveBeenCalled();
    });

    it('deve funcionar sem validador', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: 'initial',
          fallback: 'fallback'
        })
      );

      act(() => {
        result.current.setData('new value');
      });

      expect(result.current.data).toBe('new value');
    });

    it('deve usar fallback para dados null/undefined', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: 'initial',
          fallback: 'fallback'
        })
      );

      act(() => {
        result.current.setData(null);
      });

      expect(result.current.data).toBe('fallback');

      act(() => {
        result.current.setData(undefined);
      });

      expect(result.current.data).toBe('fallback');
    });

    it('deve limpar erro quando dados válidos são definidos', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [],
          validator: validators.isArray,
          fallback: []
        })
      );

      // Definir erro primeiro
      act(() => {
        result.current.setError('Test error');
      });

      expect(result.current.error).toBe('Test error');

      // Definir dados válidos deve limpar o erro
      act(() => {
        result.current.setData(['valid', 'data']);
      });

      expect(result.current.error).toBe(null);
      expect(result.current.data).toEqual(['valid', 'data']);
    });
  });

  describe('Estados de loading e error', () => {
    it('deve gerenciar estado de loading', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [],
          fallback: []
        })
      );

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.loading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.loading).toBe(false);
    });

    it('deve gerenciar estado de error', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [],
          fallback: []
        })
      );

      act(() => {
        result.current.setError('Test error message');
      });

      expect(result.current.error).toBe('Test error message');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBe(null);
    });
  });

  describe('Funções utilitárias', () => {
    it('deve resetar estado para valores iniciais', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: 'initial',
          fallback: 'fallback'
        })
      );

      // Modificar estado
      act(() => {
        result.current.setData('modified');
        result.current.setLoading(true);
        result.current.setError('error');
      });

      expect(result.current.data).toBe('modified');
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe('error');

      // Resetar
      act(() => {
        result.current.reset();
      });

      expect(result.current.data).toBe('initial');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('deve limpar apenas o erro', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: 'initial',
          fallback: 'fallback'
        })
      );

      // Definir estado com erro
      act(() => {
        result.current.setData('data');
        result.current.setLoading(true);
        result.current.setError('error');
      });

      // Limpar apenas erro
      act(() => {
        result.current.clearError();
      });

      expect(result.current.data).toBe('data');
      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBe(null);
    });
  });

  describe('Tratamento de exceções', () => {
    it('deve capturar erros durante validação', () => {
      const faultyValidator = () => {
        throw new Error('Validator error');
      };

      const { result } = renderHook(() => 
        useSafeState({
          initialValue: 'initial',
          validator: faultyValidator as any,
          fallback: 'fallback',
          enableWarnings: true
        })
      );

      act(() => {
        result.current.setData('test');
      });

      expect(result.current.data).toBe('fallback');
      expect(result.current.error).toBe('Validator error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Configuração de warnings', () => {
    it('deve respeitar enableWarnings: false', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [] as string[],
          validator: validators.isArray,
          fallback: ['fallback'],
          enableWarnings: false
        })
      );

      act(() => {
        result.current.setData('not an array');
      });

      expect(result.current.data).toEqual(['fallback']);
      expect(console.warn).not.toHaveBeenCalled();
    });

    it('deve logar warnings por padrão', () => {
      const { result } = renderHook(() => 
        useSafeState({
          initialValue: [] as string[],
          validator: validators.isArray,
          fallback: ['fallback']
        })
      );

      act(() => {
        result.current.setData('not an array');
      });

      expect(console.warn).toHaveBeenCalled();
    });
  });
});

describe('validators', () => {
  describe('isArray', () => {
    it('deve validar arrays corretamente', () => {
      expect(validators.isArray([])).toBe(true);
      expect(validators.isArray([1, 2, 3])).toBe(true);
      expect(validators.isArray('not array')).toBe(false);
      expect(validators.isArray(null)).toBe(false);
      expect(validators.isArray(undefined)).toBe(false);
      expect(validators.isArray({})).toBe(false);
    });
  });

  describe('isArrayOfObjects', () => {
    it('deve validar array de objetos com propriedades específicas', () => {
      const validator = validators.isArrayOfObjects(['id', 'name']);
      
      expect(validator([
        { id: 1, name: 'Test' },
        { id: 2, name: 'Test2' }
      ])).toBe(true);

      expect(validator([
        { id: 1 }, // falta 'name'
        { id: 2, name: 'Test2' }
      ])).toBe(false);

      expect(validator([])).toBe(true); // array vazio é válido
      expect(validator('not array')).toBe(false);
      expect(validator([null])).toBe(false);
    });
  });

  describe('isObjectWithProps', () => {
    it('deve validar objeto com propriedades específicas', () => {
      const validator = validators.isObjectWithProps(['id', 'name']);
      
      expect(validator({ id: 1, name: 'Test' })).toBe(true);
      expect(validator({ id: 1, name: 'Test', extra: 'ok' })).toBe(true);
      expect(validator({ id: 1 })).toBe(false); // falta 'name'
      expect(validator([])).toBe(false); // array não é objeto
      expect(validator(null)).toBe(false);
      expect(validator('string')).toBe(false);
    });
  });

  describe('isNonEmptyString', () => {
    it('deve validar strings não vazias', () => {
      expect(validators.isNonEmptyString('test')).toBe(true);
      expect(validators.isNonEmptyString('  test  ')).toBe(true);
      expect(validators.isNonEmptyString('')).toBe(false);
      expect(validators.isNonEmptyString('   ')).toBe(false);
      expect(validators.isNonEmptyString(null)).toBe(false);
      expect(validators.isNonEmptyString(undefined)).toBe(false);
      expect(validators.isNonEmptyString(123)).toBe(false);
    });
  });

  describe('isValidNumber', () => {
    it('deve validar números válidos', () => {
      expect(validators.isValidNumber(123)).toBe(true);
      expect(validators.isValidNumber(0)).toBe(true);
      expect(validators.isValidNumber(-123)).toBe(true);
      expect(validators.isValidNumber(123.45)).toBe(true);
      expect(validators.isValidNumber(NaN)).toBe(false);
      expect(validators.isValidNumber(Infinity)).toBe(false);
      expect(validators.isValidNumber(-Infinity)).toBe(false);
      expect(validators.isValidNumber('123')).toBe(false);
      expect(validators.isValidNumber(null)).toBe(false);
    });
  });
});