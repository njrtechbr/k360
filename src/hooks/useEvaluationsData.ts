
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Evaluation, EvaluationAnalysis } from '@/lib/types';
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';

const EVALUATIONS_STORAGE_KEY = "controle_acesso_evaluations";
const AI_ANALYSIS_STORAGE_KEY = "controle_acesso_ai_analysis";
const LAST_AI_ANALYSIS_DATE_KEY = "controle_acesso_last_ai_analysis_date";

type AnalysisProgress = {
    current: number;
    total: number;
    evaluation: Evaluation | null;
};

const parseEvaluationDate = (dateString: string) => {
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/');
    const [hours, minutes, seconds] = timePart.split(':');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes), parseInt(seconds)).toISOString();
}

const INITIAL_EVALUATIONS: Evaluation[] = [
  { "id": "6002ff6d-ac09-4c64-95b3-e5987cc0b841", "attendantId": "58cd3a1d-9214-4535-b8d8-6f9d9957a570", "nota": 5, "comentario": "(Sem comentário)", "data": parseEvaluationDate("05/08/2025 11:13:58") },
  // ... all other evaluations from the original file
];


export function useEvaluationsData() {
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [aiAnalysisResults, setAiAnalysisResults] = useState<EvaluationAnalysis[]>([]);
    const [lastAiAnalysis, setLastAiAnalysis] = useState<string | null>(null);
    const [isAiAnalysisRunning, setIsAiAnalysisRunning] = useState(false);
    const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
    const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, evaluation: null });

    const { toast } = useToast();

    const getEvaluationsFromStorage = useCallback((): Evaluation[] => {
        if (typeof window === "undefined") return [];
        try {
            const evaluationsJson = localStorage.getItem(EVALUATIONS_STORAGE_KEY);
            if (evaluationsJson) {
                const parsed = JSON.parse(evaluationsJson);
                if (parsed && parsed.length > 0) return parsed;
            }
            localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
            return INITIAL_EVALUATIONS;
        } catch (error) {
            console.error("Failed to parse evaluations from localStorage", error);
            localStorage.setItem(EVALUATIONS_STORAGE_KEY, JSON.stringify(INITIAL_EVALUATIONS));
            return INITIAL_EVALUATIONS;
        }
    }, []);

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

    const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'data'>) => {
        const currentEvaluations = getEvaluationsFromStorage();
        const newEvaluation: Evaluation = {
            ...evaluationData,
            id: crypto.randomUUID(),
            data: new Date().toISOString(),
        };

        const newEvaluations = [...currentEvaluations, newEvaluation];
        saveEvaluationsToStorage(newEvaluations);
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const runAiAnalysis = async () => {
        setIsAiAnalysisRunning(true);

        const allEvaluations = getEvaluationsFromStorage();
        const existingAnalysis = getAiAnalysisFromStorage();
        const analyzedIds = new Set(existingAnalysis.map(a => a.evaluationId));
        
        const pendingEvaluations = allEvaluations.filter(e => !analyzedIds.has(e.id));
        
        if (pendingEvaluations.length === 0) {
            toast({ title: 'Nenhuma nova avaliação', description: 'Todos os comentários já foram analisados.' });
            setIsAiAnalysisRunning(false);
            return;
        }

        const evaluationsWithComments = pendingEvaluations.filter(e => e.comentario.trim() !== '(Sem comentário)' && e.comentario.trim() !== '');
        const evaluationsWithoutComments = pendingEvaluations.filter(e => e.comentario.trim() === '(Sem comentário)' || e.comentario.trim() === '');
        
        setIsProgressModalOpen(true);
        setAnalysisProgress({ current: 0, total: pendingEvaluations.length, evaluation: null });

        try {
            const newResults: EvaluationAnalysis[] = [];
            let processedCount = 0;

            // Process evaluations without comments locally
            for (const ev of evaluationsWithoutComments) {
                let sentiment: 'Positivo' | 'Negativo' | 'Neutro' = 'Neutro';
                if (ev.nota >= 4) sentiment = 'Positivo';
                if (ev.nota <= 2) sentiment = 'Negativo';
                newResults.push({
                    evaluationId: ev.id,
                    sentiment,
                    summary: 'Avaliação feita apenas com nota.',
                    analyzedAt: new Date().toISOString(),
                });
                processedCount++;
                setAnalysisProgress({ current: processedCount, total: pendingEvaluations.length, evaluation: ev });
                await sleep(50); // Small delay for UI update
            }
            
            // Process evaluations with comments using AI, sequentially
            for (const ev of evaluationsWithComments) {
                processedCount++;
                setAnalysisProgress({ current: processedCount, total: pendingEvaluations.length, evaluation: ev });
                try {
                    const result = await analyzeEvaluation({ rating: ev.nota, comment: ev.comentario });
                    newResults.push({
                        evaluationId: ev.id,
                        sentiment: result.sentiment,
                        summary: result.summary,
                        analyzedAt: new Date().toISOString(),
                    });
                    await sleep(2000); 
                } catch (error) {
                    console.error(`Falha ao analisar a avaliação ${ev.id}:`, error);
                    // Skip this evaluation and continue with others
                }
            }
            
            saveAiAnalysisToStorage([...existingAnalysis, ...newResults]);
            const now = new Date().toISOString();
            saveLastAiAnalysisDate(now);

            toast({
                title: 'Análise Concluída!',
                description: `${newResults.length} novas avaliações foram processadas.`,
            });

        } catch (error) {
            console.error("A análise de IA falhou", error);
            toast({
                variant: "destructive",
                title: 'Erro na Análise de IA',
                description: 'Ocorreu um erro ao processar os comentários. Tente novamente mais tarde.',
            });
        } finally {
            setIsAiAnalysisRunning(false);
            setIsProgressModalOpen(false);
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
