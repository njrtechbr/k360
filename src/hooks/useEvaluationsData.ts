
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Evaluation, EvaluationAnalysis, GamificationConfig, GamificationSeason, Attendant, EvaluationImport } from '@/lib/types';
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getScoreFromRating } from './useGamificationData';


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
        console.log("EVALUATIONS: Buscando avaliações do Firestore...");
        try {
            const snapshot = await getDocs(collection(db, "evaluations"));
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
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
        console.log("EVALUATIONS: Buscando histórico de importação...");
         try {
            const snapshot = await getDocs(collection(db, "evaluationImports"));
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvaluationImport));
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

    const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>): Promise<Evaluation> => {
        const evaluationDate = new Date(evaluationData.data);
        const baseScore = getScoreFromRating(evaluationData.nota, gamificationConfig.ratingScores);
        
        let xpGained = baseScore;
        if (activeSeason && evaluationDate >= new Date(activeSeason.startDate) && evaluationDate <= new Date(activeSeason.endDate)) {
            const totalMultiplier = gamificationConfig.globalXpMultiplier * activeSeason.xpMultiplier;
            xpGained = baseScore * totalMultiplier;
        }
        
        const newEvaluation: Omit<Evaluation, 'id'> = {
            ...evaluationData,
            data: evaluationData.data || new Date().toISOString(),
            xpGained,
        };

        const docRef = doc(collection(db, "evaluations"));
        await setDoc(docRef, newEvaluation);
        const finalEvaluation = { ...newEvaluation, id: docRef.id };
        await fetchEvaluations();
        return finalEvaluation;
    };

    const deleteEvaluations = async (evaluationIds: string[]) => {
         try {
            const batch = writeBatch(db);
            evaluationIds.forEach(id => {
                batch.delete(doc(db, "evaluations", id));
            });
            await batch.commit();
            await fetchEvaluations();

            // Also delete AI analysis associated with these evaluations
            const currentAiAnalysis = getAiAnalysisFromStorage();
            const aiAnalysisToKeep = currentAiAnalysis.filter(ar => !evaluationIds.includes(ar.evaluationId));
            saveAiAnalysisToStorage(aiAnalysisToKeep);

        } catch (error) {
            console.error("EVALUATIONS: Erro ao remover avaliações:", error);
            throw error;
        }
    };

     const addImportRecord = async (importData: Omit<EvaluationImport, 'id'>): Promise<EvaluationImport> => {
        try {
            const docRef = doc(collection(db, "evaluationImports"));
            const newImport = { ...importData, id: docRef.id };
            await setDoc(docRef, newImport);
            await fetchEvaluationImports();
            return newImport;
        } catch (error) {
            console.error("EVALUATIONS: Erro ao salvar histórico de importação:", error);
            throw error;
        }
    };

    const revertImport = async (importId: string) => {
        const importToRevert = evaluationImports.find(i => i.id === importId);
        if (!importToRevert) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Importação não encontrada.' });
            return;
        }

        await deleteEvaluations(importToRevert.evaluationIds);
        await deleteDoc(doc(db, "evaluationImports", importId));
        await fetchEvaluationImports();
        
        toast({
            title: "Importação Revertida!",
            description: "As avaliações da importação selecionada foram removidas.",
        });
    };

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
