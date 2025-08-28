
"use client";

import type { ReactNode } from "react";
import React, { useCallback } from "react";
import type { User, Module, Role } from "@/lib/types";
import { INITIAL_MODULES, ROLES } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";
const MODULES_STORAGE_KEY = "controle_acesso_modules";

// Dummy users for initial seeding
const INITIAL_USERS: User[] = [
    {
      id: 'superadmin-01',
      name: 'Nereu Super Admin',
      email: 'super@email.com',
      password: 'password',
      role: ROLES.SUPERADMIN,
      modules: ['financeiro', 'rh', 'estoque', 'vendas'],
    },
    {
      id: 'admin-01',
      name: 'Ana Admin',
      email: 'admin@email.com',
      password: 'password',
      role: ROLES.ADMIN,
      modules: ['financeiro', 'rh', 'estoque', 'vendas'],
    },
    {
      id: 'supervisor-01',
      name: 'Carlos Supervisor',
      email: 'supervisor@email.com',
      password: 'password',
      role: ROLES.SUPERVISOR,
      modules: ['vendas', 'estoque'],
    },
    {
      id: 'user-01',
      name: 'Beatriz Usuário',
      email: 'usuario@email.com',
      password: 'password',
      role: ROLES.USER,
      modules: ['vendas'],
    },
     {
      id: 'user-02',
      name: 'Daniel Usuário',
      email: 'daniel@email.com',
      password: 'password',
      role: ROLES.USER,
      modules: ['financeiro'],
    }
];


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  getUsers: () => User[];
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  hasSuperAdmin: () => boolean;
  modules: Module[];
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => Promise<void>;
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

  const getUsersFromStorage = useCallback((): User[] => {
    if (typeof window === "undefined") return [];
    const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
    if (usersJson && usersJson !== '[]') {
        return JSON.parse(usersJson);
    }
    // If no users, seed with initial data
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
    return INITIAL_USERS;
  }, []);

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
      getUsersFromStorage(); // Seed users on initial load if necessary
      const sessionJson = localStorage.getItem(SESSION_STORAGE_KEY);
      if (sessionJson) {
        setUser(JSON.parse(sessionJson));
      }
      setModules(getModulesFromStorage());
      setLoading(false);
    }
  }, [getUsersFromStorage, getModulesFromStorage]);

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
    
    // Auto-login after registration only if it's the first user (superadmin)
    // Or if an admin is registering another user, don't switch sessions
    if (!user) {
        setUser(newUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
        router.push("/dashboard");
    } else {
        router.push("/dashboard/usuarios");
    }


    toast({
      title: "Registro bem-sucedido!",
      description: `O usuário ${newUser.name} foi criado.`,
    });
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
            // In a real app, this would be handled differently.
            sessionUser = {...updatedUser};
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

  const updateUser = async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
    let users = getUsersFromStorage();
    users = users.map(u => u.id === userId ? { ...u, ...userData } : u);
    saveUsersToStorage(users);

    // If the admin is editing their own account, update the session
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
    if(user?.id === userId) {
      toast({
        variant: "destructive",
        title: "Ação não permitida",
        description: "Você não pode excluir sua própria conta.",
      });
      throw new Error("Auto-exclusão não é permitida");
    }
    
    let users = getUsersFromStorage();
    users = users.filter(u => u.id !== userId);
    saveUsersToStorage(users);

    toast({
      title: "Usuário Excluído!",
      description: "O usuário foi removido do sistema.",
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

    // When a module's path is updated, we need to update it for users too if we store it there.
    // Currently, we only store IDs, so this is not an issue.

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
    updateUser,
    deleteUser,
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

    