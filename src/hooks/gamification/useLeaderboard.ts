"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { LeaderboardService } from '@/services/gamification';
import type { LeaderboardEntry, LeaderboardStats, User } from '@/services/gamification/leaderboard.service';

export interface UseLeaderboardReturn {
  // Estado
  mainLeaderboard: LeaderboardEntry[];
  departmentLeaderboards: Record<string, LeaderboardEntry[]>;
  leaderboardStats: LeaderboardStats | null;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  getMainLeaderboard: (seasonId?: string, limit?: number) => Promise<LeaderboardEntry[]>;
  getDepartmentLeaderboard: (department: string, seasonId?: string, limit?: number) => Promise<LeaderboardEntry[]>;
  getAttendantPosition: (attendantId: string, seasonId?: string) => Promise<{
    globalPosition: number;
    departmentPosition: number;
    totalParticipants: number;
    departmentParticipants: number;
  }>;
  getMostImprovedAttendants: (days?: number, limit?: number) => Promise<LeaderboardEntry[]>;
  getPeriodRanking: (startDate: Date, endDate: Date, limit?: number) => Promise<LeaderboardEntry[]>;
  comparePerformance: (attendantId: string, compareWith: 'average' | 'top10' | string) => Promise<{
    attendantXp: number;
    comparisonXp: number;
    difference: number;
    percentageDifference: number;
    isAbove: boolean;
  }>;
  getLeaderboardInsights: (seasonId?: string) => Promise<{
    topPerformers: LeaderboardEntry[];
    risingStars: LeaderboardEntry[];
    departmentLeaders: Array<{ department: string; leader: LeaderboardEntry }>;
    averageXp: number;
    medianXp: number;
  }>;
  refreshLeaderboard: () => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [mainLeaderboard, setMainLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [departmentLeaderboards, setDepartmentLeaderboards] = useState<Record<string, LeaderboardEntry[]>>({});
  const [leaderboardStats, setLeaderboardStats] = useState<LeaderboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar leaderboard principal da API
  const fetchMainLeaderboard = useCallback(async (seasonId?: string, limit = 50) => {
    try {
      const params = new URLSearchParams();
      if (seasonId) params.append('seasonId', seasonId);
      if (limit) params.append('limit', limit.toString());
      
      const response = await fetch(`/api/gamification/leaderboard?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.leaderboard || [];
    } catch (err) {
      console.error('Erro ao buscar leaderboard principal:', err);
      return [];
    }
  }, []);

  // Buscar estatísticas do leaderboard
  const fetchLeaderboardStats = useCallback(async (seasonId?: string) => {
    try {
      const params = new URLSearchParams();
      if (seasonId) params.append('seasonId', seasonId);
      
      const response = await fetch(`/api/gamification/leaderboard/stats?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.stats || null;
    } catch (err) {
      console.error('Erro ao buscar estatísticas do leaderboard:', err);
      return null;
    }
  }, []);

  // Carregar dados na inicialização
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const [leaderboard, stats] = await Promise.all([
          fetchMainLeaderboard(),
          fetchLeaderboardStats()
        ]);
        
        setMainLeaderboard(leaderboard);
        setLeaderboardStats(stats);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar o leaderboard.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchMainLeaderboard, fetchLeaderboardStats, toast]);

  // Obter leaderboard principal
  const getMainLeaderboard = useCallback(async (seasonId?: string, limit = 50) => {
    const leaderboard = await fetchMainLeaderboard(seasonId, limit);
    setMainLeaderboard(leaderboard);
    return leaderboard;
  }, [fetchMainLeaderboard]);

  // Obter leaderboard por departamento
  const getDepartmentLeaderboard = useCallback(async (
    department: string, 
    seasonId?: string, 
    limit = 20
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('department', department);
      if (seasonId) params.append('seasonId', seasonId);
      if (limit) params.append('limit', limit.toString());
      
      const response = await fetch(`/api/gamification/leaderboard/department?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      const leaderboard = data.leaderboard || [];
      
      // Atualizar estado local
      setDepartmentLeaderboards(prev => ({
        ...prev,
        [department]: leaderboard
      }));
      
      return leaderboard;
    } catch (err) {
      console.error('Erro ao buscar leaderboard do departamento:', err);
      return [];
    }
  }, []);

  // Obter posição de um atendente
  const getAttendantPosition = useCallback(async (attendantId: string, seasonId?: string) => {
    try {
      const params = new URLSearchParams();
      if (seasonId) params.append('seasonId', seasonId);
      
      const response = await fetch(`/api/gamification/leaderboard/position/${attendantId}?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        globalPosition: data.globalPosition || 0,
        departmentPosition: data.departmentPosition || 0,
        totalParticipants: data.totalParticipants || 0,
        departmentParticipants: data.departmentParticipants || 0
      };
    } catch (err) {
      console.error('Erro ao buscar posição do atendente:', err);
      return {
        globalPosition: 0,
        departmentPosition: 0,
        totalParticipants: 0,
        departmentParticipants: 0
      };
    }
  }, []);

  // Obter atendentes que mais melhoraram
  const getMostImprovedAttendants = useCallback(async (days = 30, limit = 10) => {
    try {
      const params = new URLSearchParams();
      params.append('days', days.toString());
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/gamification/leaderboard/most-improved?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.attendants || [];
    } catch (err) {
      console.error('Erro ao buscar atendentes que mais melhoraram:', err);
      return [];
    }
  }, []);

  // Obter ranking de um período específico
  const getPeriodRanking = useCallback(async (
    startDate: Date, 
    endDate: Date, 
    limit = 50
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('startDate', startDate.toISOString());
      params.append('endDate', endDate.toISOString());
      params.append('limit', limit.toString());
      
      const response = await fetch(`/api/gamification/leaderboard/period?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return data.ranking || [];
    } catch (err) {
      console.error('Erro ao buscar ranking do período:', err);
      return [];
    }
  }, []);

  // Comparar performance de um atendente
  const comparePerformance = useCallback(async (
    attendantId: string, 
    compareWith: 'average' | 'top10' | string
  ) => {
    try {
      const params = new URLSearchParams();
      params.append('compareWith', compareWith);
      
      const response = await fetch(`/api/gamification/leaderboard/compare/${attendantId}?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        attendantXp: data.attendantXp || 0,
        comparisonXp: data.comparisonXp || 0,
        difference: data.difference || 0,
        percentageDifference: data.percentageDifference || 0,
        isAbove: data.isAbove || false
      };
    } catch (err) {
      console.error('Erro ao comparar performance:', err);
      return {
        attendantXp: 0,
        comparisonXp: 0,
        difference: 0,
        percentageDifference: 0,
        isAbove: false
      };
    }
  }, []);

  // Obter insights do leaderboard
  const getLeaderboardInsights = useCallback(async (seasonId?: string) => {
    try {
      const params = new URLSearchParams();
      if (seasonId) params.append('seasonId', seasonId);
      
      const response = await fetch(`/api/gamification/leaderboard/insights?${params}`);
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      return {
        topPerformers: data.topPerformers || [],
        risingStars: data.risingStars || [],
        departmentLeaders: data.departmentLeaders || [],
        averageXp: data.averageXp || 0,
        medianXp: data.medianXp || 0
      };
    } catch (err) {
      console.error('Erro ao buscar insights do leaderboard:', err);
      return {
        topPerformers: [],
        risingStars: [],
        departmentLeaders: [],
        averageXp: 0,
        medianXp: 0
      };
    }
  }, []);

  // Atualizar dados do leaderboard
  const refreshLeaderboard = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const [leaderboard, stats] = await Promise.all([
        fetchMainLeaderboard(),
        fetchLeaderboardStats()
      ]);
      
      setMainLeaderboard(leaderboard);
      setLeaderboardStats(stats);
    } catch (err) {
      console.error('Erro ao atualizar leaderboard:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível atualizar o leaderboard.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchMainLeaderboard, fetchLeaderboardStats, toast]);

  return {
    mainLeaderboard,
    departmentLeaderboards,
    leaderboardStats,
    isLoading,
    error,
    getMainLeaderboard,
    getDepartmentLeaderboard,
    getAttendantPosition,
    getMostImprovedAttendants,
    getPeriodRanking,
    comparePerformance,
    getLeaderboardInsights,
    refreshLeaderboard
  };
}