"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EvaluationsService } from '@/services/survey';
import type { Evaluation, EvaluationAnalysis, EvaluationImport } from '@/lib/types';

interface UseEvaluationsProps {
  autoFetch?: boolean;
  refreshInterval?: number;
}

export function useEvaluations({ autoFetch = true, refreshInterval }: UseEvaluationsProps = {}) {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationImports, setEvaluationImports] = useState<EvaluationImport[]>([]);
  const [aiAnalysisResults, setAiAnalysisResults] = useState<EvaluationAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();

  // Buscar avaliações
  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/evaluations');
      if (!response.ok) {
        throw new Error('Erro ao buscar avaliações');
      }
      const data = await response.json();
      setEvaluations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar avaliações:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Buscar importações
  const fetchEvaluationImports = useCallback(async () => {
    try {
      const response = await fetch('/api/evaluations/imports');
      if (!response.ok) {
        throw new Error('Erro ao buscar importações');
      }
      const data = await response.json();
      setEvaluationImports(data);
    } catch (err) {
      console.error('Erro ao buscar importações:', err);
    }
  }, []);

  // Buscar análises de IA
  const fetchAiAnalysisResults = useCallback(async () => {
    try {
      const response = await fetch('/api/evaluations/analysis');
      if (!response.ok) {
        throw new Error('Erro ao buscar análises');
      }
      const data = await response.json();
      setAiAnalysisResults(data);
    } catch (err) {
      console.error('Erro ao buscar análises:', err);
    }
  }, []);

  // Criar nova avaliação
  const createEvaluation = useCallback(async (evaluationData: {
    attendantId: string;
    nota: number;
    comentario: string;
  }) => {
    try {
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(evaluationData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao criar avaliação');
      }

      const newEvaluation = await response.json();
      setEvaluations(prev => [newEvaluation, ...prev]);
      
      toast({
        title: 'Avaliação criada',
        description: 'A avaliação foi criada com sucesso.',
      });

      return newEvaluation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao criar avaliação',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [toast]);

  // Atualizar avaliação
  const updateEvaluation = useCallback(async (id: string, updates: Partial<Evaluation>) => {
    try {
      const response = await fetch(`/api/evaluations/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao atualizar avaliação');
      }

      const updatedEvaluation = await response.json();
      setEvaluations(prev => 
        prev.map(evaluation => evaluation.id === id ? updatedEvaluation : evaluation)
      );
      
      toast({
        title: 'Avaliação atualizada',
        description: 'A avaliação foi atualizada com sucesso.',
      });

      return updatedEvaluation;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao atualizar avaliação',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [toast]);

  // Deletar avaliação
  const deleteEvaluation = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/evaluations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Erro ao deletar avaliação');
      }

      setEvaluations(prev => prev.filter(evaluation => evaluation.id !== id));
      
      toast({
        title: 'Avaliação removida',
        description: 'A avaliação foi removida com sucesso.',
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      toast({
        title: 'Erro ao remover avaliação',
        description: errorMessage,
        variant: 'destructive',
      });
      throw err;
    }
  }, [toast]);

  // Buscar avaliação por ID
  const getEvaluationById = useCallback((id: string) => {
    return EvaluationsService.getById(evaluations, id);
  }, [evaluations]);

  // Buscar avaliações por atendente
  const getEvaluationsByAttendant = useCallback((attendantId: string) => {
    return EvaluationsService.filterByAttendant(evaluations, attendantId);
  }, [evaluations]);

  // Buscar análise por avaliação
  const getAnalysisByEvaluation = useCallback((evaluationId: string) => {
    return aiAnalysisResults.find(analysis => analysis.evaluationId === evaluationId);
  }, [aiAnalysisResults]);

  // Métodos de filtro e busca usando serviços
  const filterEvaluations = useCallback((filters: Parameters<typeof EvaluationsService.filter>[1]) => {
    return EvaluationsService.filter(evaluations, filters);
  }, [evaluations]);

  const searchEvaluations = useCallback((searchTerm: string) => {
    return EvaluationsService.search(evaluations, searchTerm);
  }, [evaluations]);

  const getRecentEvaluations = useCallback((limit: number = 10) => {
    return EvaluationsService.getRecent(evaluations, limit);
  }, [evaluations]);

  const calculateStats = useCallback(() => {
    return EvaluationsService.calculateStats(evaluations);
  }, [evaluations]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchEvaluations(),
      fetchEvaluationImports(),
      fetchAiAnalysisResults()
    ]);
  }, [fetchEvaluations, fetchEvaluationImports, fetchAiAnalysisResults]);

  // Auto fetch on mount
  useEffect(() => {
    if (autoFetch) {
      refreshAll();
    }
  }, [autoFetch, refreshAll]);

  // Auto refresh interval
  useEffect(() => {
    if (refreshInterval && refreshInterval > 0) {
      const interval = setInterval(refreshAll, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, refreshAll]);

  return {
    // Data
    evaluations,
    evaluationImports,
    aiAnalysisResults,
    loading,
    error,
    
    // Actions
    fetchEvaluations,
    fetchEvaluationImports,
    fetchAiAnalysisResults,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    refreshAll,
    
    // Getters
    getEvaluationById,
    getEvaluationsByAttendant,
    getAnalysisByEvaluation,
    
    // Service methods
    filterEvaluations,
    searchEvaluations,
    getRecentEvaluations,
    calculateStats,
  };
}