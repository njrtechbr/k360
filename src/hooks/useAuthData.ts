
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";

export function useAuthData() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        if (typeof window !== "undefined") {
            const sessionJson = localStorage.getItem(SESSION_STORAGE_KEY);
            if (sessionJson) {
                try {
                    setUser(JSON.parse(sessionJson));
                } catch (error) {
                    console.error("Failed to parse session from localStorage", error);
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                }
            }
            setLoading(false);
        }
    }, []);

    const login = async (email: string, password: string): Promise<void> => {
        const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
        const users = usersJson ? JSON.parse(usersJson) : [];
        const foundUser = users.find((u: User) => u.email === email);

        if (foundUser && foundUser.password === password) {
            setUser(foundUser);
            localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(foundUser));
            toast({
                title: "Login bem-sucedido!",
                description: `Bem-vindo de volta, ${foundUser.name}.`,
            });
            router.push("/dashboard");
        } else {
            toast({
                variant: "destructive",
                title: "Erro de autenticação",
                description: "Email ou senha incorretos.",
            });
            throw new Error("Credenciais inválidas");
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(SESSION_STORAGE_KEY);
        router.push("/login");
        toast({
            title: "Logout realizado",
            description: "Você foi desconectado com sucesso.",
        });
    };

    return { user, setUser, loading, login, logout };
}

    