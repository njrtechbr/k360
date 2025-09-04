"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { AchievementsService } from '@/services/gamification';
import type { Achievement, UnlockedAchievement, User } from '@/lib/types';

export interface UseAchievementsReturn {
  // Estado
  achievements: Achievement[];
  unlockedAchievements: UnlockedAchievement[];
  isLoading: boolean;
  error: string | null;
  
  // Ações
  updateAchievement: (id: string, data: Partial<Achievement>) => Promise<void>;
  checkNewAchievements: (attendantId: string) => Promise<UnlockedAchievement[]>;
  getAttendantAchievements: (attendantId: string) => Promise<UnlockedAchievement[]>;
  getAchievementStats: () => {
    total: number;
    active: number;
    byCategory: Record<string, number>;
    byDifficulty: Record<string, number>;
  };
  filterAchievements: (filters: {
    category?: string;
    difficulty?: string;
    active?: boolean;
  }) => Achievement[];
  refreshAchievements: () => Promise<void>;
}

export function useAchievements(): UseAchievementsReturn {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar conquistas da API
  const fetchAchievements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gamification/achievements');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      setAchievements(data.achievements || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar conquistas:', err);
      
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as conquistas.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Buscar conquistas desbloqueadas
  const fetchUnlockedAchievements = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/achievements/unlocked');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      setUnlockedAchievements(data.unlockedAchievements || []);
    } catch (err) {
      console.error('Erro ao buscar conquistas desbloqueadas:', err);
    }
  }, []);

  // Carregar dados na inicialização
  useEffect(() => {
    fetchAchievements();
    fetchUnlockedAchievements();
  }, [fetchAchievements, fetchUnlockedAchievements]);

  // Atualizar conquista
  const updateAchievement = useCallback(async (
    id: string,
    data: Partial<Achievement>
  ) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/achievements', {
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
        throw new Error('Falha ao atualizar conquista');
      }
      
      // Atualizar estado local
      setAchievements(prev => 
        prev.map(achievement => 
          achievement.id === id 
            ? { ...achievement, ...data }
            : achievement
        )
      );
      
      toast({
        title: 'Conquista Atualizada!',
        description: 'As informações da conquista foram salvas.'
      });
    } catch (err) {
      console.error('Erro ao atualizar conquista:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar a conquista.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Verificar novas conquistas para um atendente
  const checkNewAchievements = useCallback(async (attendantId: string) => {
    try {
      const response = await fetch(`/api/gamification/achievements/check/${attendantId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Falha ao verificar novas conquistas');
      }
      
      const data = await response.json();
      const newAchievements = data.newAchievements || [];
      
      if (newAchievements.length > 0) {
        // Atualizar lista de conquistas desbloqueadas
        setUnlockedAchievements(prev => [...prev, ...newAchievements]);
        
        // Mostrar notificação para cada nova conquista
        newAchievements.forEach((achievement: UnlockedAchievement) => {
          toast({
            title: '🏆 Nova Conquista Desbloqueada!',
            description: `${achievement.achievement.title} - ${achievement.achievement.description}`
          });
        });
      }
      
      return newAchievements;
    } catch (err) {
      console.error('Erro ao verificar novas conquistas:', err);
      return [];
    }
  }, [toast]);

  // Obter conquistas de um atendente específico
  const getAttendantAchievements = useCallback(async (attendantId: string) => {
    try {
      const response = await fetch(`/api/gamification/achievements/attendant/${attendantId}`);
      
      if (!response.ok) {
        throw new Error('Falha ao buscar conquistas do atendente');
      }
      
      const data = await response.json();
      return data.achievements || [];
    } catch (err) {
      console.error('Erro ao buscar conquistas do atendente:', err);
      return [];
    }
  }, []);

  // Obter estatísticas das conquistas
  const getAchievementStats = useCallback(() => {
    const total = achievements.length;
    const active = achievements.filter(a => a.active).length;
    
    const byCategory = achievements.reduce((acc, achievement) => {
      acc[achievement.category] = (acc[achievement.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byDifficulty = achievements.reduce((acc, achievement) => {
      acc[achievement.difficulty] = (acc[achievement.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      total,
      active,
      byCategory,
      byDifficulty
    };
  }, [achievements]);

  // Filtrar conquistas
  const filterAchievements = useCallback((filters: {
    category?: string;
    difficulty?: string;
    active?: boolean;
  }) => {
    let filtered = [...achievements];
    
    if (filters.category) {
      filtered = AchievementsService.filterByCategory(filtered, filters.category);
    }
    
    if (filters.difficulty) {
      filtered = filtered.filter(a => a.difficulty === filters.difficulty);
    }
    
    if (filters.active !== undefined) {
      filtered = filtered.filter(a => a.active === filters.active);
    }
    
    return AchievementsService.sortByDifficulty(filtered);
  }, [achievements]);

  // Atualizar dados manualmente
  const refreshAchievements = useCallback(async () => {
    await Promise.all([
      fetchAchievements(),
      fetchUnlockedAchievements()
    ]);
  }, [fetchAchievements, fetchUnlockedAchievements]);

  return {
    achievements,
    unlockedAchievements,
    isLoading,
    error,
    updateAchievement,
    checkNewAchievements,
    getAttendantAchievements,
    getAchievementStats,
    filterAchievements,
    refreshAchievements
  };
}