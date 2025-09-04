
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Evaluation, EvaluationAnalysis, GamificationConfig, GamificationSeason, Attendant, EvaluationImport } from '@/lib/types';
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';
// Removido import do prisma - agora usando APIs
import { getScoreFromRating } from '@/lib/gamification';


const AI_ANALYSIS_STORAGE_KEY = "controle_acesso_ai_analysis"; // Can be migrated later if needed
const LAST_AI_ANALYSIS_DATE_KEY = "controle_acesso_last_ai_analysis_date";

type AnalysisProgress = {
    current: number;
    total: number;
    evaluation: Evaluation | null;
    status: 'idle' | 'processing' | 'waiting' | 'done';
    countdown: number;
    lastResult: EvaluationAnalysis | null;
};

type UseEvaluationsDataProps = {
    gamificationConfig: GamificationConfig;
    activeSeason: GamificationSeason | null;
};

export function useEvaluationsData({ gamificationConfig, activeSeason }: UseEvaluationsDataProps) {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [evaluationImports, setEvaluationImports] = useState<EvaluationImport[]>([]);
    const [aiAnalysisResults, setAiAnalysisResults] = useState<EvaluationAnalysis[]>([]);
    const [lastAiAnalysis, setLastAiAnalysis] = useState<string | null>(null);
    const [isAiAnalysisRunning, setIsAiAnalysisRunning] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, evaluation: null, status: 'idle', countdown: 0, lastResult: null });

    const { toast } = useToast();

    const fetchEvaluations = useCallback(async () => {
        const startTime = performance.now();
        console.log("EVALUATIONS: Buscando avaliações via API...");
        try {
            const response = await fetch('/api/evaluations');
            if (!response.ok) {
                throw new Error('Erro ao buscar avaliações');
            }
            const list = await response.json();
            setEvaluations(list);
            const endTime = performance.now();
            console.log(`PERF: fetchEvaluations (${list.length} items) took ${(endTime - startTime).toFixed(2)}ms`);
            return list;
        } catch (error) {
            console.error("EVALUATIONS: Erro ao buscar avaliações:", error);
            return [];
        }
    }, []);

    const fetchEvaluationImports = useCallback(async () => {
        const startTime = performance.now();
        console.log("EVALUATIONS: Buscando histórico de importação via API...");
         try {
            const response = await fetch('/api/evaluations/imports');
            if (!response.ok) {
                throw new Error('Erro ao buscar histórico de importações');
            }
            const list = await response.json();
            setEvaluationImports(list);
            const endTime = performance.now();
            console.log(`PERF: fetchEvaluationImports (${list.length} items) took ${(endTime - startTime).toFixed(2)}ms`);
            return list;
        } catch (error) {
            console.error("EVALUATIONS: Erro ao buscar históricos:", error);
            return [];
        }
    }, []);


    // For AI Analysis, we keep it in localStorage for now as it's less critical
    const getAiAnalysisFromStorage = useCallback((): EvaluationAnalysis[] => {
        if (typeof window === "undefined") return [];
        try {
            const analysisJson = localStorage.getItem(AI_ANALYSIS_STORAGE_KEY);
            return analysisJson ? JSON.parse(analysisJson) : [];
        } catch (error) {
            return [];
        }
    }, []);

     const getLastAiAnalysisDateFromStorage = useCallback((): string | null => {
        if (typeof window === "undefined") return null;
        return localStorage.getItem(LAST_AI_ANALYSIS_DATE_KEY);
    }, []);

    useEffect(() => {
        setAiAnalysisResults(getAiAnalysisFromStorage());
        setLastAiAnalysis(getLastAiAnalysisDateFromStorage());
    }, [getAiAnalysisFromStorage, getLastAiAnalysisDateFromStorage]);


    const saveAiAnalysisToStorage = (analysis: EvaluationAnalysis[]) => {
        localStorage.setItem(AI_ANALYSIS_STORAGE_KEY, JSON.stringify(analysis));
        setAiAnalysisResults(analysis);
    };

    const saveLastAiAnalysisDate = (date: string) => {
        localStorage.setItem(LAST_AI_ANALYSIS_DATE_KEY, date);
        setLastAiAnalysis(date);
    };

    const addEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>): Promise<Evaluation> => {
        try {
            const response = await fetch('/api/evaluations/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    evaluationData,
                    gamificationConfig,
                    activeSeason
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao criar avaliação');
            }

            const finalEvaluation = await response.json();
            await fetchEvaluations();
            return finalEvaluation;
        } catch (error) {
            console.error("EVALUATIONS: Erro ao adicionar avaliação:", error);
            throw error;
        }
    }, [gamificationConfig, activeSeason, fetchEvaluations]);

    const deleteEvaluations = useCallback(async (evaluationIds: string[]) => {
        try {
            const response = await fetch('/api/evaluations', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ evaluationIds })
            });

            if (!response.ok) {
                throw new Error('Erro ao deletar avaliações');
            }

            await fetchEvaluations();

            // Also delete AI analysis associated with these evaluations
            const currentAiAnalysis = getAiAnalysisFromStorage();
            const aiAnalysisToKeep = currentAiAnalysis.filter(ar => !evaluationIds.includes(ar.evaluationId));
            saveAiAnalysisToStorage(aiAnalysisToKeep);

        } catch (error) {
            console.error("EVALUATIONS: Erro ao remover avaliações:", error);
            throw error;
        }
    }, [fetchEvaluations, getAiAnalysisFromStorage, saveAiAnalysisToStorage]);

     const addImportRecord = useCallback(async (importData: Omit<EvaluationImport, 'id'>): Promise<EvaluationImport> => {
        try {
            const response = await fetch('/api/evaluations/imports/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(importData)
            });

            if (!response.ok) {
                throw new Error('Erro ao criar registro de importação');
            }

            const newImport = await response.json();
            await fetchEvaluationImports();
            return newImport;
        } catch (error) {
            console.error("EVALUATIONS: Erro ao salvar histórico de importação:", error);
            throw error;
        }
    }, [fetchEvaluationImports]);

    const revertImport = useCallback(async (importId: string) => {
        try {
            const response = await fetch(`/api/evaluations/imports/${importId}/revert`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Erro ao reverter importação');
            }

            const result = await response.json();

            // Atualizar os estados
            await fetchEvaluations();
            await fetchEvaluationImports();

            // Remove AI analysis for deleted evaluations
            const currentAiAnalysis = getAiAnalysisFromStorage();
            const aiAnalysisToKeep = currentAiAnalysis.filter(ar => !result.deletedEvaluationIds.includes(ar.evaluationId));
            saveAiAnalysisToStorage(aiAnalysisToKeep);
            
            toast({
                title: "Importação Revertida!",
                description: "As avaliações da importação selecionada foram removidas.",
            });

            return result;
        } catch (error) {
            console.error("EVALUATIONS: Erro ao reverter importação:", error);
            toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao reverter importação.' });
            throw error;
        }
    }, [fetchEvaluations, fetchEvaluationImports, getAiAnalysisFromStorage, saveAiAnalysisToStorage, toast]);

    const runAiAnalysis = async () => {
        setIsAiAnalysisRunning(true);
        setIsProgressModalOpen(true);

        const allEvaluations = await fetchEvaluations();
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

                    const currentResults = getAiAnalysisFromStorage();
                    saveAiAnalysisToStorage([...currentResults, newResult]);
                    
                    setAnalysisProgress(prev => ({ ...prev, status: 'waiting', lastResult: newResult }));

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
                    const countdownDuration = 5;
                    for (let i = countdownDuration; i > 0; i--) {
                       setAnalysisProgress(prev => ({ ...prev, countdown: i, status: 'waiting' }));
                       await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                }
            }
            
            const now = new Date().toISOString();
            saveLastAiAnalysisDate(now);
            toast({ title: 'Análise Concluída!', description: `${processedCount} novas avaliações foram processadas.` });

        } catch (error) {
            console.error("A análise de IA falhou", error);
            toast({ variant: "destructive", title: 'Erro na Análise de IA', description: 'Ocorreu um erro geral. Tente novamente.' });
        } finally {
            setIsAiAnalysisRunning(false);
            setIsProgressModalOpen(false);
            setAnalysisProgress({ current: 0, total: 0, evaluation: null, status: 'done', countdown: 0, lastResult: null });
        }
    };

    return {
        evaluations,
        fetchEvaluations,
        addEvaluation,
        deleteEvaluations,
        aiAnalysisResults,
        lastAiAnalysis,
        isAiAnalysisRunning,
        runAiAnalysis,
        analysisProgress,
        isProgressModalOpen,
        setIsProgressModalOpen,
        evaluationImports,
        fetchEvaluationImports,
        addImportRecord,
        revertImport,
    };
}

    