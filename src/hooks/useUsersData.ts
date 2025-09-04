
"use client";

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User, Role } from '@/lib/types';
import { useAuth } from '@/hooks/useAuth';
// Removido import do prisma - agora usando APIs

export function useUsersData() {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { toast } = useToast();
    const { user, setUser } = useAuth();
    
    const fetchAllUsers = useCallback(async (): Promise<User[]> => {
        const startTime = performance.now();
        console.log("AUTH: Buscando todos os usuários via API...");
        try {
            const response = await fetch('/api/users');
            if (!response.ok) {
                throw new Error('Erro ao buscar usuários');
            }
            const usersList = await response.json();
            setAllUsers(usersList);
            const endTime = performance.now();
            console.log(`PERF: fetchAllUsers (${usersList.length} items) took ${(endTime - startTime).toFixed(2)}ms`);
            return usersList;
        } catch (error) {
            console.error("AUTH: Erro ao buscar usuários:", error);
            toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível carregar os usuários do sistema."})
            return [];
        }
    }, [toast]);


    const updateUser = useCallback(async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
        try {
            const response = await fetch('/api/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    ...userData
                })
            });

            if (!response.ok) {
                throw new Error('Erro ao atualizar usuário');
            }

            const updatedUser = await response.json();

            if (user && user.id === userId) {
                const updatedSessionUser = { ...user, ...userData };
                setUser(updatedSessionUser);
            }
            
            await fetchAllUsers();

            toast({
                title: "Usuário Atualizado!",
                description: "Os dados do usuário foram atualizados com sucesso.",
            });
        } catch (error) {
             console.error("Erro ao atualizar usuário:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar o usuário."});
             throw error;
        }
    }, [user, setUser, fetchAllUsers, toast]);

    const deleteUser = useCallback(async (userId: string) => {
        if (user?.id === userId) {
            toast({
                variant: "destructive",
                title: "Ação não permitida",
                description: "Você não pode excluir sua própria conta.",
            });
            throw new Error("Auto-exclusão não é permitida");
        }
        
        try {
            const response = await fetch('/api/users', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            });

            if (!response.ok) {
                throw new Error('Erro ao deletar usuário');
            }
            
            await fetchAllUsers();
            toast({
                title: "Usuário Removido!",
                description: "O registro do usuário foi removido do banco de dados.",
            });
        } catch (error) {
             console.error("Erro ao remover usuário:", error);
             toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o usuário."});
             throw error;
        }
    }, [user?.id, fetchAllUsers, toast]);

    return { allUsers, setAllUsers, fetchAllUsers, updateUser, deleteUser };
}
