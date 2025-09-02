
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { INITIAL_FUNCOES, INITIAL_SETORES, type Funcao, type Setor } from '@/lib/types';

const FUNCOES_STORAGE_KEY = "controle_acesso_funcoes";
const SETORES_STORAGE_KEY = "controle_acesso_setores";

export function useRhConfigData() {
    const [funcoes, setFuncoes] = useState<Funcao[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const { toast } = useToast();

    const getFromStorage = useCallback((key: string, initialData: string[]): string[] => {
        if (typeof window === "undefined") return [];
        try {
            const json = localStorage.getItem(key);
            if (json) {
                const parsed = JSON.parse(json);
                if (parsed && parsed.length > 0) return parsed;
            }
            localStorage.setItem(key, JSON.stringify(initialData));
            return initialData;
        } catch (error) {
            console.error(`Failed to parse ${key} from localStorage`, error);
            localStorage.setItem(key, JSON.stringify(initialData));
            return initialData;
        }
    }, []);

    useEffect(() => {
        setFuncoes(getFromStorage(FUNCOES_STORAGE_KEY, INITIAL_FUNCOES));
        setSetores(getFromStorage(SETORES_STORAGE_KEY, INITIAL_SETORES));
    }, [getFromStorage]);

    const saveToStorage = (key: string, data: string[], setter: React.Dispatch<React.SetStateAction<string[]>>) => {
        localStorage.setItem(key, JSON.stringify(data));
        setter(data);
    };

    // --- Funções ---
    const addFuncao = async (funcao: string) => {
        const current = getFromStorage(FUNCOES_STORAGE_KEY, INITIAL_FUNCOES);
        if (current.find(f => f.toLowerCase() === funcao.toLowerCase())) {
            toast({ variant: "destructive", title: "Erro", description: "Esta função já existe." });
            throw new Error("Função já existe");
        }
        const updated = [...current, funcao];
        saveToStorage(FUNCOES_STORAGE_KEY, updated, setFuncoes);
        toast({ title: "Sucesso!", description: `A função "${funcao}" foi adicionada.` });
    };
    
    const updateFuncao = async (oldFuncao: string, newFuncao: string) => {
        const current = getFromStorage(FUNCOES_STORAGE_KEY, INITIAL_FUNCOES);
         if (current.find(f => f.toLowerCase() === newFuncao.toLowerCase() && f.toLowerCase() !== oldFuncao.toLowerCase())) {
            toast({ variant: "destructive", title: "Erro", description: "Esta função já existe." });
            throw new Error("Função já existe");
        }
        const updated = current.map(f => f.toLowerCase() === oldFuncao.toLowerCase() ? newFuncao : f);
        saveToStorage(FUNCOES_STORAGE_KEY, updated, setFuncoes);
        toast({ title: "Sucesso!", description: "Função atualizada." });
    };

    const deleteFuncao = async (funcao: string) => {
        const current = getFromStorage(FUNCOES_STORAGE_KEY, INITIAL_FUNCOES);
        const updated = current.filter(f => f.toLowerCase() !== funcao.toLowerCase());
        saveToStorage(FUNCOES_STORAGE_KEY, updated, setFuncoes);
        toast({ title: "Sucesso!", description: "A função foi removida." });
    };
    
    // --- Setores ---
    const addSetor = async (setor: string) => {
        const current = getFromStorage(SETORES_STORAGE_KEY, INITIAL_SETORES);
        if (current.find(s => s.toLowerCase() === setor.toLowerCase())) {
            toast({ variant: "destructive", title: "Erro", description: "Este setor já existe." });
            throw new Error("Setor já existe");
        }
        const updated = [...current, setor];
        saveToStorage(SETORES_STORAGE_KEY, updated, setSetores);
        toast({ title: "Sucesso!", description: `O setor "${setor}" foi adicionado.` });
    };
    
    const updateSetor = async (oldSetor: string, newSetor: string) => {
        const current = getFromStorage(SETORES_STORAGE_KEY, INITIAL_SETORES);
         if (current.find(s => s.toLowerCase() === newSetor.toLowerCase() && s.toLowerCase() !== oldSetor.toLowerCase())) {
            toast({ variant: "destructive", title: "Erro", description: "Este setor já existe." });
            throw new Error("Setor já existe");
        }
        const updated = current.map(s => s.toLowerCase() === oldSetor.toLowerCase() ? newSetor : s);
        saveToStorage(SETORES_STORAGE_KEY, updated, setSetores);
        toast({ title: "Sucesso!", description: "Setor atualizado." });
    };

    const deleteSetor = async (setor: string) => {
        const current = getFromStorage(SETORES_STORAGE_KEY, INITIAL_SETORES);
        const updated = current.filter(s => s.toLowerCase() !== setor.toLowerCase());
        saveToStorage(SETORES_STORAGE_KEY, updated, setSetores);
        toast({ title: "Sucesso!", description: "O setor foi removido." });
    };

    return { 
        funcoes, 
        setores,
        addFuncao,
        updateFuncao,
        deleteFuncao,
        addSetor,
        updateSetor,
        deleteSetor
    };
}
