
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useGamificationData } from '@/hooks/useGamificationData';
import type { GamificationConfig, Achievement, LevelReward, GamificationSeason, Attendant, Evaluation, EvaluationAnalysis, UnlockedAchievement } from '@/lib/types';

interface GamificationContextType {
    gamificationConfig: GamificationConfig;
    achievements: Achievement[];
    levelRewards: LevelReward[];
    seasons: GamificationSeason[];
    activeSeason: GamificationSeason | null;
    nextSeason: GamificationSeason | null;
    unlockedAchievements: UnlockedAchievement[];
    fetchGamificationConfig: () => Promise<GamificationConfig>;
    updateGamificationConfig: (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => Promise<void>;
    updateAchievement: (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => Promise<void>;
    updateLevelReward: (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => Promise<void>;
    addSeason: (seasonData: Omit<GamificationSeason, 'id'>) => void;
    updateSeason: (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => void;
    deleteSeason: (id: string) => void;
    fetchUnlockedAchievements: () => Promise<UnlockedAchievement[]>;
    recalculateAllGamificationData: (allAttendants: Attendant[], allEvaluations: Evaluation[], allAiAnalysis: EvaluationAnalysis[]) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export const GamificationProvider = ({ children }: { children: ReactNode }) => {
    const data = useGamificationData();
    
    useEffect(() => {
        data.fetchGamificationConfig();
        data.fetchUnlockedAchievements();
    }, [data.fetchGamificationConfig, data.fetchUnlockedAchievements]);

    return (
        <GamificationContext.Provider value={data}>
            {children}
        </GamificationContext.Provider>
    );
};

export const useGamification = () => {
    const context = useContext(GamificationContext);
    if (context === undefined) {
        throw new Error('useGamification must be used within a GamificationProvider');
    }
    return context;
};
