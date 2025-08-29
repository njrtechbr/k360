
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Evaluation, EvaluationAnalysis } from '@/lib/types';
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';

const EVALUATIONS_STORAGE_KEY = "controle_acesso_evaluations";
const AI_ANALYSIS_STORAGE_KEY = "controle_acesso_ai_analysis";
const LAST_AI_ANALYSIS_DATE_KEY = "controle_acesso_last_ai_analysis_date";

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
        toast({ title: 'Análise de IA Iniciada', description: 'Processando comentários... Isso pode levar alguns minutos.' });

        const allEvaluations = getEvaluationsFromStorage();
        const existingAnalysis = getAiAnalysisFromStorage();
        const analyzedIds = new Set(existingAnalysis.map(a => a.evaluationId));

        const evaluationsToAnalyze = allEvaluations.filter(e => !analyzedIds.has(e.id));
        
        if (evaluationsToAnalyze.length === 0) {
            toast({ title: 'Nenhuma nova avaliação', description: 'Todos os comentários já foram analisados.' });
            setIsAiAnalysisRunning(false);
            return;
        }

        try {
            const newResults: EvaluationAnalysis[] = [];
            for (const ev of evaluationsToAnalyze) {
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
                    console.error(`Failed to analyze evaluation ${ev.id}`, error);
                }
            }
            
            saveAiAnalysisToStorage([...existingAnalysis, ...newResults]);
            const now = new Date().toISOString();
            saveLastAiAnalysisDate(now);

            toast({
                title: 'Análise Concluída!',
                description: `${newResults.length} novos comentários foram analisados com sucesso.`,
            });

        } catch (error) {
            console.error("AI Analysis failed", error);
            toast({
                variant: "destructive",
                title: 'Erro na Análise de IA',
                description: 'Ocorreu um erro ao processar os comentários. Tente novamente mais tarde.',
            });
        } finally {
            setIsAiAnalysisRunning(false);
        }
    };


    return {
        evaluations,
        addEvaluation,
        aiAnalysisResults,
        lastAiAnalysis,
        isAiAnalysisRunning,
        runAiAnalysis,
    };
}
