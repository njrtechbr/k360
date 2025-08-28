
"use client";

import type { ReactNode } from "react";
import React, { useCallback } from "react";
import type { User, Module } from "@/lib/types";
import { INITIAL_MODULES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";
const MODULES_STORAGE_KEY = "controle_acesso_modules";

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
  modules: Module[];
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active" | "path">>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [modules, setModules] = React.useState<Module[]>([]);
  const [loading, setLoading] = React.useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const getUsersFromStorage = (): User[] => {
    if (typeof window === "undefined") return [];
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    return usersJson ? JSON.parse(usersJson) : [];
  };

  const getModulesFromStorage = useCallback((): Module[] => {
    if (typeof window === "undefined") return [];
    const modulesJson = localStorage.getItem(MODULES_STORAGE_KEY);
    if (modulesJson) {
      return JSON.parse(modulesJson);
    }
    // Initialize with default modules if none exist
    localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(INITIAL_MODULES));
    return INITIAL_MODULES;
  }, []);

  const saveUsersToStorage = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  };

  const saveModulesToStorage = (modules: Module[]) => {
    localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
    setModules(modules);
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
      setModules(getModulesFromStorage());
      setLoading(false);
    }
  }, [getModulesFromStorage]);

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
      modules: userData.role === 'superadmin' ? modules.map(m => m.id) : userData.modules,
    };

    const newUsers = [...users, newUser];
    saveUsersToStorage(newUsers);
    
    // Auto-login after registration
    setUser(newUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));

    toast({
      title: "Registro bem-sucedido!",
      description: `Bem-vindo, ${newUser.name}!`,
    });
    router.push("/dashboard");
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

    // Remove module from all users
    const users = getUsersFromStorage();
    const updatedUsers = users.map(u => ({
        ...u,
        modules: u.modules.filter(mId => mId !== moduleId),
    }));
    saveUsersToStorage(updatedUsers);

    // If the currently logged-in user was affected, update their session
    if (user && user.modules.includes(moduleId)) {
      const updatedUser = {
        ...user,
        modules: user.modules.filter(mId => mId !== moduleId),
      };
      setUser(updatedUser);
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedUser));
    }

    toast({
        title: "Módulo Removido!",
        description: "O módulo foi removido do sistema e dos usuários."
    });
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
    hasSuperAdmin,
    modules,
    addModule,
    updateModule,
    toggleModuleStatus,
    deleteModule,
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
