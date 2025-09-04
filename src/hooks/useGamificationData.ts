
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { GamificationConfig, Achievement, LevelReward, GamificationSeason, Attendant, Evaluation, EvaluationAnalysis, UnlockedAchievement, AchievementConfig, LevelTrackConfig } from '@/lib/types';
import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from '@/lib/achievements';
import { getScoreFromRating } from '@/lib/gamification';


const INITIAL_GAMIFICATION_CONFIG: GamificationConfig = {
    ratingScores: {
        '5': 5,
        '4': 3,
        '3': 1,
        '2': -2,
        '1': -5,
    },
    achievements: INITIAL_ACHIEVEMENTS,
    levelRewards: INITIAL_LEVEL_REWARDS,
    seasons: [],
    globalXpMultiplier: 1,
};

const mergeAchievementsWithDefaults = (savedAchievements: Partial<Achievement>[]): Achievement[] => {
    const savedAchievementsMap = new Map(savedAchievements.map(ach => [ach.id, ach]));
    return INITIAL_ACHIEVEMENTS.map(defaultAch => ({
        ...defaultAch,
        ...savedAchievementsMap.get(defaultAch.id),
    }));
};

const mergeLevelRewardsWithDefaults = (savedRewards: Partial<LevelReward>[]): LevelReward[] => {
    const savedRewardsMap = new Map(savedRewards.map(r => [r.level, r]));
    return INITIAL_LEVEL_REWARDS.map(defaultReward => ({
        ...defaultReward,
        ...savedRewardsMap.get(defaultReward.level),
    }));
};

export function useGamificationData() {
    const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
    const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
    const [levelRewards, setLevelRewards] = useState<LevelReward[]>(INITIAL_LEVEL_REWARDS);
    const [seasons, setSeasons] = useState<GamificationSeason[]>([]);
    const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(null);
    const [nextSeason, setNextSeason] = useState<GamificationSeason | null>(null);
    const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const fetchGamificationConfig = useCallback(async () => {
        const startTime = performance.now();
        console.log("GAMIFICATION: Buscando configurações via API...");
        setIsLoading(true);
        try {
            const response = await fetch('/api/gamification');
            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }
            const data = await response.json();
            console.log("GAMIFICATION: Dados carregados via API", { achievements: data.achievements?.length, levelRewards: data.levelRewards?.length });
            
            const loadedConfig = {
                ...INITIAL_GAMIFICATION_CONFIG,
                ...data,
            };
            
            setGamificationConfig(loadedConfig);
            setAchievements(data.achievements || INITIAL_ACHIEVEMENTS);
            setLevelRewards(data.levelRewards || INITIAL_LEVEL_REWARDS);
            setSeasons(data.seasons || []);
            setIsLoading(false);
            
            const endTime = performance.now();
            console.log(`PERF: fetchGamificationConfig took ${(endTime - startTime).toFixed(2)}ms`);
            return loadedConfig;
        } catch (error) {
            console.error("GAMIFICATION: Erro ao buscar config:", error);
            setGamificationConfig(INITIAL_GAMIFICATION_CONFIG);
            setAchievements(INITIAL_ACHIEVEMENTS);
            setLevelRewards(INITIAL_LEVEL_REWARDS);
            setSeasons([]);
            setIsLoading(false);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as configurações de gamificação." });
            return INITIAL_GAMIFICATION_CONFIG;
        }
    }, [toast]);

    // Carregar dados automaticamente na inicialização
    useEffect(() => {
        fetchGamificationConfig();
    }, [fetchGamificationConfig]);
    
    const fetchUnlockedAchievements = useCallback(async () => {
        console.log("GAMIFICATION: fetchUnlockedAchievements não implementado para frontend");
        // Esta função não deve ser usada no frontend - usar API específica se necessário
        return [];
    }, []);

    const calculateActiveAndNextSeason = useCallback((allSeasons: GamificationSeason[]) => {
        const now = new Date();
        const currentActiveSeason = allSeasons.find(s => s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now) || null;
        setActiveSeason(currentActiveSeason);
        
        const nextUpcomingSeason = allSeasons
            .filter(s => s.active && new Date(s.startDate) > now)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
        setNextSeason(nextUpcomingSeason);

         console.log("GAMIFICATION: Temporada ativa e próxima temporada calculadas.", { active: currentActiveSeason?.name, next: nextUpcomingSeason?.name });
    }, []);

    useEffect(() => {
        calculateActiveAndNextSeason(seasons);
    }, [seasons, calculateActiveAndNextSeason]);

    const updateGamificationConfig = async (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => {
        try {
            const response = await fetch('/api/gamification', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ratingScores: newConfig.ratingScores,
                    globalXpMultiplier: newConfig.globalXpMultiplier
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao atualizar configurações');
            }

            await fetchGamificationConfig();
            toast({ title: "Configurações Salvas!", description: "As regras de pontuação foram atualizadas." });
        } catch (error) {
             console.error("Erro ao salvar config:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as configurações." });
        }
    };
    
    const saveSeasons = async (newSeasons: GamificationSeason[]) => {
         try {
            const response = await fetch('/api/gamification', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    seasons: newSeasons
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar temporadas');
            }

            await fetchGamificationConfig();
        } catch (error) {
             console.error("Erro ao salvar temporadas:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as temporadas." });
        }
    }
    
    const addSeason = (seasonData: Omit<GamificationSeason, 'id'>) => {
        const newSeason: GamificationSeason = { ...seasonData, id: crypto.randomUUID() };
        saveSeasons([...seasons, newSeason]);
        toast({ title: "Sessão Adicionada!", description: "A nova sessão de gamificação foi criada." });
    };

    const updateSeason = (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => {
        const updatedSeasons = seasons.map(s => s.id === id ? { ...s, ...seasonData } : s);
        saveSeasons(updatedSeasons);
        toast({ title: "Sessão Atualizada!", description: "As informações da sessão foram salvas." });
    };

    const deleteSeason = (id: string) => {
        const updatedSeasons = seasons.filter(s => s.id !== id);
        saveSeasons(updatedSeasons);
        toast({ title: "Sessão Removida!", description: "A sessão de gamificação foi removida." });
    };
    

    
    const updateAchievement = async (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => {
        console.log("GAMIFICATION: Atualizando achievement via API", { id, data });
        try {
            const response = await fetch('/api/gamification/achievements', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id,
                    title: data.title,
                    description: data.description,
                    xp: data.xp,
                    active: data.active
                })
            });

            if (!response.ok) {
                throw new Error(`Erro na API: ${response.status}`);
            }

            const result = await response.json();
            console.log("GAMIFICATION: Achievement atualizado com sucesso via API", result);
            
            await fetchGamificationConfig();
            toast({ title: "Troféu Atualizado!", description: "As informações do troféu foram salvas." });
        } catch (error) {
            console.error("GAMIFICATION: Erro ao atualizar achievement via API:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o troféu." });
        }
    };

    const updateLevelReward = async (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => {
        try {
            const response = await fetch('/api/gamification/level-rewards', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    level,
                    title: data.title,
                    description: data.description,
                    active: data.active
                })
            });

            if (!response.ok) {
                throw new Error('Falha ao atualizar recompensa do nível');
            }

            await fetchGamificationConfig();
            toast({ title: "Recompensa Atualizada!", description: "A recompensa do nível foi salva." });
        } catch (error) {
            console.error("Erro ao atualizar level reward:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a recompensa." });
        }
    };

    const recalculateAllGamificationData = useCallback(async (allAttendants: Attendant[], allEvaluations: Evaluation[], allAiAnalysis: EvaluationAnalysis[]) => {
        console.log("GAMIFICATION: recalculateAllGamificationData não implementado para frontend");
        // Esta função não deve ser usada no frontend - usar API específica se necessário
        throw new Error("Recálculo de gamificação deve ser feito no backend");
    }, []);

    // Função para refresh manual dos dados
    const refreshData = useCallback(async () => {
        console.log("GAMIFICATION: Refresh manual dos dados solicitado");
        await fetchGamificationConfig();
        await fetchUnlockedAchievements();
    }, [fetchGamificationConfig, fetchUnlockedAchievements]);

    return { 
        gamificationConfig,
        fetchGamificationConfig,
        updateGamificationConfig,
        achievements,
        updateAchievement,
        levelRewards,
        updateLevelReward,
        seasons,
        addSeason,
        updateSeason,
        deleteSeason,
        activeSeason,
        nextSeason,
        unlockedAchievements,
        fetchUnlockedAchievements,
        recalculateAllGamificationData,
        isLoading,
        refreshData,
    };
}

    