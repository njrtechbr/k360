
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { GamificationConfig, Achievement, LevelReward } from '@/lib/types';
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
};

export function useGamificationData() {
    const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
    const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
    const [levelRewards, setLevelRewards] = useState<LevelReward[]>(INITIAL_LEVEL_REWARDS);
    const { toast } = useToast();

    const getGamificationConfigFromStorage = useCallback((): GamificationConfig => {
        if (typeof window === "undefined") return INITIAL_GAMIFICATION_CONFIG;
        try {
            const configJson = localStorage.getItem(GAMIFICATION_CONFIG_KEY);
            if (configJson) {
                const parsed = JSON.parse(configJson);
                // Ensure all keys exist, merging with defaults if not
                return {
                    ...INITIAL_GAMIFICATION_CONFIG,
                    ...parsed,
                    ratingScores: { ...INITIAL_GAMIFICATION_CONFIG.ratingScores, ...parsed.ratingScores },
                    achievements: parsed.achievements || INITIAL_GAMIFICATION_CONFIG.achievements,
                    levelRewards: parsed.levelRewards || INITIAL_GAMIFICATION_CONFIG.levelRewards,
                };
            }
            localStorage.setItem(GAMIFICATION_CONFIG_KEY, JSON.stringify(INITIAL_GAMIFICATION_CONFIG));
            return INITIAL_GAMIFICATION_CONFIG;
        } catch (error) {
            console.error("Failed to parse gamification config from localStorage", error);
            return INITIAL_GAMIFICATION_CONFIG;
        }
    }, []);

    useEffect(() => {
        const config = getGamificationConfigFromStorage();
        setGamificationConfig(config);
        setAchievements(config.achievements);
        setLevelRewards(config.levelRewards);
    }, [getGamificationConfigFromStorage]);

    const saveGamificationConfigToStorage = (config: GamificationConfig) => {
        localStorage.setItem(GAMIFICATION_CONFIG_KEY, JSON.stringify(config));
        setGamificationConfig(config);
        setAchievements(config.achievements);
        setLevelRewards(config.levelRewards);
    };

    const updateGamificationConfig = async (newConfig: Partial<Pick<GamificationConfig, 'ratingScores'>>) => {
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

    return { 
        gamificationConfig, 
        updateGamificationConfig,
        achievements,
        updateAchievement,
        levelRewards,
        updateLevelReward
    };
}
