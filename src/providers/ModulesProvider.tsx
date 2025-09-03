
"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useModulesData } from '@/hooks/useModulesData';
import type { Module } from '@/lib/types';
import { useUsers } from './UsersProvider';

interface ModulesContextType {
    modules: Module[];
    fetchModules: () => Promise<Module[]>;
    addModule: (moduleData: Omit<Module, 'id' | 'active'>) => Promise<void>;
    updateModule: (moduleId: string, moduleData: Partial<Omit<Module, 'id' | 'active'>>) => Promise<void>;
    toggleModuleStatus: (moduleId: string) => Promise<void>;
    deleteModule: (moduleId: string) => Promise<void>;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

export const ModulesProvider = ({ children }: { children: ReactNode }) => {
    const data = useModulesData();
    const { allUsers, setAllUsers } = useUsers();

    const deleteModuleAndCleanUsers = async (moduleId: string) => {
        await data.deleteModule(moduleId);
        const updatedUsers = allUsers.map(u => ({
            ...u,
            modules: u.modules.filter(mId => mId !== moduleId)
        }));
        setAllUsers(updatedUsers);
    };

    return (
        <ModulesContext.Provider value={{ ...data, deleteModule: deleteModuleAndCleanUsers }}>
            {children}
        </ModulesContext.Provider>
    );
};

export const useModules = () => {
    const context = useContext(ModulesContext);
    if (context === undefined) {
        throw new Error('useModules must be used within a ModulesProvider');
    }
    return context;
};
