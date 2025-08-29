
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Module } from '@/lib/types';
import { INITIAL_MODULES } from '@/lib/types';

const MODULES_STORAGE_KEY = "controle_acesso_modules";

export function useModulesData() {
    const [modules, setModules] = useState<Module[]>([]);
    const { toast } = useToast();

    const getModulesFromStorage = useCallback((): Module[] => {
        if (typeof window === "undefined") return [];
        try {
            const modulesJson = localStorage.getItem(MODULES_STORAGE_KEY);
            if (modulesJson) {
                return JSON.parse(modulesJson);
            }
            localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(INITIAL_MODULES));
            return INITIAL_MODULES;
        } catch (error) {
            console.error("Failed to parse modules from localStorage", error);
            return INITIAL_MODULES;
        }
    }, []);

    useEffect(() => {
        setModules(getModulesFromStorage());
    }, [getModulesFromStorage]);

    const saveModulesToStorage = (modulesToSave: Module[]) => {
        localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modulesToSave));
        setModules(modulesToSave);
    };

    const addModule = async (moduleData: Omit<Module, 'id' | 'active'>) => {
        const currentModules = getModulesFromStorage();
        if (currentModules.find(m => m.name.toLowerCase() === moduleData.name.toLowerCase())) {
            toast({
                variant: "destructive",
                title: "Erro ao adicionar módulo",
                description: "Um módulo com este nome já existe.",
            });
            throw new Error("Módulo já existe");
        }

        const newModule: Module = {
            ...moduleData,
            id: moduleData.name.toLowerCase().replace(/\s+/g, '-'),
            active: true,
        }

        const newModules = [...currentModules, newModule];
        saveModulesToStorage(newModules);
        toast({
            title: "Módulo Adicionado!",
            description: `O módulo "${newModule.name}" foi criado com sucesso.`
        });
    }

    const updateModule = async (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => {
        const currentModules = getModulesFromStorage();
        
        if (moduleData.name && currentModules.some(m => m.id !== moduleId && m.name.toLowerCase() === moduleData.name?.toLowerCase())) {
          toast({
            variant: "destructive",
            title: "Erro ao atualizar módulo",
            description: "Um módulo com este nome já existe.",
          });
          throw new Error("Nome do módulo já existe");
        }
        
        const newModules = currentModules.map(m => 
            m.id === moduleId ? { ...m, ...moduleData } : m
        );
        saveModulesToStorage(newModules);

        toast({
            title: "Módulo Atualizado!",
            description: `O módulo foi atualizado com sucesso.`
        });
    }

    const toggleModuleStatus = async (moduleId: string) => {
        const currentModules = getModulesFromStorage();
        const newModules = currentModules.map(m => 
            m.id === moduleId ? { ...m, active: !m.active } : m
        );
        saveModulesToStorage(newModules);
        toast({
            title: "Status do Módulo Alterado!",
            description: "O status do módulo foi atualizado."
        });
    };

    const deleteModule = async (moduleId: string) => {
        const currentModules = getModulesFromStorage();
        const newModules = currentModules.filter(m => m.id !== moduleId);
        saveModulesToStorage(newModules);
        
        // This part needs access to allUsers, better to handle it in the main provider or pass data around.
        // For now, it is removed from here and should be handled where both states are available.
        // Or we can read/write directly from local storage but that can cause sync issues.
        // Let's assume for now this needs to be handled in the main provider after calling this function.

        toast({
            title: "Módulo Removido!",
            description: "O módulo foi removido do sistema."
        });
    }


    return { modules, addModule, updateModule, toggleModuleStatus, deleteModule, getModulesFromStorage };
}
