
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { User, Role } from '@/lib/types';
import { ROLES } from '@/lib/types';

// Firebase Imports
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";


const SESSION_STORAGE_KEY = "controle_acesso_session";

type UseUsersDataProps = {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
};

export function useUsersData({ user, setUser }: UseUsersDataProps) {
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const { toast } = useToast();
    
    const fetchAllUsers = useCallback(async () => {
        console.log("AUTH: Buscando todos os usuários do Firestore...");
        try {
            const usersCollection = collection(db, "users");
            const usersSnapshot = await getDocs(usersCollection);
            const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
            setAllUsers(usersList);
            console.log(`AUTH: ${usersList.length} usuários carregados com sucesso.`);
            return usersList;
        } catch (error) {
            console.error("AUTH: Erro ao buscar usuários do Firestore:", error);
            toast({ variant: "destructive", title: "Erro Crítico", description: "Não foi possível carregar os usuários do sistema."})
            return [];
        }
    }, [toast]);


    const updateUser = async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
        try {
            const userDocRef = doc(db, "users", userId);
            await updateDoc(userDocRef, userData);

            if (user && user.id === userId) {
                const updatedSessionUser = { ...user, ...userData };
                setUser(updatedSessionUser);
                localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessionUser));
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
        
        try {
            // Note: This only deletes the Firestore record, not the Firebase Auth user.
            // That must be done manually in the Firebase Console for security reasons.
            await deleteDoc(doc(db, "users", userId));
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
    };

    return { allUsers, setAllUsers, fetchAllUsers, updateUser, deleteUser };
}

    