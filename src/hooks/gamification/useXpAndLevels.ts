"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { XpService, LevelsService } from '@/services/gamification';
import type { XpEvent, LevelReward, User, Evaluation } from '@/lib/types';

export interface UseXpAndLevelsReturn {
  // Estado
  xpEvents: XpEvent[];
  levelRewards: LevelReward[];
  isLoading: boolean;
  error: string | null;
  
  // Ações de XP
  calculateXpFromEvaluation: (evaluation: Evaluation) => number;
  addXpEvent: (event: Omit<XpEvent, 'id' | 'createdAt'>) => Promise<void>;
  getAttendantXp: (attendantId: string, seasonId?: string) => Promise<{
    totalXp: number;
    currentLevel: number;
    xpToNextLevel: number;
    progressPercentage: number;
    events: XpEvent[];
  }>;
  
  // Ações de Níveis
  updateLevelReward: (id: string, data: Partial<LevelReward>) => Promise<void>;
  getLevelFromXp: (xp: number) => number;
  getXpRequiredForLevel: (level: number) => number;
  getLevelProgress: (currentXp: number) => {
    currentLevel: number;
    xpForCurrentLevel: number;
    xpForNextLevel: number;
    xpToNextLevel: number;
    progressPercentage: number;
  };
  getRecentlyUnlockedRewards: (attendantId: string, days?: number) => Promise<LevelReward[]>;
  getUpcomingRewards: (currentLevel: number, count?: number) => LevelReward[];
  
  // Estatísticas
  getXpStats: (seasonId?: string) => {
    totalEvents: number;
    totalXp: number;
    averageXpPerEvent: number;
    topAttendants: Array<{ attendantId: string; totalXp: number; level: number }>;
  };
  getLevelStats: () => {
    totalRewards: number;
    maxLevel: number;
    averageXpPerLevel: number;
    rewardsByType: Record<string, number>;
  };
  
  refreshData: () => Promise<void>;
}

export function useXpAndLevels(): UseXpAndLevelsReturn {
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar eventos de XP da API
  const fetchXpEvents = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/xp-events');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      // Mapear os dados para compatibilidade com o código existente
      const mappedEvents = (data.events || []).map((event: any) => ({
        ...event,
        xpGained: event.points, // Mapear points para xpGained
        source: event.type, // Mapear type para source
        metadata: { relatedId: event.relatedId } // Criar metadata com relatedId
      }));
      setXpEvents(mappedEvents);
    } catch (err) {
      console.error('Erro ao buscar eventos de XP:', err);
    }
  }, []);

  // Buscar recompensas de nível da API
  const fetchLevelRewards = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/level-rewards');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      setLevelRewards(data.levelRewards || []);
    } catch (err) {
      console.error('Erro ao buscar recompensas de nível:', err);
    }
  }, []);

  // Carregar dados na inicialização
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchXpEvents(),
          fetchLevelRewards()
        ]);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
        setError(errorMessage);
        
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar os dados de XP e níveis.'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [fetchXpEvents, fetchLevelRewards, toast]);

  // Calcular XP baseado em avaliação
  const calculateXpFromEvaluation = useCallback((evaluation: any) => {
    const baseXp = XpService.calculateXpFromEvaluation(evaluation);
    return {
      points: baseXp,
      basePoints: baseXp,
      multiplier: 1,
      type: 'evaluation',
      relatedId: evaluation.id
    };
  }, []);

  // Adicionar evento de XP
  const addXpEvent = useCallback(async (eventData: {
    attendantId: string;
    points: number;
    basePoints?: number;
    multiplier?: number;
    reason: string;
    type?: string;
    relatedId?: string;
  }) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/xp-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...eventData,
          type: eventData.type || 'manual',
          basePoints: eventData.basePoints || eventData.points,
          multiplier: eventData.multiplier || 1
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao adicionar evento de XP');
      }
      
      const newEvent = await response.json();
      
      // Mapear o evento para compatibilidade
      const mappedEvent = {
        ...newEvent,
        xpGained: newEvent.points,
        source: newEvent.type,
        metadata: { relatedId: newEvent.relatedId }
      };
      
      // Atualizar estado local
      setXpEvents(prev => [mappedEvent, ...prev]);
      
      toast({
        title: 'XP Adicionado!',
        description: `${eventData.points} XP foi adicionado para ${eventData.reason}.`
      });
    } catch (err) {
      console.error('Erro ao adicionar evento de XP:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível adicionar o XP.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Obter XP de um atendente
  const getAttendantXp = useCallback(async (attendantId: string, seasonId?: string) => {
    try {
      const url = seasonId 
        ? `/api/gamification/xp/attendant/${attendantId}?seasonId=${seasonId}`
        : `/api/gamification/xp/attendant/${attendantId}`;
        
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar XP do atendente');
      }
      
      const data = await response.json();
      
      const totalXp = data.totalXp || 0;
      const currentLevel = LevelsService.getLevelFromXp(totalXp, levelRewards);
      const levelProgress = LevelsService.getLevelProgress(totalXp, levelRewards);
      
      return {
        totalXp,
        currentLevel,
        xpToNextLevel: levelProgress.xpToNextLevel,
        progressPercentage: levelProgress.progressPercentage,
        events: data.events || []
      };
    } catch (err) {
      console.error('Erro ao buscar XP do atendente:', err);
      return {
        totalXp: 0,
        currentLevel: 1,
        xpToNextLevel: 0,
        progressPercentage: 0,
        events: []
      };
    }
  }, [levelRewards]);

  // Atualizar recompensa de nível
  const updateLevelReward = useCallback(async (
    id: string,
    data: Partial<LevelReward>
  ) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/level-rewards', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id,
          ...data
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar recompensa de nível');
      }
      
      // Atualizar estado local
      setLevelRewards(prev => 
        prev.map(reward => 
          reward.id === id 
            ? { ...reward, ...data }
            : reward
        )
      );
      
      toast({
        title: 'Recompensa Atualizada!',
        description: 'As informações da recompensa foram salvas.'
      });
    } catch (err) {
      console.error('Erro ao atualizar recompensa de nível:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar a recompensa.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Obter nível a partir do XP
  const getLevelFromXp = useCallback((xp: number) => {
    return LevelsService.getLevelFromXp(xp, levelRewards);
  }, [levelRewards]);

  // Obter XP necessário para um nível
  const getXpRequiredForLevel = useCallback((level: number) => {
    return LevelsService.getXpRequiredForLevel(level, levelRewards);
  }, [levelRewards]);

  // Obter progresso do nível
  const getLevelProgress = useCallback((currentXp: number) => {
    return LevelsService.getLevelProgress(currentXp, levelRewards);
  }, [levelRewards]);

  // Obter recompensas recentemente desbloqueadas
  const getRecentlyUnlockedRewards = useCallback(async (attendantId: string, days = 7) => {
    try {
      const response = await fetch(`/api/gamification/level-rewards/recent/${attendantId}?days=${days}`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar recompensas recentes');
      }
      
      const data = await response.json();
      return data.rewards || [];
    } catch (err) {
      console.error('Erro ao buscar recompensas recentes:', err);
      return [];
    }
  }, []);

  // Obter próximas recompensas
  const getUpcomingRewards = useCallback((currentLevel: number, count = 5) => {
    return LevelsService.getUpcomingRewards(currentLevel, levelRewards, count);
  }, [levelRewards]);

  // Obter estatísticas de XP
  const getXpStats = useCallback((seasonId?: string) => {
    const filteredEvents = seasonId 
      ? XpService.filterEventsBySeason(xpEvents, seasonId)
      : xpEvents;
    
    const attendantStats = XpService.calculateAttendantStats(filteredEvents);
    const topAttendants = Object.entries(attendantStats)
      .map(([attendantId, stats]) => ({
        attendantId,
        totalXp: stats.totalXp,
        level: getLevelFromXp(stats.totalXp)
      }))
      .sort((a, b) => b.totalXp - a.totalXp)
      .slice(0, 10);
    
    return {
      totalEvents: filteredEvents.length,
      totalXp: XpService.calculateTotalXp(filteredEvents),
      averageXpPerEvent: filteredEvents.length > 0 
        ? XpService.calculateTotalXp(filteredEvents) / filteredEvents.length 
        : 0,
      topAttendants
    };
  }, [xpEvents, getLevelFromXp]);

  // Obter estatísticas de níveis
  const getLevelStats = useCallback(() => {
    const stats = LevelsService.calculateLevelStats(levelRewards);
    
    return {
      totalRewards: levelRewards.length,
      maxLevel: stats.maxLevel,
      averageXpPerLevel: stats.averageXpPerLevel,
      rewardsByType: stats.rewardsByType
    };
  }, [levelRewards]);

  // Atualizar dados manualmente
  const refreshData = useCallback(async () => {
    await Promise.all([
      fetchXpEvents(),
      fetchLevelRewards()
    ]);
  }, [fetchXpEvents, fetchLevelRewards]);

  return {
    xpEvents,
    levelRewards,
    isLoading,
    error,
    calculateXpFromEvaluation,
    addXpEvent,
    getAttendantXp,
    updateLevelReward,
    getLevelFromXp,
    getXpRequiredForLevel,
    getLevelProgress,
    getRecentlyUnlockedRewards,
    getUpcomingRewards,
    getXpStats,
    getLevelStats,
    refreshData
  };
}