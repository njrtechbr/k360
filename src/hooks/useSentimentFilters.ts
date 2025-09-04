"use client";

import { useState, useCallback, useMemo } from 'react';
import { SentimentFilterOptions } from '@/components/survey/SentimentFilters';

export interface SentimentAnalysis {
  id: string;
  sentiment: 'Positivo' | 'Negativo' | 'Neutro';
  confidence: number;
  analyzedAt: string;
  evaluation: {
    nota: number;
    attendantId: string;
    attendantName: string;
    data: string;
    comentario: string;
  };
  summary: string;
}

export interface UseSentimentFiltersProps {
  analyses: SentimentAnalysis[];
  attendantMap?: Record<string, string>;
}

export interface UseSentimentFiltersReturn {
  filters: SentimentFilterOptions;
  filteredAnalyses: SentimentAnalysis[];
  setFilters: (filters: SentimentFilterOptions) => void;
  updateFilter: <K extends keyof SentimentFilterOptions>(
    key: K,
    value: SentimentFilterOptions[K]
  ) => void;
  clearFilters: () => void;
  activeFiltersCount: number;
  stats: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    avgConfidence: number;
    conflicting: number;
  };
}

/**
 * Hook para gerenciar filtros de análise de sentimento
 * 
 * @param analyses - Array de análises de sentimento
 * @param attendantMap - Mapeamento de ID para nome do atendente
 * @returns Objeto com filtros, análises filtradas e funções de controle
 */
export const useSentimentFilters = ({
  analyses,
  attendantMap = {}
}: UseSentimentFiltersProps): UseSentimentFiltersReturn => {
  const [filters, setFilters] = useState<SentimentFilterOptions>({});

  // Função para atualizar um filtro específico
  const updateFilter = useCallback(<K extends keyof SentimentFilterOptions>(
    key: K,
    value: SentimentFilterOptions[K]
  ) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Função para limpar todos os filtros
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Aplicar filtros às análises
  const filteredAnalyses = useMemo(() => {
    if (!analyses || !Array.isArray(analyses)) {
      return [];
    }
    let filtered = [...analyses];

    // Filtro por termo de busca
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(analysis => {
        const attendantName = attendantMap[analysis.evaluation.attendantId] || analysis.evaluation.attendantName || '';
        return (
          analysis.evaluation.comentario.toLowerCase().includes(searchLower) ||
          analysis.summary.toLowerCase().includes(searchLower) ||
          attendantName.toLowerCase().includes(searchLower)
        );
      });
    }

    // Filtro por sentimentos
    if (filters.sentiments?.length) {
      filtered = filtered.filter(analysis => 
        filters.sentiments!.includes(analysis.sentiment)
      );
    }

    // Filtro por faixa de confiança
    if (filters.confidenceRange) {
      const [min, max] = filters.confidenceRange;
      filtered = filtered.filter(analysis => 
        analysis.confidence >= min && analysis.confidence <= max
      );
    }

    // Filtro por faixa de nota
    if (filters.ratingRange) {
      const [min, max] = filters.ratingRange;
      filtered = filtered.filter(analysis => 
        analysis.evaluation.nota >= min && analysis.evaluation.nota <= max
      );
    }

    // Filtro por período
    if (filters.dateRange) {
      const { from, to } = filters.dateRange;
      filtered = filtered.filter(analysis => {
        const analysisDate = new Date(analysis.evaluation.data);
        const isAfterFrom = !from || analysisDate >= from;
        const isBeforeTo = !to || analysisDate <= to;
        return isAfterFrom && isBeforeTo;
      });
    }

    // Filtro por atendentes
    if (filters.attendants?.length) {
      filtered = filtered.filter(analysis => 
        filters.attendants!.includes(analysis.evaluation.attendantId)
      );
    }

    // Filtro por análises conflitantes
    if (filters.hasConflicts) {
      filtered = filtered.filter(analysis => {
        const isConflicting = (
          (analysis.sentiment === 'Negativo' && analysis.evaluation.nota >= 4) ||
          (analysis.sentiment === 'Positivo' && analysis.evaluation.nota <= 2)
        );
        return isConflicting;
      });
    }

    // Filtro por tamanho mínimo do comentário
    if (filters.minAnalysisLength) {
      filtered = filtered.filter(analysis => 
        analysis.evaluation.comentario.length >= filters.minAnalysisLength!
      );
    }

    // Aplicar ordenação
    const sortBy = filters.sortBy || 'date';
    const sortOrder = filters.sortOrder || 'desc';
    
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'confidence':
          comparison = a.confidence - b.confidence;
          break;
        case 'rating':
          comparison = a.evaluation.nota - b.evaluation.nota;
          break;
        case 'sentiment':
          comparison = a.sentiment.localeCompare(b.sentiment);
          break;
        case 'date':
        default:
          comparison = new Date(a.evaluation.data).getTime() - new Date(b.evaluation.data).getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [analyses, filters, attendantMap]);

  // Calcular estatísticas das análises filtradas
  const stats = useMemo(() => {
    if (!filteredAnalyses || !Array.isArray(filteredAnalyses)) {
      return {
        total: 0,
        positive: 0,
        negative: 0,
        neutral: 0,
        avgConfidence: 0,
        conflicting: 0
      };
    }
    
    const total = filteredAnalyses.length;
    const positive = filteredAnalyses.filter(a => a.sentiment === 'positive').length;
    const negative = filteredAnalyses.filter(a => a.sentiment === 'negative').length;
    const neutral = filteredAnalyses.filter(a => a.sentiment === 'neutral').length;
    
    const avgConfidence = total > 0 
      ? filteredAnalyses.reduce((sum, a) => sum + a.confidence, 0) / total 
      : 0;
    
    const conflicting = filteredAnalyses.filter(analysis => {
      return (
        (analysis.sentiment === 'negative' && analysis.evaluation.nota >= 4) ||
        (analysis.sentiment === 'positive' && analysis.evaluation.nota <= 2)
      );
    }).length;

    return {
      total,
      positive,
      negative,
      neutral,
      avgConfidence,
      conflicting
    };
  }, [filteredAnalyses]);

  // Contar filtros ativos
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.searchTerm) count++;
    if (filters.sentiments?.length) count++;
    if (filters.confidenceRange) count++;
    if (filters.ratingRange) count++;
    if (filters.dateRange) count++;
    if (filters.attendants?.length) count++;
    if (filters.hasConflicts) count++;
    if (filters.minAnalysisLength) count++;
    return count;
  }, [filters]);

  return {
    filters,
    filteredAnalyses,
    setFilters,
    updateFilter,
    clearFilters,
    activeFiltersCount,
    stats
  };
};

export default useSentimentFilters;