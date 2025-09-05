"use client";

import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState, createContext, useContext } from "react";
import type { User, Role, Module, Attendant, Evaluation, EvaluationImport, AttendantImport, Funcao, Setor, GamificationConfig, Achievement, LevelReward, GamificationSeason, XpEvent } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";

import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from "@/lib/achievements";
import { getScoreFromRating } from "@/lib/gamification";
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';
import type { EvaluationAnalysis } from '@/lib/types';

const AI_ANALYSIS_STORAGE_KEY = "controle_acesso_ai_analysis";
const LAST_AI_ANALYSIS_DATE_KEY = "controle_acesso_last_ai_analysis_date";

const INITIAL_GAMIFICATION_CONFIG: GamificationConfig = {
    ratingScores: { '5': 5, '4': 3, '3': 1, '2': -2, '1': -5 },
    achievements: INITIAL_ACHIEVEMENTS,
    levelRewards: INITIAL_LEVEL_REWARDS,
    seasons: [],
    globalXpMultiplier: 1,
};

type AnalysisProgress = {
    current: number;
    total: number;
    evaluation: Evaluation | null;
    status: 'idle' | 'processing' | 'waiting' | 'done';
    countdown: number;
    lastResult: EvaluationAnalysis | null;
};

type ImportStatus = {
    isOpen: boolean;
    logs: string[];
    progress: number;
    title: string;
    status: 'idle' | 'processing' | 'done' | 'error';
}

const INITIAL_IMPORT_STATUS: ImportStatus = {
    isOpen: false,
    logs: [],
    progress: 0,
    title: '',
    status: 'idle'
};

interface PrismaContextType {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  appLoading: boolean;
  isProcessing: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  hasSuperAdmin: () => Promise<boolean>;
  
  // All Users
  allUsers: User[];
  createUser: (userData: { name: string; email: string; password: string; role: Role; modules: string[] }) => Promise<User>;
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Modules
  modules: Module[];
  addModule: (moduleData: Omit<Module, 'id' | 'active'>) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, 'id' | 'active'>>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  
  // Attendants
  attendants: Attendant[];
  addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<Attendant>;
  updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
  deleteAttendants: (attendantIds: string[]) => Promise<void>;
  
  // RH Config
  funcoes: Funcao[];
  setores: Setor[];
  addFuncao: (funcao: string) => Promise<void>;
  updateFuncao: (oldFuncao: string, newFuncao: string) => Promise<void>;
  deleteFuncao: (funcao: string) => Promise<void>;
  addSetor: (setor: string) => Promise<void>;
  updateSetor: (oldSetor: string, newSetor: string) => Promise<void>;
  deleteSetor: (setor: string) => Promise<void>;

  // Evaluations
  evaluations: Evaluation[];
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>) => Promise<Evaluation>;
  deleteEvaluations: (evaluationIds: string[], title: string) => Promise<void>;
  
  // Imports
  attendantImports: AttendantImport[];
  evaluationImports: EvaluationImport[];
  importAttendants: (attendants: Omit<Attendant, 'id' | 'importId'>[], fileName: string, userId: string) => Promise<void>;
  importEvaluations: (evaluations: Omit<Evaluation, 'id' | 'importId' | 'xpGained'>[], fileName: string) => Promise<void>;
  importWhatsAppEvaluations: (evaluations: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>[], agentMap: Record<string, string>, fileName: string) => Promise<void>;
  deleteAttendantImport: (importId: string) => Promise<void>;
  deleteEvaluationImport: (importId: string) => Promise<void>;
  
  // Gamification
  gamificationConfig: GamificationConfig;
  achievements: Achievement[];
  levelRewards: LevelReward[];
  seasons: GamificationSeason[];
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  updateGamificationConfig: (config: Partial<GamificationConfig>) => Promise<void>;
  updateAchievement: (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => Promise<void>;
  addGamificationSeason: (season: Omit<GamificationSeason, 'id'>) => Promise<void>;
  updateGamificationSeason: (seasonId: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => Promise<void>;
  deleteGamificationSeason: (seasonId: string) => Promise<void>;
  
  // XP Events
  xpEvents: XpEvent[];
  seasonXpEvents: XpEvent[];
  addXpEvent: (xpEvent: Omit<XpEvent, 'id'>) => Promise<void>;
  deleteXpEvent: (xpEventId: string) => Promise<void>;
  resetXpEvents: () => Promise<void>;
  
  // AI Analysis
  analysisProgress: AnalysisProgress;
  startAnalysis: () => Promise<void>;
  stopAnalysis: () => void;
  
  // Import Status
  importStatus: ImportStatus;
  setImportStatus: React.Dispatch<React.SetStateAction<ImportStatus>>;
  
  // Data Refresh
  fetchAllData: () => Promise<void>;
}

const PrismaContext = createContext<PrismaContextType | null>(null);

export const PrismaProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { data: session, status } = useSession();
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [attendantImports, setAttendantImports] = useState<AttendantImport[]>([]);
  const [evaluationImports, setEvaluationImports] = useState<EvaluationImport[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>(INITIAL_LEVEL_REWARDS);
  const [seasons, setSeasons] = useState<GamificationSeason[]>([]);
  const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(null);
  const [nextSeason, setNextSeason] = useState<GamificationSeason | null>(null);
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
  const [seasonXpEvents, setSeasonXpEvents] = useState<XpEvent[]>([]);
  
  // Import Status
  const [importStatus, setImportStatus] = useState<ImportStatus>({
    isOpen: false,
    logs: [],
    progress: 0,
    title: "",
    status: 'idle'
  });
  
  // AI Analysis State
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    current: 0,
    total: 0,
    evaluation: null,
    status: 'idle',
    countdown: 0,
    lastResult: null
  });
  
  // Fetch all data from API routes
  const fetchAllData = useCallback(async () => {
    try {
      setAppLoading(true);
      
      // Fetch users from API
      const usersResponse = await fetch('/api/users');
      
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setAllUsers(usersData);
      } else {
        // Se não conseguir buscar usuários (ex: sem permissão), limpar a lista
        setAllUsers([]);
      }
      
      // Fetch modules from API
      const modulesResponse = await fetch('/api/modules');
      if (modulesResponse.ok) {
        const modulesData = await modulesResponse.json();
        setModules(modulesData);
      }
      
      // Fetch attendants from API
      const attendantsResponse = await fetch('/api/attendants');
      if (attendantsResponse.ok) {
        const attendantsData = await attendantsResponse.json();
        setAttendants(attendantsData);
      }
      
      // Fetch funcoes from API
      const funcoesResponse = await fetch('/api/funcoes');
      if (funcoesResponse.ok) {
        const funcoesData = await funcoesResponse.json();
        setFuncoes(funcoesData);
      }
      
      // Fetch setores from API
      const setoresResponse = await fetch('/api/setores');
      if (setoresResponse.ok) {
        const setoresData = await setoresResponse.json();
        setSetores(setoresData);
      }
      
      // Fetch attendant imports from API
      const attendantImportsResponse = await fetch('/api/attendants/imports');
      if (attendantImportsResponse.ok) {
        const attendantImportsData = await attendantImportsResponse.json();
        setAttendantImports(attendantImportsData);
      }
      
      // Fetch evaluation imports from API
      const evaluationImportsResponse = await fetch('/api/evaluations/imports');
      if (evaluationImportsResponse.ok) {
        const evaluationImportsData = await evaluationImportsResponse.json();
        setEvaluationImports(evaluationImportsData);
      }
      
      // Fetch evaluations from API
      const evaluationsResponse = await fetch('/api/evaluations');
      if (evaluationsResponse.ok) {
        const evaluationsData = await evaluationsResponse.json();
        setEvaluations(evaluationsData);
      }
      
      // Fetch gamification config from API
      const gamificationResponse = await fetch('/api/gamification', {
        headers: {
          'x-internal-request': 'true'
        }
      });
      if (gamificationResponse.ok) {
        const gamificationData = await gamificationResponse.json();
        setGamificationConfig(gamificationData);
        setAchievements(gamificationData.achievements || INITIAL_ACHIEVEMENTS);
        setLevelRewards(gamificationData.levelRewards || INITIAL_LEVEL_REWARDS);
        setSeasons(gamificationData.seasons || []);
      } else {
        // Fallback to default config if API fails
        setGamificationConfig(INITIAL_GAMIFICATION_CONFIG);
        setAchievements(INITIAL_ACHIEVEMENTS);
        setLevelRewards(INITIAL_LEVEL_REWARDS);
        setSeasons([]);
      }
      
      // Fetch XP events from API (aumentar limite para pegar todos os eventos)
      const xpEventsResponse = await fetch('/api/gamification/xp-events?limit=10000');
      if (xpEventsResponse.ok) {
        const xpEventsData = await xpEventsResponse.json();
        // A API retorna um objeto com a propriedade 'events'
        const events = xpEventsData.events || xpEventsData;
        // Ensure events is always an array to prevent filter errors
        const eventsArray = Array.isArray(events) ? events : [];
        
        // Debug: log dos dados carregados
        console.log('🔍 XP Events carregados:', eventsArray.length);
        if (eventsArray.length > 0) {
          const eventsBySeason = {};
          eventsArray.forEach(event => {
            const seasonId = event.seasonId || 'sem-temporada';
            eventsBySeason[seasonId] = (eventsBySeason[seasonId] || 0) + 1;
          });
          console.log('📊 Eventos por temporada:', eventsBySeason);
        }
        
        setXpEvents(eventsArray);
      } else {
        console.error('Failed to fetch XP events:', xpEventsResponse.statusText);
        setXpEvents([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os dados. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setAppLoading(false);
    }
  }, [toast]);
  
  // Calculate active season and filter XP events by season
  useEffect(() => {
    const now = new Date();
    const currentActiveSeason = seasons.find(s => s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now) || null;
    setActiveSeason(currentActiveSeason);
    
    const nextUpcomingSeason = seasons
      .filter(s => s.active && new Date(s.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
    setNextSeason(nextUpcomingSeason);

    if (currentActiveSeason) {
      const seasonStart = new Date(currentActiveSeason.startDate);
      const seasonEnd = new Date(currentActiveSeason.endDate);
      // Ensure xpEvents is an array before filtering
      const filteredEvents = Array.isArray(xpEvents) ? xpEvents.filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= seasonStart && eventDate <= seasonEnd;
      }) : [];
      setSeasonXpEvents(filteredEvents);
    } else {
      setSeasonXpEvents([]);
    }
  }, [seasons, xpEvents]);
  
  // Authentication functions - TODO: Create API routes
  const login = useCallback(async (email: string, password: string) => {
    try {
      setIsProcessing(true);
      
      // TODO: Implement API route for authentication
      console.log('Login not implemented yet');
      throw new Error("Login não implementado ainda");
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Erro ao fazer login",
        description: error.message || "Ocorreu um erro ao fazer login. Por favor, tente novamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);
  
  const logout = useCallback(() => {
    setUser(null);
  }, []);
  
  const register = useCallback(async (userData: Omit<User, "id">) => {
    try {
      setIsProcessing(true);
      
      // TODO: Implement API route for user registration
      console.log('Register not implemented yet');
      throw new Error("Registro não implementado ainda");
      
    } catch (error: any) {
      console.error("Register error:", error);
      toast({
        title: "Erro ao registrar",
        description: error.message || "Ocorreu um erro ao registrar. Por favor, tente novamente.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);
  
  const updateProfile = useCallback(async (userData: Partial<User>) => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      
      // TODO: Implement API route for profile update
      console.log('Update profile not implemented yet');
      throw new Error("Atualização de perfil não implementada ainda");
      
    } catch (error) {
      console.error("Update profile error:", error);
      toast({
        title: "Erro ao atualizar perfil",
        description: "Ocorreu um erro ao atualizar o perfil. Por favor, tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  }, [user, toast]);
  
  const hasSuperAdmin = useCallback(async () => {
    try {
      // TODO: Implement API route for super admin check
      console.log('Has super admin check not implemented yet');
      return false;
    } catch (error) {
      console.error("Error checking for super admin:", error);
      return false;
    }
  }, []);
  
  // User management
  const updateUser = useCallback(async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          name: userData.name,
          role: userData.role,
          modules: userData.modules
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar usuário');
      }

      const updatedUser = await response.json();
      
      // Atualizar estado local
      setAllUsers(prev => prev.map(user => 
        user.id === userId ? updatedUser : user
      ));
      
      toast({
        title: "Usuário atualizado!",
        description: `${updatedUser.name} foi atualizado com sucesso.`
      });
      
      return updatedUser;
    } catch (error) {
      console.error("Update user error:", error);
      toast({
        title: "Erro ao atualizar usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);
  
  const deleteUser = useCallback(async (userId: string) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover usuário');
      }

      // Atualizar estado local
      setAllUsers(prev => prev.filter(user => user.id !== userId));
      
      toast({
        title: "Usuário removido!",
        description: "O usuário foi removido com sucesso."
      });
    } catch (error) {
      console.error("Delete user error:", error);
      toast({
        title: "Erro ao remover usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao remover o usuário.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);

  const createUser = useCallback(async (userData: { name: string; email: string; password: string; role: Role; modules: string[] }) => {
    setIsProcessing(true);
    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar usuário');
      }

      const newUser = await response.json();
      
      // Atualizar estado local
      setAllUsers(prev => [...prev, newUser]);
      
      toast({
        title: "Usuário criado!",
        description: `${newUser.name} foi criado com sucesso.`
      });
      
      return newUser;
    } catch (error) {
      console.error("Create user error:", error);
      toast({
        title: "Erro ao criar usuário",
        description: error instanceof Error ? error.message : "Ocorreu um erro ao criar o usuário.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast]);
  
  // Module management
  const addModule = useCallback(async (moduleData: Omit<Module, 'id' | 'active'>) => {
    try {
      const response = await fetch('/api/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moduleData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add module');
      }
      
      const newModule = await response.json();
      
      // Update local state
      setModules(prev => [...prev, newModule]);
      
      toast({ title: "Módulo adicionado!" });
    } catch (error) {
      console.error("Add module error:", error);
      toast({
        title: "Erro ao adicionar módulo",
        description: "Ocorreu um erro ao adicionar o módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const updateModule = useCallback(async (moduleId: string, moduleData: Partial<Omit<Module, 'id' | 'active'>>) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moduleData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update module');
      }
      
      // Update local state
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, ...moduleData } : m
      ));
      
      toast({ title: "Módulo atualizado!" });
    } catch (error) {
      console.error("Update module error:", error);
      toast({
        title: "Erro ao atualizar módulo",
        description: "Ocorreu um erro ao atualizar o módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  const toggleModuleStatus = useCallback(async (moduleId: string) => {
    try {
      const module = modules.find(m => m.id === moduleId);
      if (!module) return;
      
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: !module.active }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to toggle module status');
      }
      
      // Update local state
      setModules(prev => prev.map(m => 
        m.id === moduleId ? { ...m, active: !m.active } : m
      ));
      
      toast({ title: `Módulo ${module.active ? 'desativado' : 'ativado'}!` });
    } catch (error) {
      console.error("Toggle module status error:", error);
      toast({
        title: "Erro ao alterar status do módulo",
        description: "Ocorreu um erro ao alterar o status do módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [modules, toast]);
  
  const deleteModule = useCallback(async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete module');
      }
      
      // Update local state
      setModules(prev => prev.filter(m => m.id !== moduleId));
      
      toast({ title: "Módulo removido!" });
    } catch (error) {
      console.error("Delete module error:", error);
      toast({
        title: "Erro ao remover módulo",
        description: "Ocorreu um erro ao remover o módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast]);
  
  // Attendant management - TODO: Create API routes
  const addAttendant = useCallback(async (attendantData: Omit<Attendant, 'id'>) => {
    // TODO: Implement API route for attendant management
    console.log('Add attendant not implemented yet');
    throw new Error("Adição de atendente não implementada ainda");
  }, []);
  
  const updateAttendant = useCallback(async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
    // TODO: Implement API route for attendant management
    console.log('Update attendant not implemented yet');
    throw new Error("Atualização de atendente não implementada ainda");
  }, []);
  
  const deleteAttendants = useCallback(async (attendantIds: string[]) => {
    // TODO: Implement API route for attendant management
    console.log('Delete attendants not implemented yet');
    throw new Error("Remoção de atendentes não implementada ainda");
  }, []);
  
  // RH Config management
  const addFuncao = useCallback(async (funcao: string) => {
    try {
      const response = await fetch('/api/funcoes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: funcao }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add funcao');
      }
      
      // Update local state
      setFuncoes(prev => [...prev, funcao]);
      
      toast({ title: "Função adicionada com sucesso!" });
    } catch (error) {
      console.error("Add funcao error:", error);
      toast({
        title: "Erro ao adicionar função",
        description: "Ocorreu um erro ao adicionar a função. Por favor, tente novamente.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);
  
  const updateFuncao = useCallback(async (oldFuncao: string, newFuncao: string) => {
    console.log('Update funcao not implemented yet');
    throw new Error("Atualização de função não implementada ainda");
  }, []);
  
  const deleteFuncao = useCallback(async (funcao: string) => {
    console.log('Delete funcao not implemented yet');
    throw new Error("Remoção de função não implementada ainda");
  }, []);
  
  const addSetor = useCallback(async (setor: string) => {
    try {
      const response = await fetch('/api/setores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: setor }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add setor');
      }
      
      // Update local state
      setSetores(prev => [...prev, setor]);
      
      toast({ title: "Setor adicionado com sucesso!" });
    } catch (error) {
      console.error("Add setor error:", error);
      toast({
        title: "Erro ao adicionar setor",
        description: "Ocorreu um erro ao adicionar o setor. Por favor, tente novamente.",
        variant: "destructive"
      });
      throw error;
    }
  }, [toast]);
  
  const updateSetor = useCallback(async (oldSetor: string, newSetor: string) => {
    console.log('Update setor not implemented yet');
    throw new Error("Atualização de setor não implementada ainda");
  }, []);
  
  const deleteSetor = useCallback(async (setor: string) => {
    console.log('Delete setor not implemented yet');
    throw new Error("Remoção de setor não implementada ainda");
  }, []);
  
  // Evaluation management - TODO: Create API routes
  const addEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>): Promise<Evaluation> => {
    console.log('Add evaluation not implemented yet');
    throw new Error("Adição de avaliação não implementada ainda");
  }, []);
  
  const deleteEvaluations = useCallback(async (evaluationIds: string[], title: string = 'Excluindo Avaliações') => {
    if (!evaluationIds || evaluationIds.length === 0) return;

    try {
      setIsProcessing(true);
      setImportStatus({ 
        isOpen: true, 
        logs: [], 
        progress: 0, 
        title: title, 
        status: 'processing' 
      });

      setImportStatus(prev => ({
        ...prev, 
        progress: 20, 
        logs: [`Preparando para remover ${evaluationIds.length} avaliações...`]
      }));

      const response = await fetch('/api/evaluations/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ evaluationIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao deletar avaliações');
      }

      const result = await response.json();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 80, 
        logs: [...prev.logs, `${result.deletedEvaluations} avaliações removidas.`, `${result.deletedXpEvents} eventos XP removidos.`]
      }));

      // Atualizar dados locais
      await fetchAllData();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 100, 
        logs: [...prev.logs, 'Dados atualizados com sucesso.'],
        status: 'done',
        title: 'Exclusão Concluída'
      }));
      
      toast({ 
        title: "Exclusão Concluída", 
        description: `${result.deletedEvaluations} avaliações e seus dados associados foram removidos.` 
      });
      
    } catch (error) {
      console.error('Erro ao deletar avaliações:', error);
      setImportStatus(prev => ({
        ...prev,
        status: 'error',
        title: 'Erro na Exclusão',
        logs: [...prev.logs, `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
      }));
      toast({ 
        variant: "destructive", 
        title: "Erro ao Excluir Avaliações", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData]);
  
  // Import management - TODO: Create API routes
  const importAttendants = useCallback(async (attendants: Omit<Attendant, 'id' | 'importId'>[], fileName: string, userId: string) => {
    setIsProcessing(true);
    setImportStatus({ isOpen: true, logs: [], progress: 0, title: 'Importando Atendentes', status: 'processing' });
    
    try {
      setImportStatus(prev => ({...prev, logs: [...prev.logs, `Iniciando importação de ${fileName}`]}));
      
      const response = await fetch('/api/attendants/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attendants,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao importar atendentes');
      }

      const result = await response.json();
      
      setImportStatus(prev => ({...prev, progress: 50, logs: [...prev.logs, `${result.count} atendentes salvos no banco.`]}));
      
      // Atualizar dados locais
      await fetchAllData();
      
      setImportStatus(prev => ({...prev, progress: 100, logs: [...prev.logs, 'Finalizando...']}));
      setImportStatus(prev => ({...prev, status: 'done', title: 'Importação de Atendentes Concluída!', logs: [...prev.logs, 'Processo finalizado.'] }));
      
      toast({ title: "Importação de Atendentes Concluída!" });
      setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 3000);
      
    } catch (error) {
      console.error('Erro durante a importação de atendentes:', error);
      setImportStatus(prev => ({...prev, status: 'error', title: 'Erro na Importação', logs: [...prev.logs, `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]}));
      toast({ variant: "destructive", title: "Erro na Importação", description: error instanceof Error ? error.message : 'Erro desconhecido' });
      setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 5000);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData, setImportStatus]);
  
  const importEvaluations = useCallback(async (evaluations: Omit<Evaluation, 'id' | 'importId' | 'xpGained'>[], fileName: string) => {
    setIsProcessing(true);
    setImportStatus({ isOpen: true, logs: [], progress: 0, title: 'Importando Avaliações', status: 'processing' });
    
    try {
      setImportStatus(prev => ({...prev, logs: [...prev.logs, `Iniciando importação de ${fileName}`]}));
      
      const response = await fetch('/api/evaluations/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluations,
          fileName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao importar avaliações');
      }

      const result = await response.json();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 50, 
        logs: [...prev.logs, `${result.evaluationsCount} avaliações processadas.`]
      }));
      
      // Atualizar dados locais
      await fetchAllData();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 100, 
        status: 'done',
        title: 'Importação Concluída!',
        logs: [...prev.logs, 'Processo finalizado com sucesso.']
      }));
      
      toast({ 
        title: "Importação Concluída!", 
        description: `${result.evaluationsCount} avaliações importadas de ${fileName}` 
      });
      
      setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 3000);
      
    } catch (error) {
      console.error('Erro ao importar avaliações:', error);
      setImportStatus(prev => ({
        ...prev,
        status: 'error',
        title: 'Erro na Importação',
        logs: [...prev.logs, error instanceof Error ? error.message : 'Erro desconhecido']
      }));
      toast({ 
        variant: "destructive", 
        title: "Erro na Importação", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData]);
  
  const deleteAttendantImport = useCallback(async (importId: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/attendants/imports/${importId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reverter importação');
      }

      const result = await response.json();
      
      // Atualizar dados locais
      await fetchAllData();
      
      toast({ 
        title: "Importação Revertida", 
        description: `${result.deletedAttendants} atendentes removidos do arquivo ${result.fileName}` 
      });
      
    } catch (error) {
      console.error('Erro ao reverter importação de atendentes:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao Reverter Importação", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData]);
  
  const deleteEvaluationImport = useCallback(async (importId: string) => {
    try {
      setIsProcessing(true);
      
      const response = await fetch(`/api/evaluations/imports/${importId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao reverter importação');
      }

      const result = await response.json();
      
      // Atualizar dados locais
      await fetchAllData();
      
      toast({ 
        title: "Importação Revertida", 
        description: `${result.deletedEvaluations} avaliações removidas do arquivo ${result.fileName}` 
      });
      
    } catch (error) {
      console.error('Erro ao reverter importação de avaliações:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao Reverter Importação", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData]);
  
  const importWhatsAppEvaluations = useCallback(async (
    evaluations: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>[], 
    agentMap: Record<string, string>, 
    fileName: string
  ) => {
    if (!user?.id) {
      throw new Error('Usuário não autenticado');
    }

    setIsProcessing(true);
    setImportStatus({
      isOpen: true,
      logs: [],
      progress: 0,
      title: 'Importando Avaliações (WhatsApp)',
      status: 'processing'
    });
    
    try {
      setImportStatus(prev => ({...prev, logs: [...prev.logs, `Iniciando importação de ${fileName}`]}));
      
      const response = await fetch('/api/evaluations/import-whatsapp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          evaluations,
          fileName,
          agentMap,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao importar avaliações do WhatsApp');
      }

      const result = await response.json();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 50, 
        logs: [...prev.logs, `${result.evaluationsCount} avaliações processadas.`]
      }));
      
      // Atualizar dados locais
      await fetchAllData();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 100, 
        status: 'done',
        title: 'Importação Concluída!',
        logs: [...prev.logs, 'Processo finalizado com sucesso.']
      }));
      
      const description = result.skippedCount > 0 
        ? `${result.evaluationsCount} avaliações importadas de ${fileName}. ${result.skippedCount} avaliações ignoradas (atendente não identificado).`
        : `${result.evaluationsCount} avaliações do WhatsApp importadas de ${fileName}`;
      
      toast({ 
        title: "Importação Concluída!", 
        description 
      });
      
      setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 3000);
      
    } catch (error) {
      console.error('Erro ao importar avaliações do WhatsApp:', error);
      setImportStatus(prev => ({
        ...prev,
        status: 'error',
        title: 'Erro na Importação',
        logs: [...prev.logs, error instanceof Error ? error.message : 'Erro desconhecido']
      }));
      toast({ 
        variant: "destructive", 
        title: "Erro na Importação", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [user?.id, toast, fetchAllData]);
  
  // Gamification management - TODO: Create API routes
  const updateGamificationConfig = useCallback(async (config: Partial<GamificationConfig>) => {
    try {
      setIsProcessing(true);
      
      // Fazer chamada para a API de gamificação
      const response = await fetch('/api/gamification', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar configuração');
      }

      // Atualizar estado local
      if (config.ratingScores) {
        setGamificationConfig(prev => ({
          ...prev,
          ratingScores: config.ratingScores!
        }));
      }

      if (config.globalXpMultiplier !== undefined) {
        setGamificationConfig(prev => ({
          ...prev,
          globalXpMultiplier: config.globalXpMultiplier!
        }));
      }

      if (config.seasons) {
        setSeasons(config.seasons);
      }

      // Recarregar dados para garantir sincronização
      await fetchAllData();

      toast({
        title: "Configuração atualizada",
        description: "As configurações de gamificação foram salvas com sucesso.",
      });

    } catch (error) {
      console.error('Erro ao atualizar configuração de gamificação:', error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Erro desconhecido ao salvar configurações.",
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData]);
  
  const updateAchievement = useCallback(async (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => {
    try {
      console.log('GAMIFICATION: Updating achievement', { id, data });
      
      // Call API to update achievement in database
      const response = await fetch('/api/gamification/achievements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...data }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update achievement');
      }
      
      const updatedAchievement = await response.json();
      console.log('GAMIFICATION: Achievement updated successfully', updatedAchievement);
      
      // Update local state with the response from API
      const updatedAchievements = achievements.map(ach => 
        ach.id === id ? { ...ach, ...data } : ach
      );
      
      setAchievements(updatedAchievements);
      
      // Update gamification config with new achievements
      const updatedConfig = {
        ...gamificationConfig,
        achievements: updatedAchievements
      };
      setGamificationConfig(updatedConfig);
      
      toast({
        title: "Conquista Atualizada!",
        description: "As alterações foram salvas com sucesso."
      });
    } catch (error) {
      console.error('Erro ao atualizar conquista:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível atualizar a conquista."
      });
      throw error;
    }
  }, [achievements, gamificationConfig, toast]);
  
  const addGamificationSeason = useCallback(async (season: Omit<GamificationSeason, 'id'>) => {
    try {
      const response = await fetch('/api/gamification/seasons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(season),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar temporada');
      }

      const newSeason = await response.json();
      
      // Atualizar estado local
      setSeasons(prev => [...prev, newSeason]);
      
      toast({ 
        title: "Temporada criada!", 
        description: `A temporada "${season.name}" foi criada com sucesso.` 
      });
    } catch (error) {
      console.error('Erro ao criar temporada:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao criar temporada", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    }
  }, [toast]);
  
  const updateGamificationSeason = useCallback(async (seasonId: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => {
    try {
      const response = await fetch(`/api/gamification/seasons/${seasonId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seasonData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar temporada');
      }

      const updatedSeason = await response.json();
      
      // Atualizar estado local
      setSeasons(prev => prev.map(season => 
        season.id === seasonId ? updatedSeason : season
      ));
      
      toast({ 
        title: "Temporada atualizada!", 
        description: `A temporada foi atualizada com sucesso.` 
      });
    } catch (error) {
      console.error('Erro ao atualizar temporada:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao atualizar temporada", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    }
  }, [toast]);
  
  const deleteGamificationSeason = useCallback(async (seasonId: string) => {
    try {
      const response = await fetch(`/api/gamification/seasons/${seasonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover temporada');
      }
      
      // Atualizar estado local
      setSeasons(prev => prev.filter(season => season.id !== seasonId));
      
      toast({ 
        title: "Temporada removida!", 
        description: `A temporada foi removida com sucesso.` 
      });
    } catch (error) {
      console.error('Erro ao remover temporada:', error);
      toast({ 
        variant: "destructive", 
        title: "Erro ao remover temporada", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    }
  }, [toast]);
  
  // XP Events management - TODO: Create API routes
  const addXpEvent = useCallback(async (xpEvent: Omit<XpEvent, 'id'>) => {
    console.log('Add XP event not implemented yet');
    throw new Error("Adição de evento XP não implementada ainda");
  }, []);
  
  const deleteXpEvent = useCallback(async (xpEventId: string) => {
    console.log('Delete XP event not implemented yet');
    throw new Error("Remoção de evento XP não implementada ainda");
  }, []);

  const resetXpEvents = useCallback(async () => {
    try {
      setIsProcessing(true);
      setImportStatus({ 
        isOpen: true, 
        logs: [], 
        progress: 0, 
        title: 'Resetando Dados de XP', 
        status: 'processing' 
      });

      setImportStatus(prev => ({
        ...prev, 
        progress: 20, 
        logs: ['Iniciando reset dos dados de XP...']
      }));

      const response = await fetch('/api/gamification/xp-events/reset', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao resetar dados de XP');
      }

      const result = await response.json();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 80, 
        logs: [...prev.logs, `${result.deletedXpEvents} eventos XP removidos.`, `${result.deletedAchievements} conquistas resetadas.`]
      }));

      // Atualizar dados locais
      setXpEvents([]);
      setSeasonXpEvents([]);
      
      // Recarregar todos os dados
      await fetchAllData();
      
      setImportStatus(prev => ({
        ...prev, 
        progress: 100, 
        logs: [...prev.logs, 'Reset concluído com sucesso.'],
        status: 'done',
        title: 'Reset Concluído'
      }));
      
      toast({ 
        title: "Reset Concluído", 
        description: `${result.deletedXpEvents} eventos XP e ${result.deletedAchievements} conquistas foram resetados.` 
      });
      
    } catch (error) {
      console.error('Erro ao resetar dados de XP:', error);
      setImportStatus(prev => ({
        ...prev,
        status: 'error',
        title: 'Erro no Reset',
        logs: [...prev.logs, `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`]
      }));
      toast({ 
        variant: "destructive", 
        title: "Erro ao Resetar Dados", 
        description: error instanceof Error ? error.message : 'Erro desconhecido' 
      });
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [toast, fetchAllData, setImportStatus]);
  
  // AI Analysis
  const startAnalysis = useCallback(async () => {
    // Implementation for AI analysis
    // This would need to be adapted to use Prisma instead of Firebase
    // For now, this is a placeholder
    return Promise.resolve();
  }, []);
  
  const stopAnalysis = useCallback(() => {
    // Implementation for stopping AI analysis
    // This would need to be adapted to use Prisma instead of Firebase
    // For now, this is a placeholder
  }, []);
  
  // Initialize auth state and load data
  useEffect(() => {
    if (status === 'loading') {
      setAuthLoading(true);
      return;
    }
    
    setAuthLoading(false);
    
    if (session?.user) {
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as Role,
        modules: [] // Will be loaded from API if needed
      });
      
      // Load all data only when authenticated
      fetchAllData();
    } else {
      setUser(null);
    }
  }, [session, status, fetchAllData]);
  
  // Provide context value
  const contextValue: PrismaContextType = {
    user,
    isAuthenticated: !!user,
    authLoading,
    appLoading,
    isProcessing,
    login,
    logout,
    register,
    updateProfile,
    hasSuperAdmin,
    allUsers,
    createUser,
    updateUser,
    deleteUser,
    modules,
    addModule,
    updateModule,
    toggleModuleStatus,
    deleteModule,
    attendants,
    addAttendant,
    updateAttendant,
    deleteAttendants,
    funcoes,
    setores,
    addFuncao,
    updateFuncao,
    deleteFuncao,
    addSetor,
    updateSetor,
    deleteSetor,
    evaluations,
    addEvaluation,
    deleteEvaluations,
    attendantImports,
    evaluationImports,
    importAttendants,
    importEvaluations,
    importWhatsAppEvaluations,
    deleteAttendantImport,
    deleteEvaluationImport,
    gamificationConfig,
    achievements,
    levelRewards,
    seasons,
    activeSeason,
    nextSeason,
    updateGamificationConfig,
    updateAchievement,
    addGamificationSeason,
    updateGamificationSeason,
    deleteGamificationSeason,
    xpEvents,
    seasonXpEvents,
    addXpEvent,
    deleteXpEvent,
    resetXpEvents,
    analysisProgress,
    startAnalysis,
    stopAnalysis,
    importStatus,
    setImportStatus,
    fetchAllData
  };
  
  return (
    <PrismaContext.Provider value={contextValue}>
      {children}
    </PrismaContext.Provider>
  );
};

export const usePrisma = () => {
  const context = useContext(PrismaContext);
  if (!context) {
    throw new Error("usePrisma must be used within a PrismaProvider");
  }
  return context;
};