
"use client";

import type { ReactNode } from "react";
import React, { useCallback, useState } from "react";
import type { User, Module, Role, Attendant } from "@/lib/types";
import { INITIAL_MODULES, ROLES, ATTENDANT_STATUS } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const USERS_STORAGE_KEY = "controle_acesso_users";
const SESSION_STORAGE_KEY = "controle_acesso_session";
const MODULES_STORAGE_KEY = "controle_acesso_modules";
const ATTENDANTS_STORAGE_KEY = "controle_acesso_attendants";

// Dummy users for initial seeding
const INITIAL_USERS: User[] = [
    {
      id: 'superadmin-01',
      name: 'Nereu Super Admin',
      email: 'super@email.com',
      password: 'password',
      role: ROLES.SUPERADMIN,
      modules: ['financeiro', 'rh', 'estoque', 'vendas', 'pesquisa-satisfacao'],
    },
    {
      id: 'admin-01',
      name: 'Ana Admin',
      email: 'admin@email.com',
      password: 'password',
      role: ROLES.ADMIN,
      modules: ['financeiro', 'rh', 'estoque', 'vendas', 'pesquisa-satisfacao'],
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

const INITIAL_ATTENDANTS: Attendant[] = [
    { 
      id: 'atendente-01', 
      name: 'João da Silva', 
      email: 'joao.silva@example.com',
      funcao: 'Atendente de Call Center',
      setor: 'Suporte Técnico',
      status: ATTENDANT_STATUS.ACTIVE,
      avatarUrl: '',
      telefone: '11999998888',
      portaria: 'Acesso liberado',
      situacao: 'Ativo na empresa',
      dataAdmissao: new Date('2022-01-15').toISOString(),
      dataNascimento: new Date('1990-05-20').toISOString(),
      rg: '12.345.678-9',
      cpf: '123.456.789-00'
    },
    { 
      id: 'atendente-02', 
      name: 'Maria Oliveira', 
      email: 'maria.oliveira@example.com',
      funcao: 'Recepcionista',
      setor: 'Administrativo',
      status: ATTENDANT_STATUS.ON_VACATION,
      avatarUrl: '',
      telefone: '21987654321',
      portaria: 'Acesso restrito ao setor',
      situacao: 'Férias',
      dataAdmissao: new Date('2021-03-10').toISOString(),
      dataNascimento: new Date('1995-11-30').toISOString(),
      rg: '98.765.432-1',
      cpf: '098.765.432-11'
    },
    { 
      id: 'atendente-03', 
      name: 'Pedro Santos', 
      email: 'pedro.santos@example.com',
      funcao: 'Técnico de Manutenção',
      setor: 'Operações',
      status: ATTENDANT_STATUS.INACTIVE,
      avatarUrl: '',
      telefone: '31912345678',
      portaria: 'Acesso bloqueado',
      situacao: 'Desligado',
      dataAdmissao: new Date('2023-08-01').toISOString(),
      dataNascimento: new Date('1988-02-10').toISOString(),
      rg: '11.222.333-4',
      cpf: '111.222.333-44'
    },
]


interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  allUsers: User[];
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  hasSuperAdmin: () => boolean;
  modules: Module[];
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  attendants: Attendant[];
  addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<void>;
  updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
  deleteAttendant: (attendantId: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  const getUsersFromStorage = useCallback((): User[] => {
    if (typeof window === "undefined") return [];
    try {
      const usersJson = localStorage.getItem(USERS_STORAGE_KEY);
      if (usersJson && usersJson !== '[]') {
          return JSON.parse(usersJson);
      }
      // If no users, seed with initial data
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    } catch (error) {
      console.error("Failed to parse users from localStorage", error);
      return INITIAL_USERS; // Fallback to initial users
    }
  }, []);

  const getModulesFromStorage = useCallback((): Module[] => {
    if (typeof window === "undefined") return [];
    try {
      const modulesJson = localStorage.getItem(MODULES_STORAGE_KEY);
      if (modulesJson) {
        return JSON.parse(modulesJson);
      }
      // Initialize with default modules if none exist
      localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(INITIAL_MODULES));
      return INITIAL_MODULES;
    } catch (error) {
      console.error("Failed to parse modules from localStorage", error);
      return INITIAL_MODULES;
    }
  }, []);

  const getAttendantsFromStorage = useCallback((): Attendant[] => {
    if (typeof window === "undefined") return [];
    try {
      const attendantsJson = localStorage.getItem(ATTENDANTS_STORAGE_KEY);
      if (attendantsJson) {
        return JSON.parse(attendantsJson);
      }
      // Initialize with default attendants if none exist
      localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(INITIAL_ATTENDANTS));
      return INITIAL_ATTENDANTS;
    } catch (error) {
      console.error("Failed to parse attendants from localStorage", error);
      return INITIAL_ATTENDANTS;
    }
  }, []);

  const saveUsersToStorage = (users: User[]) => {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    setAllUsers(users);
  };

  const saveModulesToStorage = (modules: Module[]) => {
    localStorage.setItem(MODULES_STORAGE_KEY, JSON.stringify(modules));
    setModules(modules);
  };

  const saveAttendantsToStorage = (attendants: Attendant[]) => {
    localStorage.setItem(ATTENDANTS_STORAGE_KEY, JSON.stringify(attendants));
    setAttendants(attendants);
  }
  
  const hasSuperAdmin = (): boolean => {
    const users = getUsersFromStorage();
    return users.some(u => u.role === 'superadmin');
  };

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setAllUsers(getUsersFromStorage());
      setModules(getModulesFromStorage());
      setAttendants(getAttendantsFromStorage());

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
  }, [getUsersFromStorage, getModulesFromStorage, getAttendantsFromStorage]);

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
    const currentUsers = getUsersFromStorage();
    if (currentUsers.find((u) => u.email === userData.email)) {
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

    const newUsers = [...currentUsers, newUser];
    saveUsersToStorage(newUsers);
    
    if (!user) { // This means a public registration
        setUser(newUser);
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newUser));
        toast({
            title: "Registro bem-sucedido!",
            description: `Bem-vindo, ${newUser.name}.`,
        });
        router.push("/dashboard");
    } else { // This means an admin is creating a user
        toast({
            title: "Usuário Criado!",
            description: `O usuário ${newUser.name} foi criado com sucesso.`,
        });
    }
  };

  const updateProfile = async (userData: Partial<User>): Promise<void> => {
    if (!user) {
        throw new Error("Usuário não autenticado");
    }
    
    let updatedUsers = allUsers.map(u => {
        if(u.id === user.id) {
            return { ...u, ...userData };
        }
        return u;
    });

    saveUsersToStorage(updatedUsers);
    
    const updatedSessionUser = { ...user, ...userData };
    setUser(updatedSessionUser);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updatedSessionUser));

    toast({
        title: "Perfil atualizado!",
        description: "Suas informações foram salvas com sucesso."
    });
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
    if(user?.id === userId) {
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

    const updatedUsers = allUsers.map(u => ({
        ...u,
        modules: u.modules.filter(mId => mId !== moduleId),
    }));
    saveUsersToStorage(updatedUsers);

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

  const addAttendant = async (attendantData: Omit<Attendant, 'id'>) => {
    const currentAttendants = getAttendantsFromStorage();
    if (currentAttendants.some(a => a.email.toLowerCase() === attendantData.email.toLowerCase())) {
        toast({
            variant: "destructive",
            title: "Erro ao adicionar atendente",
            description: "Um atendente com este email já existe.",
        });
        throw new Error("Atendente já existe");
    }
     if (currentAttendants.some(a => a.cpf === attendantData.cpf)) {
        toast({
            variant: "destructive",
            title: "Erro ao adicionar atendente",
            description: "Um atendente com este CPF já existe.",
        });
        throw new Error("CPF já existe");
    }

    const newAttendant: Attendant = {
        ...attendantData,
        id: new Date().toISOString(),
    }

    const newAttendants = [...currentAttendants, newAttendant];
    saveAttendantsToStorage(newAttendants);
    toast({
        title: "Atendente Adicionado!",
        description: `O atendente "${newAttendant.name}" foi adicionado com sucesso.`
    });
  };

  const updateAttendant = async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
      const currentAttendants = getAttendantsFromStorage();

      if (attendantData.email && currentAttendants.some(a => a.id !== attendantId && a.email.toLowerCase() === attendantData.email?.toLowerCase())) {
        toast({ variant: "destructive", title: "Erro", description: "Email já cadastrado." });
        throw new Error("Email já existe");
      }
      if (attendantData.cpf && currentAttendants.some(a => a.id !== attendantId && a.cpf === attendantData.cpf)) {
        toast({ variant: "destructive", title: "Erro", description: "CPF já cadastrado." });
        throw new Error("CPF já existe");
      }

      const newAttendants = currentAttendants.map(a =>
          a.id === attendantId ? { ...a, ...attendantData } : a
      );
      saveAttendantsToStorage(newAttendants);
      toast({
          title: "Atendente Atualizado!",
          description: "Os dados do atendente foram atualizados."
      });
  };

  const deleteAttendant = async (attendantId: string) => {
      const currentAttendants = getAttendantsFromStorage();
      const newAttendants = currentAttendants.filter(a => a.id !== attendantId);
      saveAttendantsToStorage(newAttendants);
      toast({
          title: "Atendente Removido!",
          description: "O atendente foi removido do sistema."
      });
  };

  const value = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    register,
    updateProfile,
    allUsers,
    updateUser,
    deleteUser,
    hasSuperAdmin,
    modules,
    addModule,
    updateModule,
    toggleModuleStatus,
    deleteModule,
    attendants,
    addAttendant,
    updateAttendant,
    deleteAttendant,
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

    