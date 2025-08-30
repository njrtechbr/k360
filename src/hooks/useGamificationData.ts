
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { GamificationConfig } from '@/lib/types';

const GAMIFICATION_CONFIG_KEY = "controle_acesso_gamification_config";

const INITIAL_GAMIFICATION_CONFIG: GamificationConfig = {
    ratingScores: {
        '5': 5,
        '4': 3,
        '3': 1,
        '2': -2,
        '1': -5,
    }
};

export function useGamificationData() {
    const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
    const { toast } = useToast();

    const getGamificationConfigFromStorage = useCallback((): GamificationConfig => {
        if (typeof window === "undefined") return INITIAL_GAMIFICATION_CONFIG;
        try {
            const configJson = localStorage.getItem(GAMIFICATION_CONFIG_KEY);
            if (configJson) {
                return JSON.parse(configJson);
            }
            localStorage.setItem(GAMIFICATION_CONFIG_KEY, JSON.stringify(INITIAL_GAMIFICATION_CONFIG));
            return INITIAL_GAMIFICATION_CONFIG;
        } catch (error) {
            console.error("Failed to parse gamification config from localStorage", error);
            return INITIAL_GAMIFICATION_CONFIG;
        }
    }, []);

    useEffect(() => {
        setGamificationConfig(getGamificationConfigFromStorage());
    }, [getGamificationConfigFromStorage]);

    const saveGamificationConfigToStorage = (config: GamificationConfig) => {
        localStorage.setItem(GAMIFICATION_CONFIG_KEY, JSON.stringify(config));
        setGamificationConfig(config);
    };

    const updateGamificationConfig = async (newConfig: Partial<GamificationConfig>) => {
        const currentConfig = getGamificationConfigFromStorage();
        const updatedConfig = { ...currentConfig, ...newConfig };
        saveGamificationConfigToStorage(updatedConfig);
        toast({
            title: "Configurações Salvas!",
            description: "As regras de gamificação foram atualizadas com sucesso.",
        });
    };

    return { gamificationConfig, updateGamificationConfig };
}
