
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Funcao, Setor } from '@/lib/types';
// Removido import do prisma - agora usando APIs

export function useRhConfigData() {
    const [funcoes, setFuncoes] = useState<Funcao[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const { toast } = useToast();

    const fetchCollection = useCallback(async (collectionName: 'funcoes' | 'setores') => {
        const startTime = performance.now();
        console.log(`RH_CONFIG: Buscando ${collectionName} via API...`);
        try {
            const response = await fetch(`/api/${collectionName}`);
            if (!response.ok) {
                throw new Error(`Erro ao buscar ${collectionName}`);
            }
            const list = await response.json();
            
            const endTime = performance.now();
            console.log(`PERF: fetchCollection for ${collectionName} (${list.length} items) took ${(endTime - startTime).toFixed(2)}ms`);
            return list;
        } catch (error) {
            console.error(`RH_CONFIG: Erro ao buscar ${collectionName}:`, error);
            toast({ variant: "destructive", title: "Erro Crítico", description: `Não foi possível carregar ${collectionName}.` });
            return [];
        }
    }, [toast]);
    
    const fetchFuncoes = useCallback(async () => {
       const data = await fetchCollection('funcoes');
       setFuncoes(data);
       return data;
    }, [fetchCollection]);
    
    const fetchSetores = useCallback(async () => {
       const data = await fetchCollection('setores');
       setSetores(data);
       return data;
    }, [fetchCollection]);

    // --- Funções ---
    const addFuncao = async (funcao: string) => {
        try {
            const response = await fetch('/api/funcoes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: funcao })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao adicionar função');
            }
            
            await fetchFuncoes();
            toast({ title: "Sucesso!", description: `A função "${funcao}" foi adicionada.` });
        } catch (error) {
             console.error("Erro ao adicionar função:", error);
             toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível adicionar a função." });
             throw error;
        }
    };
    
    const updateFuncao = async (oldFuncao: string, newFuncao: string) => {
        try {
            const response = await fetch('/api/funcoes', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldName: oldFuncao, newName: newFuncao })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao atualizar função');
            }
            
            await fetchFuncoes();
            toast({ title: "Sucesso!", description: "Função atualizada. Lembre-se de atualizar os atendentes, se necessário." });
        } catch (error) {
             console.error("Erro ao atualizar função:", error);
             toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível atualizar a função." });
             throw error;
        }
    };

    const deleteFuncao = async (funcao: string) => {
        try {
            const response = await fetch('/api/funcoes', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: funcao })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao remover função');
            }
            
            await fetchFuncoes();
            toast({ title: "Sucesso!", description: "A função foi removida." });
        } catch (error) {
             console.error("Erro ao remover função:", error);
             toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível remover a função." });
             throw error;
        }
    };
    
    // --- Setores ---
    const addSetor = async (setor: string) => {
        try {
            const response = await fetch('/api/setores', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: setor })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao adicionar setor');
            }
            
            await fetchSetores();
            toast({ title: "Sucesso!", description: `O setor "${setor}" foi adicionado.` });
        } catch (error) {
             console.error("Erro ao adicionar setor:", error);
             toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível adicionar o setor." });
             throw error;
        }
    };
    
    const updateSetor = async (oldSetor: string, newSetor: string) => {
        try {
            const response = await fetch('/api/setores', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldName: oldSetor, newName: newSetor })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao atualizar setor');
            }
            
            await fetchSetores();
            toast({ title: "Sucesso!", description: "Setor atualizado. Lembre-se de atualizar os atendentes, se necessário." });
        } catch (error) {
             console.error("Erro ao atualizar setor:", error);
             toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível atualizar o setor." });
             throw error;
        }
    };

    const deleteSetor = async (setor: string) => {
        try {
            const response = await fetch('/api/setores', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: setor })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao remover setor');
            }
            
            await fetchSetores();
            toast({ title: "Sucesso!", description: "O setor foi removido." });
        } catch (error) {
             console.error("Erro ao remover setor:", error);
             toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível remover o setor." });
             throw error;
        }
    };

    return { 
        funcoes, 
        setores,
        fetchFuncoes,
        fetchSetores,
        addFuncao,
        updateFuncao,
        deleteFuncao,
        addSetor,
        updateSetor,
        deleteSetor
    };
}
