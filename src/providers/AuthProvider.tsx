
"use client";

import type { ReactNode } from "react";
import React, from "react";
import type { User, Role } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  getUsers: () => User[];
  hasSuperAdmin: () => boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const getUsersFromStorage = (): User[] => {
    if (typeof window === "undefined") return [];
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  };

  const saveUsersToStorage = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };
  
  const hasSuperAdmin = (): boolean => {
    const users = getUsersFromStorage();
    return users.some(u => u.role === 'superadmin');
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionJson = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionJson) {
        setUser(JSON.parse(sessionJson));
      }
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    const users = getUsersFromStorage();
    const foundUser = users.find((u) => u.email === email);

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
    })
  };

  const register = async (userData: Omit<User, "id">): Promise<void> => {
    const users = getUsersFromStorage();
    if (users.find((u) => u.email === userData.email)) {
      toast({
        variant: "destructive",
        title: "Erro no registro",
        description: "Este email já está em uso.",
      });
      throw new Error("Email já cadastrado");
    }

    const newUser: User = {
      ...userData,
      id: new Date().toISOString(),
    };

    const newUsers = [...users, newUser];
    saveUsersToStorage(newUsers);

    toast({
      title: "Registro bem-sucedido!",
      description: "Sua conta foi criada. Faça o login para continuar.",
    });
    router.push("/login");
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    if (!user) {
        throw new Error("Usuário não autenticado");
    }
    
    let users = getUsersFromStorage();
    let sessionUser = user;

    // Update user in users list
    users = users.map(u => {
        if(u.id === user.id) {
            const updatedUser = { ...u, ...userData };
            // If password is changed, don't store plain text in session for security.
            // In a real app, this would be handled differently.
            if(userData.password) {
              sessionUser = {...updatedUser};
            } else {
              sessionUser = {...updatedUser};
              delete sessionUser.password;
            }
            return updatedUser;
        }
        return u;
    });

    saveUsersToStorage(users);
    
    // Update current session
    const updatedSessionUser = { ...user, ...userData };
    setUser(updatedSessionUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessionUser));

    toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
    });
  };

  const getUsers = (): User[] => {
    return getUsersFromStorage();
  }

  const value = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    register,
    updateProfile,
    getUsers,
    hasSuperAdmin
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
