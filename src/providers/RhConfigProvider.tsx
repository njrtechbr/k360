
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRhConfigData } from '@/hooks/useRhConfigData';
import type { Funcao, Setor } from '@/lib/types';

interface RhConfigContextType {
    funcoes: Funcao[];
    setores: Setor[];
    fetchFuncoes: () => Promise<string[]>;
    fetchSetores: () => Promise<string[]>;
    addFuncao: (funcao: string) => Promise<void>;
    updateFuncao: (oldFuncao: string, newFuncao: string) => Promise<void>;
    deleteFuncao: (funcao: string) => Promise<void>;
    addSetor: (setor: string) => Promise<void>;
    updateSetor: (oldSetor: string, newSetor: string) => Promise<void>;
    deleteSetor: (setor: string) => Promise<void>;
}

const RhConfigContext = createContext<RhConfigContextType | undefined>(undefined);

export const RhConfigProvider = ({ children }: { children: ReactNode }) => {
    const data = useRhConfigData();

    useEffect(() => {
        data.fetchFuncoes();
        data.fetchSetores();
    }, [data.fetchFuncoes, data.fetchSetores]);


    return (
        <RhConfigContext.Provider value={data}>
            {children}
        </RhConfigContext.Provider>
    );
};

export const useRhConfig = () => {
    const context = useContext(RhConfigContext);
    if (context === undefined) {
        throw new Error('useRhConfig must be used within a RhConfigProvider');
    }
    return context;
};
