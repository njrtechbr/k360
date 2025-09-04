
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { Module } from '@/lib/types';
// Removido import do prisma - agora usando APIs

export function useModulesData() {
    const [modules, setModules] = useState<Module[]>([]);
    const { toast } = useToast();

    const fetchModules = useCallback(async () => {
        const startTime = performance.now();
        console.log("MODULES: Buscando módulos via API...");
        try {
            const response = await fetch('/api/modules');
            if (!response.ok) {
                throw new Error('Erro ao buscar módulos');
            }
            const modulesList = await response.json();
            setModules(modulesList);
            const endTime = performance.now();
            console.log(`PERF: fetchModules (${modulesList.length} items) took ${(endTime - startTime).toFixed(2)}ms`);
            return modulesList;
        } catch (error) {
            console.error("MODULES: Erro ao buscar módulos:", error);
            toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível carregar os módulos do sistema." });
            return [];
        }
    }, [toast]);

    const addModule = useCallback(async (moduleData: Omit<Module, 'id' | 'active'>) => {
        try {
            const response = await fetch('/api/modules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(moduleData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Erro ao adicionar módulo');
            }

            const newModule = await response.json();
            setModules(prev => [...prev, newModule]);
            toast({ title: "Módulo Adicionado!", description: `O módulo "${newModule.name}" foi criado.` });
            return newModule;
        } catch (error) {
            console.error("Erro ao adicionar módulo:", error);
            toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível adicionar o módulo." });
            throw error;
        }
    }, [toast]);

    const updateModule = useCallback(async (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => {
         try {
             const response = await fetch('/api/modules', {
                 method: 'PUT',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({ moduleId, ...moduleData })
             });
 
             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Erro ao atualizar módulo');
             }
 
             const updatedModule = await response.json();
             setModules(prev => prev.map(module => module.id === moduleId ? updatedModule : module));
             toast({ title: "Módulo Atualizado!", description: "O módulo foi atualizado com sucesso." });
             return updatedModule;
         } catch (error) {
              console.error("Erro ao atualizar módulo:", error);
              toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível atualizar o módulo." });
              throw error;
         }
     }, [toast]);

    const toggleModuleStatus = useCallback(async (moduleId: string) => {
          try {
             // Primeiro buscar o módulo atual para obter o status
             const currentModule = modules.find(m => m.id === moduleId);
             if (!currentModule) throw new Error("Módulo não encontrado");
             
             const response = await fetch('/api/modules', {
                 method: 'PUT',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({ moduleId, active: !currentModule.active })
             });
 
             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Erro ao alterar status do módulo');
             }
 
             const updatedModule = await response.json();
             setModules(prev => prev.map(module => module.id === moduleId ? updatedModule : module));
             toast({ title: "Status Alterado!", description: "O status do módulo foi atualizado." });
             return updatedModule;
         } catch (error) {
              console.error("Erro ao alterar status do módulo:", error);
              toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível alterar o status." });
              throw error;
         }
     }, [toast, modules]);

    const deleteModule = useCallback(async (moduleId: string) => {
         try {
             const response = await fetch('/api/modules', {
                 method: 'DELETE',
                 headers: {
                     'Content-Type': 'application/json',
                 },
                 body: JSON.stringify({ moduleId })
             });
 
             if (!response.ok) {
                 const errorData = await response.json();
                 throw new Error(errorData.error || 'Erro ao remover módulo');
             }
             
             setModules(prev => prev.filter(module => module.id !== moduleId));
             toast({ title: "Módulo Removido!", description: "O módulo foi removido com sucesso." });
         } catch (error) {
              console.error("Erro ao remover módulo:", error);
              toast({ variant: "destructive", title: "Erro", description: error instanceof Error ? error.message : "Não foi possível remover o módulo." });
              throw error;
         }
     }, [toast]);


    return { modules, fetchModules, addModule, updateModule, toggleModuleStatus, deleteModule };
}
