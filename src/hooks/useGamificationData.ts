
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { GamificationConfig, Achievement, LevelReward, GamificationSeason } from '@/lib/types';
import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from '@/lib/achievements';

const GAMIFICATION_CONFIG_KEY = "controle_acesso_gamification_config";

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
    const defaultAchievementsMap = new Map(INITIAL_ACHIEVEMENTS.map(ach => [ach.id, ach]));
    const savedAchievementsMap = new Map(savedAchievements.map(ach => [ach.id, ach]));
    
    const finalAchievements = INITIAL_ACHIEVEMENTS.map(defaultAch => {
        const savedAch = savedAchievementsMap.get(defaultAch.id);
        if (savedAch) {
             return { ...defaultAch, ...savedAch, isUnlocked: defaultAch.isUnlocked, icon: defaultAch.icon };
        }
        return defaultAch;
    });

    return finalAchievements;
};

const mergeLevelRewardsWithDefaults = (savedRewards: Partial<LevelReward>[]): LevelReward[] => {
    const defaultRewardsMap = new Map(INITIAL_LEVEL_REWARDS.map(r => [r.level, r]));
     const savedRewardsMap = new Map(savedRewards.map(r => [r.level, r]));

    const finalRewards = INITIAL_LEVEL_REWARDS.map(defaultReward => {
        const savedReward = savedRewardsMap.get(defaultReward.level);
        if (savedReward) {
            return { ...defaultReward, ...savedReward, icon: defaultReward.icon };
        }
        return defaultReward;
    });

    return finalRewards;
}

export const getScoreFromRating = (rating: number, scores: GamificationConfig['ratingScores']): number => {
    const key = String(rating) as keyof typeof scores;
    return scores[key] ?? 0;
};


export function useGamificationData() {
    const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
    const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
    const [levelRewards, setLevelRewards] = useState<LevelReward[]>(INITIAL_LEVEL_REWARDS);
    const [seasons, setSeasons] = useState<GamificationSeason[]>([]);
    const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(null);
    const [nextSeason, setNextSeason] = useState<GamificationSeason | null>(null);
    const { toast } = useToast();

    const getGamificationConfigFromStorage = useCallback((): GamificationConfig => {
        if (typeof window === "undefined") return INITIAL_GAMIFICATION_CONFIG;
        try {
            const configJson = localStorage.getItem(GAMIFICATION_CONFIG_KEY);
            if (configJson) {
                const parsed = JSON.parse(configJson);
                const mergedAchievements = parsed.achievements ? mergeAchievementsWithDefaults(parsed.achievements) : INITIAL_ACHIEVEMENTS;
                const mergedLevelRewards = parsed.levelRewards ? mergeLevelRewardsWithDefaults(parsed.levelRewards) : INITIAL_LEVEL_REWARDS;

                return {
                    ...INITIAL_GAMIFICATION_CONFIG,
                    ...parsed,
                    ratingScores: { ...INITIAL_GAMIFICATION_CONFIG.ratingScores, ...parsed.ratingScores },
                    achievements: mergedAchievements,
                    levelRewards: mergedLevelRewards,
                    seasons: parsed.seasons || INITIAL_GAMIFICATION_CONFIG.seasons,
                };
            }
            localStorage.setItem(GAMIFICATION_CONFIG_KEY, JSON.stringify(INITIAL_GAMIFICATION_CONFIG));
            return INITIAL_GAMIFICATION_CONFIG;
        } catch (error) {
            console.error("Failed to parse gamification config from localStorage", error);
            return INITIAL_GAMIFICATION_CONFIG;
        }
    }, []);

    const calculateActiveAndNextSeason = useCallback((allSeasons: GamificationSeason[]) => {
        const now = new Date();
        
        const currentActiveSeasons = allSeasons
            .filter(s => s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now)
            .sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        const currentActiveSeason = currentActiveSeasons.length > 0 ? currentActiveSeasons[0] : null;
        setActiveSeason(currentActiveSeason);
        
        const upcomingSeasons = allSeasons
            .filter(s => s.active && new Date(s.startDate) > now)
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        
        const nextUpcomingSeason = upcomingSeasons.length > 0 ? upcomingSeasons[0] : null;

        setNextSeason(nextUpcomingSeason);
    }, []);

    useEffect(() => {
        const config = getGamificationConfigFromStorage();
        setGamificationConfig(config);
        setAchievements(config.achievements);
        setLevelRewards(config.levelRewards);
        setSeasons(config.seasons);
        calculateActiveAndNextSeason(config.seasons);
    }, [getGamificationConfigFromStorage, calculateActiveAndNextSeason]);

    const saveGamificationConfigToStorage = (config: GamificationConfig) => {
        const configToSave = {
            ...config,
            achievements: config.achievements.map(({ isUnlocked, icon, ...ach }) => ach), // Remove function and icon before saving
            levelRewards: config.levelRewards.map(({ icon, ...reward }) => reward) // Remove icon component before saving
        };

        localStorage.setItem(GAMIFICATION_CONFIG_KEY, JSON.stringify(configToSave));
        
        const fullConfig = getGamificationConfigFromStorage();
        setGamificationConfig(fullConfig);
        setAchievements(fullConfig.achievements);
        setLevelRewards(fullConfig.levelRewards);
        setSeasons(fullConfig.seasons);
        calculateActiveAndNextSeason(fullConfig.seasons);
    };

    const updateGamificationConfig = async (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => {
        const currentConfig = getGamificationConfigFromStorage();
        const updatedConfig = { ...currentConfig, ...newConfig };
        saveGamificationConfigToStorage(updatedConfig);
        toast({
            title: "Configurações Salvas!",
            description: "As regras de pontuação foram atualizadas.",
        });
    };

    const updateAchievement = async (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => {
        const currentConfig = getGamificationConfigFromStorage();
        const updatedAchievements = currentConfig.achievements.map(ach =>
            ach.id === id ? { ...ach, ...data } : ach
        );
        saveGamificationConfigToStorage({ ...currentConfig, achievements: updatedAchievements });
        toast({ title: "Troféu Atualizado!", description: "As informações do troféu foram salvas." });
    };

    const updateLevelReward = async (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => {
        const currentConfig = getGamificationConfigFromStorage();
        const updatedLevelRewards = currentConfig.levelRewards.map(reward =>
            reward.level === level ? { ...reward, ...data } : reward
        );
        saveGamificationConfigToStorage({ ...currentConfig, levelRewards: updatedLevelRewards });
        toast({ title: "Recompensa Atualizada!", description: "A recompensa do nível foi salva." });
    };

    const addSeason = async (seasonData: Omit<GamificationSeason, 'id'>) => {
        const currentConfig = getGamificationConfigFromStorage();
        const newSeason: GamificationSeason = { ...seasonData, id: crypto.randomUUID() };
        const updatedSeasons = [...currentConfig.seasons, newSeason];
        saveGamificationConfigToStorage({ ...currentConfig, seasons: updatedSeasons });
        toast({ title: "Sessão Adicionada!", description: "A nova sessão de gamificação foi criada." });
    };

    const updateSeason = async (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => {
        const currentConfig = getGamificationConfigFromStorage();
        const updatedSeasons = currentConfig.seasons.map(s => s.id === id ? { ...s, ...seasonData } : s);
        saveGamificationConfigToStorage({ ...currentConfig, seasons: updatedSeasons });
        toast({ title: "Sessão Atualizada!", description: "As informações da sessão foram salvas." });
    };

    const deleteSeason = async (id: string) => {
        const currentConfig = getGamificationConfigFromStorage();
        const updatedSeasons = currentConfig.seasons.filter(s => s.id !== id);
        saveGamificationConfigToStorage({ ...currentConfig, seasons: updatedSeasons });
        toast({ title: "Sessão Removida!", description: "A sessão de gamificação foi removida." });
    };

    return { 
        gamificationConfig, 
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
    };
}
