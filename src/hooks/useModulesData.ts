
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Module } from '@/lib/types';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';

export function useModulesData() {
    const [modules, setModules] = useState<Module[]>([]);
    const { toast } = useToast();

    const fetchModules = useCallback(async () => {
        console.log("MODULES: Buscando módulos do Firestore...");
        try {
            const modulesCollection = collection(db, "modules");
            const modulesSnapshot = await getDocs(modulesCollection);
            const modulesList = modulesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module));
            setModules(modulesList);
            console.log(`MODULES: ${modulesList.length} módulos carregados com sucesso.`);
            return modulesList;
        } catch (error) {
            console.error("MODULES: Erro ao buscar módulos do Firestore:", error);
            toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível carregar os módulos do sistema." });
            return [];
        }
    }, [toast]);

    const addModule = async (moduleData: Omit<Module, 'id' | 'active'>) => {
        try {
            const newId = moduleData.name.toLowerCase().replace(/\s+/g, '-');
            
            const existingModules = await fetchModules();
            if (existingModules.find(m => m.id === newId)) {
                 toast({ variant: "destructive", title: "Erro", description: "Um módulo com este ID já existe." });
                 throw new Error("Módulo já existe");
            }

            const newModule: Module = {
                ...moduleData,
                id: newId,
                active: true,
            };
            
            await setDoc(doc(db, "modules", newId), newModule);
            await fetchModules();

            toast({ title: "Módulo Adicionado!", description: `O módulo "${newModule.name}" foi criado.` });
        } catch (error) {
            console.error("Erro ao adicionar módulo:", error);
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível adicionar o módulo." });
            throw error;
        }
    };

    const updateModule = async (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => {
        try {
            await updateDoc(doc(db, "modules", moduleId), moduleData);
            await fetchModules();
            toast({ title: "Módulo Atualizado!", description: "O módulo foi atualizado com sucesso." });
        } catch (error) {
             console.error("Erro ao atualizar módulo:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o módulo." });
             throw error;
        }
    };

    const toggleModuleStatus = async (moduleId: string) => {
         try {
            const moduleToUpdate = modules.find(m => m.id === moduleId);
            if (!moduleToUpdate) throw new Error("Módulo não encontrado");
            
            await updateDoc(doc(db, "modules", moduleId), { active: !moduleToUpdate.active });
            await fetchModules();
            toast({ title: "Status Alterado!", description: "O status do módulo foi atualizado." });
        } catch (error) {
             console.error("Erro ao alterar status do módulo:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível alterar o status." });
             throw error;
        }
    };

    const deleteModule = async (moduleId: string) => {
        try {
            // This also requires removing the module from all users who have it.
            // This logic is now handled in AuthProvider where it has access to both states.
            await deleteDoc(doc(db, "modules", moduleId));
            await fetchModules();
            toast({ title: "Módulo Removido!", description: "O módulo foi removido com sucesso." });
        } catch (error) {
             console.error("Erro ao remover módulo:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o módulo." });
             throw error;
        }
    };


    return { modules, fetchModules, addModule, updateModule, toggleModuleStatus, deleteModule };
}
