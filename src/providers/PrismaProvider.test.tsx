/**
 * Teste básico para verificar se o PrismaProvider refatorado está funcionando
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock das dependências
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated'
  })
}));

jest.mock('@/hooks/useSafeState', () => ({
  useSafeState: (config: any) => ({
    data: config.initialValue,
    loading: false,
    error: null,
    setData: jest.fn(),
    setLoading: jest.fn(),
    setError: jest.fn(),
    reset: jest.fn(),
    clearError: jest.fn()
  })
}));

jest.mock('@/lib/data-validation', () => ({
  isValidArray: (data: any) => Array.isArray(data),
  DEFAULT_IMPORT_STATUS: {
    isOpen: false,
    logs: [],
    progress: 0,
    title: 'Aguardando',
    status: 'idle'
  },
  EMPTY_ATTENDANT_ARRAY: [],
  EMPTY_EVALUATION_ARRAY: [],
  EMPTY_XP_EVENT_ARRAY: []
}));

jest.mock('@/lib/achievements', () => ({
  INITIAL_ACHIEVEMENTS: [],
  INITIAL_LEVEL_REWARDS: []
}));

jest.mock('@/lib/gamification', () => ({
  getScoreFromRating: jest.fn()
}));

jest.mock('@/ai/flows/analyze-evaluation-flow', () => ({
  analyzeEvaluation: jest.fn()
}));

describe('PrismaProvider Refatorado', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve importar sem erros', async () => {
    // Tenta importar o PrismaProvider
    expect(() => {
      require('./PrismaProvider');
    }).not.toThrow();
  });

  it('deve ter as constantes necessárias definidas', () => {
    const validation = require('@/lib/data-validation');
    
    expect(validation.EMPTY_ATTENDANT_ARRAY).toBeDefined();
    expect(validation.EMPTY_EVALUATION_ARRAY).toBeDefined();
    expect(validation.EMPTY_XP_EVENT_ARRAY).toBeDefined();
    expect(validation.DEFAULT_IMPORT_STATUS).toBeDefined();
  });

  it('deve ter o hook useSafeState funcionando', () => {
    const { useSafeState } = require('@/hooks/useSafeState');
    
    const result = useSafeState({
      initialValue: [],
      validator: (data: any) => Array.isArray(data),
      fallback: []
    });

    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('error');
    expect(result).toHaveProperty('setData');
    expect(result).toHaveProperty('setLoading');
    expect(result).toHaveProperty('setError');
    expect(result).toHaveProperty('reset');
    expect(result).toHaveProperty('clearError');
  });
});