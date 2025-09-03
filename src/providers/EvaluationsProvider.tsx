
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useEvaluationsData } from '@/hooks/useEvaluationsData';
import type { Evaluation, EvaluationImport, EvaluationAnalysis } from '@/lib/types';
import { useGamification } from './GamificationProvider';

interface EvaluationsContextType {
    evaluations: Evaluation[];
    evaluationImports: EvaluationImport[];
    aiAnalysisResults: EvaluationAnalysis[];
    lastAiAnalysis: string | null;
    isAiAnalysisRunning: boolean;
    analysisProgress: any; 
    isProgressModalOpen: boolean;
    setIsProgressModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    fetchEvaluations: () => Promise<Evaluation[]>;
    fetchEvaluationImports: () => Promise<EvaluationImport[]>;
    addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>) => Promise<Evaluation>;
    deleteEvaluations: (evaluationIds: string[]) => Promise<void>;
    addImportRecord: (importData: Omit<EvaluationImport, 'id'>, userId: string) => Promise<EvaluationImport>;
    revertImport: (importId: string) => Promise<void>;
    runAiAnalysis: () => Promise<void>;
}

const EvaluationsContext = createContext<EvaluationsContextType | undefined>(undefined);

export const EvaluationsProvider = ({ children }: { children: ReactNode }) => {
    const { gamificationConfig, seasons } = useGamification();
    const data = useEvaluationsData({ gamificationConfig, seasons });

    return (
        <EvaluationsContext.Provider value={data}>
            {children}
        </EvaluationsContext.Provider>
    );
};

export const useEvaluations = () => {
    const context = useContext(EvaluationsContext);
    if (context === undefined) {
        throw new Error('useEvaluations must be used within an EvaluationsProvider');
    }
    return context;
};
