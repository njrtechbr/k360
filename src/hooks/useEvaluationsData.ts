
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Evaluation, EvaluationAnalysis, GamificationConfig, GamificationSeason, Attendant } from '@/lib/types';
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';
import { getScoreFromRating } from './useGamificationData';


const EVALUATIONS_STORAGE_KEY = "controle_acesso_evaluations";
const AI_ANALYSIS_STORAGE_KEY = "controle_acesso_ai_analysis";
const LAST_AI_ANALYSIS_DATE_KEY = "controle_acesso_last_ai_analysis_date";

type AnalysisProgress = {
    current: number;
    total: number;
    evaluation: Evaluation | null;
    status: 'idle' | 'processing' | 'waiting' | 'done';
    countdown: number;
    lastResult: EvaluationAnalysis | null;
};

const parseEvaluationDate = (dateString: string) => {
    // Handles dates like "05/08/2025 11:13:58"
    const parts = dateString.split(/[\s/:]/);
    if (parts.length < 3) return new Date(0).toISOString();
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const hours = parts.length > 3 ? parseInt(parts[3], 10) : 0;
    const minutes = parts.length > 4 ? parseInt(parts[4], 10) : 0;
    const seconds = parts.length > 5 ? parseInt(parts[5], 10) : 0;
    return new Date(year, month, day, hours, minutes, seconds).toISOString();
}

const INITIAL_EVALUATIONS_RAW = [
  { "id": "6002ff6d-ac09-4c64-95b3-e5987cc0b841", "attendantId": "58cd3a1d-9214-4535-b8d8-6f9d9957a570", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("05/08/2025 11:13:58") },
  // ... all other evaluations from the original file
];

const INITIAL_EVALUATIONS: Evaluation[] = INITIAL_EVALUATIONS_RAW.map(ev => ({
    ...ev,
    xpGained: getScoreFromRating(ev.nota, { '1': -5, '2': -2, '3': 1, '4': 3, '5': 5 }), // Initial calculation
}));

type UseEvaluationsDataProps = {
    gamificationConfig: GamificationConfig;
    activeSeason: GamificationSeason | null;
};

export function useEvaluationsData({ gamificationConfig, activeSeason }: UseEvaluationsDataProps) {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [aiAnalysisResults, setAiAnalysisResults] = useState<EvaluationAnalysis[]>([]);
    const [lastAiAnalysis, setLastAiAnalysis] = useState<string | null>(null);
    const [isAiAnalysisRunning, setIsAiAnalysisRunning] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, evaluation: null, status: 'idle', countdown: 0, lastResult: null });

    const { toast } = useToast();

    const getEvaluationsFromStorage = useCallback((): Evaluation[] => {
        if (typeof window === "undefined") return [];
        try {
            const evaluationsJson = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
            if (evaluationsJson) {
                const parsed = JSON.parse(evaluationsJson);
                 if (parsed && parsed.length > 0) {
                     // Backwards compatibility: add xpGained if missing
                    return parsed.map((ev: any) => ({
                        ...ev,
                        xpGained: ev.xpGained ?? getScoreFromRating(ev.nota, gamificationConfig.ratingScores)
                    }));
                 }
            }
            localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
            return INITIAL_EVALUATIONS;
        } catch (error) {
            console.error("Failed to parse evaluations from localStorage", error);
            localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
            return INITIAL_EVALUATIONS;
        }
    }, [gamificationConfig]);

    const getAiAnalysisFromStorage = useCallback((): EvaluationAnalysis[] => {
        if (typeof window === "undefined") return [];
        try {
            const analysisJson = localStorage.getItem(AI_ANALYSIS_STORAGE_KEY);
            return analysisJson ? JSON.parse(analysisJson) : [];
        } catch (error) {
            console.error("Failed to parse AI analysis from localStorage", error);
            return [];
        }
    }, []);

    const getLastAiAnalysisDateFromStorage = useCallback((): string | null => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(LAST_AI_ANALYSIS_DATE_KEY);
    }, []);

    useEffect(() => {
        setEvaluations(getEvaluationsFromStorage());
        setAiAnalysisResults(getAiAnalysisFromStorage());
        setLastAiAnalysis(getLastAiAnalysisDateFromStorage());
    }, [getEvaluationsFromStorage, getAiAnalysisFromStorage, getLastAiAnalysisDateFromStorage]);


    const saveEvaluationsToStorage = (evaluationsToSave: Evaluation[]) => {
        localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(evaluationsToSave));
        setEvaluations(evaluationsToSave);
    }

    const saveAiAnalysisToStorage = (analysis: EvaluationAnalysis[]) => {
        localStorage.setItem(AI_ANALYSIS_STORAGE_KEY, JSON.stringify(analysis));
        setAiAnalysisResults(analysis);
    };

    const saveLastAiAnalysisDate = (date: string) => {
        localStorage.setItem(LAST_AI_ANALYSIS_DATE_KEY, date);
        setLastAiAnalysis(date);
    };

    const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'data' | 'xpGained'> & { data?: string }): Promise<Evaluation> => {
        const { ratingScores, globalXpMultiplier } = gamificationConfig;

        const baseScore = getScoreFromRating(evaluationData.nota, ratingScores);
        const seasonMultiplier = activeSeason?.xpMultiplier ?? 1;
        const totalMultiplier = globalXpMultiplier * seasonMultiplier;

        const xpGained = baseScore * totalMultiplier;

        const currentEvaluations = getEvaluationsFromStorage();
        const newEvaluation: Evaluation = {
            id: crypto.randomUUID(),
            attendantId: evaluationData.attendantId,
            nota: evaluationData.nota,
            comentario: evaluationData.comentario,
            data: evaluationData.data || new Date().toISOString(),
            xpGained: xpGained,
        };

        const newEvaluations = [...currentEvaluations, newEvaluation];
        saveEvaluationsToStorage(newEvaluations);
        return newEvaluation;
    };

    const runAiAnalysis = async () => {
        setIsAiAnalysisRunning(true);
        setIsProgressModalOpen(true);

        const allEvaluations = getEvaluationsFromStorage();
        const existingAnalysis = getAiAnalysisFromStorage();
        const analyzedIds = new Set(existingAnalysis.map(a => a.evaluationId));
        
        const pendingEvaluations = allEvaluations.filter(e => !analyzedIds.has(e.id) && e.comentario && e.comentario.trim() !== '(Sem comentário)' && e.comentario.trim() !== '');
        
        if (pendingEvaluations.length === 0) {
            toast({ title: 'Nenhuma nova avaliação', description: 'Todos os comentários já foram analisados.' });
            setIsAiAnalysisRunning(false);
            setIsProgressModalOpen(false);
            return;
        }
        
        setAnalysisProgress({ current: 0, total: pendingEvaluations.length, evaluation: null, status: 'idle', countdown: 0, lastResult: null });
        let processedCount = 0;

        try {
            for (const ev of pendingEvaluations) {
                processedCount++;
                setAnalysisProgress(prev => ({ ...prev, current: processedCount, evaluation: ev, status: 'processing' }));
                
                try {
                    const result = await analyzeEvaluation({ rating: ev.nota, comment: ev.comentario });
                    const newResult: EvaluationAnalysis = {
                        evaluationId: ev.id,
                        sentiment: result.sentiment,
                        summary: result.summary,
                        analyzedAt: new Date().toISOString(),
                    };

                    // Save result immediately
                    const currentResults = getAiAnalysisFromStorage();
                    saveAiAnalysisToStorage([...currentResults, newResult]);
                    
                    setAnalysisProgress(prev => ({ ...prev, status: 'waiting', lastResult: newResult }));

                    // Countdown before next request
                    const countdownDuration = 5;
                    for (let i = countdownDuration; i > 0; i--) {
                       setAnalysisProgress(prev => ({ ...prev, countdown: i }));
                       await new Promise(resolve => setTimeout(resolve, 1000));
                    }

                } catch (error) {
                    console.error(`Falha ao analisar a avaliação ${ev.id}:`, error);
                    toast({
                        variant: "destructive",
                        title: 'Erro na Análise de IA',
                        description: `Ocorreu um erro ao processar o comentário do ID ${ev.id}. Pulando para o próximo.`,
                    });
                    // Skip this evaluation and continue with others after a pause
                    const countdownDuration = 5;
                    for (let i = countdownDuration; i > 0; i--) {
                       setAnalysisProgress(prev => ({ ...prev, countdown: i, status: 'waiting' }));
                       await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            const now = new Date().toISOString();
            saveLastAiAnalysisDate(now);

            toast({
                title: 'Análise Concluída!',
                description: `${processedCount} novas avaliações foram processadas.`,
            });

        } catch (error) {
            console.error("A análise de IA falhou", error);
            toast({
                variant: "destructive",
                title: 'Erro na Análise de IA',
                description: 'Ocorreu um erro geral ao processar os comentários. Tente novamente mais tarde.',
            });
        } finally {
            setIsAiAnalysisRunning(false);
            setIsProgressModalOpen(false);
            setAnalysisProgress({ current: 0, total: 0, evaluation: null, status: 'done', countdown: 0, lastResult: null });
        }
    };


    return {
        evaluations,
        addEvaluation,
        aiAnalysisResults,
        lastAiAnalysis,
        isAiAnalysisRunning,
        runAiAnalysis,
        analysisProgress,
        isProgressModalOpen,
        setIsProgressModalOpen,
    };
}
