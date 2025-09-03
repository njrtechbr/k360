
"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useUsersData } from '@/hooks/useUsersData';
import type { User, Role } from '@/lib/types';

interface UsersContextType {
    allUsers: User[];
    setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
    fetchAllUsers: () => Promise<User[]>;
    updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
}

const UsersContext = createContext<UsersContextType | undefined>(undefined);

export const UsersProvider = ({ children }: { children: ReactNode }) => {
    const data = useUsersData();

    return (
        <UsersContext.Provider value={data}>
            {children}
        </UsersContext.Provider>
    );
};

export const useUsers = () => {
    const context = useContext(UsersContext);
    if (context === undefined) {
        throw new Error('useUsers must be used within a UsersProvider');
    }
    return context;
};
