
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { GamificationConfig, Achievement, LevelReward, GamificationSeason, Attendant, Evaluation, EvaluationAnalysis, UnlockedAchievement } from '@/lib/types';
import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from '@/lib/achievements';
import { db } from '@/lib/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, deleteDoc, writeBatch } from 'firebase/firestore';


export const getScoreFromRating = (rating: number, scores: GamificationConfig['ratingScores']): number => {
    const key = String(rating) as keyof typeof scores;
    return scores[key] ?? 0;
};

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
    const { toast } = useToast();

    const fetchGamificationConfig = useCallback(async () => {
        console.log("GAMIFICATION: Buscando configurações do Firestore...");
        try {
            const configDocRef = doc(db, "gamification", "config");
            const configDoc = await getDoc(configDocRef);
            if (configDoc.exists()) {
                const data = configDoc.data();
                const mergedAchievements = data.achievements ? mergeAchievementsWithDefaults(data.achievements) : INITIAL_ACHIEVEMENTS;
                const mergedLevelRewards = data.levelRewards ? mergeLevelRewardsWithDefaults(data.levelRewards) : INITIAL_LEVEL_REWARDS;

                const loadedConfig = {
                    ...INITIAL_GAMIFICATION_CONFIG,
                    ...data,
                    achievements: mergedAchievements,
                    levelRewards: mergedLevelRewards,
                };
                setGamificationConfig(loadedConfig);
                setAchievements(mergedAchievements);
                setLevelRewards(mergedLevelRewards);
                setSeasons(data.seasons || []);
                 console.log(`GAMIFICATION: Configurações carregadas do Firestore. ${data.seasons?.length ?? 0} temporadas encontradas.`);
                return loadedConfig;
            } else {
                console.log("GAMIFICATION: Nenhuma configuração encontrada, usando e salvando defaults.");
                await setDoc(configDocRef, {
                     ...INITIAL_GAMIFICATION_CONFIG,
                    achievements: INITIAL_GAMIFICATION_CONFIG.achievements.map(({ isUnlocked, icon, ...ach }) => ach),
                    levelRewards: INITIAL_GAMIFICATION_CONFIG.levelRewards.map(({ icon, ...reward }) => reward),
                });
                setGamificationConfig(INITIAL_GAMIFICATION_CONFIG);
                 return INITIAL_GAMIFICATION_CONFIG;
            }
        } catch (error) {
            console.error("GAMIFICATION: Erro ao buscar config:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar as configurações de gamificação." });
            return INITIAL_GAMIFICATION_CONFIG;
        }
    }, [toast]);
    
    const fetchUnlockedAchievements = useCallback(async () => {
        console.log("GAMIFICATION: Buscando conquistas desbloqueadas...");
        try {
            const snapshot = await getDocs(collection(db, "unlockedAchievements"));
            const unlockedList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UnlockedAchievement));
            setUnlockedAchievements(unlockedList);
            console.log(`GAMIFICATION: ${unlockedList.length} conquistas desbloqueadas carregadas.`);
            return unlockedList;
        } catch (error) {
            console.error("GAMIFICATION: Erro ao buscar conquistas desbloqueadas:", error);
            return [];
        }
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
            const configDocRef = doc(db, "gamification", "config");
            await updateDoc(configDocRef, newConfig);
            await fetchGamificationConfig();
            toast({ title: "Configurações Salvas!", description: "As regras de pontuação foram atualizadas." });
        } catch (error) {
             console.error("Erro ao salvar config:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar as configurações." });
        }
    };
    
    const saveSeasons = async (newSeasons: GamificationSeason[]) => {
         try {
            const configDocRef = doc(db, "gamification", "config");
            await updateDoc(configDocRef, { seasons: newSeasons });
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
    
    const updateFullConfig = async (config: GamificationConfig) => {
        try {
            const configToSave = {
                ...config,
                achievements: config.achievements.map(({ isUnlocked, icon, ...ach }) => ach),
                levelRewards: config.levelRewards.map(({ icon, ...reward }) => reward),
            };
            await setDoc(doc(db, "gamification", "config"), configToSave);
            await fetchGamificationConfig();
        } catch (error) {
            console.error("Erro ao salvar config completa:", error);
        }
    };
    
    const updateAchievement = async (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => {
        const updatedAchievements = achievements.map(ach => ach.id === id ? { ...ach, ...data } : ach);
        await updateFullConfig({ ...gamificationConfig, achievements: updatedAchievements });
        toast({ title: "Troféu Atualizado!", description: "As informações do troféu foram salvas." });
    };

    const updateLevelReward = async (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => {
        const updatedLevelRewards = levelRewards.map(reward => reward.level === level ? { ...reward, ...data } : reward);
        await updateFullConfig({ ...gamificationConfig, levelRewards: updatedLevelRewards });
        toast({ title: "Recompensa Atualizada!", description: "A recompensa do nível foi salva." });
    };

    const recalculateAllGamificationData = useCallback(async (allAttendants: Attendant[], allEvaluations: Evaluation[], allAiAnalysis: EvaluationAnalysis[]) => {
        console.log("GAMIFICATION: Iniciando recalculo geral...");
        
        const currentConfig = await fetchGamificationConfig();
        
        // 1. Recalculate XP for all evaluations
        const updatedEvaluations = allEvaluations.map(ev => {
             const evaluationDate = new Date(ev.data);
             const seasonForEvaluation = currentConfig.seasons.find(s => s.active && evaluationDate >= new Date(s.startDate) && evaluationDate <= new Date(s.endDate));
             const baseScore = getScoreFromRating(ev.nota, currentConfig.ratingScores);
             const seasonMultiplier = seasonForEvaluation?.xpMultiplier ?? 1;
             const totalMultiplier = currentConfig.globalXpMultiplier * seasonMultiplier;
             return { ...ev, xpGained: baseScore * totalMultiplier };
        });

        const evBatch = writeBatch(db);
        updatedEvaluations.forEach(ev => {
            const docRef = doc(db, "evaluations", ev.id);
            evBatch.update(docRef, { xpGained: ev.xpGained });
        });
        await evBatch.commit();
        console.log(`GAMIFICATION: XP de ${updatedEvaluations.length} avaliações recalculado.`);

        // 2. Re-evaluate achievements for all attendants
        const currentUnlocked = await fetchUnlockedAchievements();
        const deleteBatch = writeBatch(db);
        currentUnlocked.forEach(ua => deleteBatch.delete(doc(db, "unlockedAchievements", ua.id)));
        await deleteBatch.commit();
        console.log(`GAMIFICATION: ${currentUnlocked.length} conquistas desbloqueadas antigas removidas.`);

        const addBatch = writeBatch(db);
        let newUnlockCount = 0;

        for (const attendant of allAttendants) {
            const now = new Date();
            const attendantEvaluations = updatedEvaluations.filter(ev => ev.attendantId === attendant.id);

            for (const achievement of currentConfig.achievements) {
                const evaluationDateForAchievement = attendantEvaluations.length > 0 ? new Date(attendantEvaluations[attendantEvaluations.length - 1].data) : now;
                const seasonForAchievement = currentConfig.seasons.find(s => s.active && evaluationDateForAchievement >= new Date(s.startDate) && evaluationDateForAchievement <= new Date(s.endDate));

                if (achievement.active && seasonForAchievement) {
                    if (achievement.isUnlocked(attendant, attendantEvaluations, updatedEvaluations, allAttendants, allAiAnalysis)) {
                        const seasonMultiplier = seasonForAchievement.xpMultiplier || 1;
                        const totalMultiplier = currentConfig.globalXpMultiplier * seasonMultiplier;
                        
                        const newUnlock: Omit<UnlockedAchievement, 'id'> = {
                            attendantId: attendant.id,
                            achievementId: achievement.id,
                            unlockedAt: now.toISOString(),
                            xpGained: achievement.xp * totalMultiplier,
                        };
                        const newDocRef = doc(collection(db, "unlockedAchievements"));
                        addBatch.set(newDocRef, newUnlock);
                        newUnlockCount++;
                    }
                }
            }
        }

        await addBatch.commit();
        console.log(`GAMIFICATION: Recálculo concluído. ${newUnlockCount} novas conquistas registradas.`);
        await fetchUnlockedAchievements(); // Refresh state

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
    };
}
