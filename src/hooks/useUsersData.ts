
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User, Role } from '@/lib/types';
import { ROLES } from '@/lib/types';

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";
const INITIAL_USERS: User[] = [];

type UseUsersDataProps = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export function useUsersData({ user, setUser }: UseUsersDataProps) {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { toast } = useToast();

    const getUsersFromStorage = useCallback((): User[] => {
        if (typeof window === "undefined") return [];
        try {
            const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
            if (usersJson) {
                return JSON.parse(usersJson);
            }
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
            return INITIAL_USERS;
        } catch (error) {
            console.error("Failed to parse users from localStorage", error);
            return INITIAL_USERS;
        }
    }, []);

    useEffect(() => {
        setAllUsers(getUsersFromStorage());
    }, [getUsersFromStorage]);

    const saveUsersToStorage = (users: User[]) => {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
        setAllUsers(users);
    };

    const hasSuperAdmin = (): boolean => {
        const users = getUsersFromStorage();
        return users.some(u => u.role === ROLES.SUPERADMIN);
    };

    const updateUser = async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
        let updatedUsers = allUsers.map(u => u.id === userId ? { ...u, ...userData } : u);
        saveUsersToStorage(updatedUsers);

        if (user && user.id === userId) {
            const updatedSessionUser = { ...user, ...userData };
            setUser(updatedSessionUser);
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessionUser));
        }

        toast({
            title: "Usuário Atualizado!",
            description: "Os dados do usuário foram atualizados com sucesso.",
        });
    };

    const deleteUser = async (userId: string) => {
        if (user?.id === userId) {
            toast({
                variant: "destructive",
                title: "Ação não permitida",
                description: "Você não pode excluir sua própria conta.",
            });
            throw new Error("Auto-exclusão não é permitida");
        }

        let updatedUsers = allUsers.filter(u => u.id !== userId);
        saveUsersToStorage(updatedUsers);

        toast({
            title: "Usuário Excluído!",
            description: "O usuário foi removido do sistema.",
        });
    };

    return { allUsers, setAllUsers, updateUser, deleteUser, getUsersFromStorage, hasSuperAdmin };
}
