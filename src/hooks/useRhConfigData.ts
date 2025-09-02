
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Funcao, Setor } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export function useRhConfigData() {
    const [funcoes, setFuncoes] = useState<Funcao[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const { toast } = useToast();

    const fetchCollection = useCallback(async (collectionName: 'funcoes' | 'setores') => {
        console.log(`RH_CONFIG: Buscando ${collectionName} do Firestore...`);
        try {
            const col = collection(db, collectionName);
            const snapshot = await getDocs(col);
            const list = snapshot.docs.map(doc => doc.id);
            console.log(`RH_CONFIG: ${list.length} ${collectionName} carregados.`);
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
            await setDoc(doc(db, "funcoes", funcao), { name: funcao });
            await fetchFuncoes();
            toast({ title: "Sucesso!", description: `A função "${funcao}" foi adicionada.` });
        } catch (error) {
             console.error("Erro ao adicionar função:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar a função." });
             throw error;
        }
    };
    
    const updateFuncao = async (oldFuncao: string, newFuncao: string) => {
        try {
            await deleteDoc(doc(db, "funcoes", oldFuncao));
            await setDoc(doc(db, "funcoes", newFuncao), { name: newFuncao });
            await fetchFuncoes();
            // Here you might need to update all attendants using the old function
            toast({ title: "Sucesso!", description: "Função atualizada. Lembre-se de atualizar os atendentes, se necessário." });
        } catch (error) {
             console.error("Erro ao atualizar função:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar a função." });
             throw error;
        }
    };

    const deleteFuncao = async (funcao: string) => {
        try {
            await deleteDoc(doc(db, "funcoes", funcao));
            await fetchFuncoes();
            toast({ title: "Sucesso!", description: "A função foi removida." });
        } catch (error) {
             console.error("Erro ao remover função:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover a função." });
             throw error;
        }
    };
    
    // --- Setores ---
    const addSetor = async (setor: string) => {
        try {
            await setDoc(doc(db, "setores", setor), { name: setor });
            await fetchSetores();
            toast({ title: "Sucesso!", description: `O setor "${setor}" foi adicionado.` });
        } catch (error) {
             console.error("Erro ao adicionar setor:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar o setor." });
             throw error;
        }
    };
    
    const updateSetor = async (oldSetor: string, newSetor: string) => {
        try {
            await deleteDoc(doc(db, "setores", oldSetor));
            await setDoc(doc(db, "setores", newSetor), { name: newSetor });
            await fetchSetores();
            toast({ title: "Sucesso!", description: "Setor atualizado. Lembre-se de atualizar os atendentes, se necessário." });
        } catch (error) {
             console.error("Erro ao atualizar setor:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o setor." });
             throw error;
        }
    };

    const deleteSetor = async (setor: string) => {
        try {
            await deleteDoc(doc(db, "setores", setor));
            await fetchSetores();
            toast({ title: "Sucesso!", description: "O setor foi removido." });
        } catch (error) {
             console.error("Erro ao remover setor:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o setor." });
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
