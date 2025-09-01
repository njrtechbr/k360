
"use client";

import type { ReactNode } from "react";
import React, from "react";
import type { User, Module, Role, Attendant, Evaluation, EvaluationAnalysis, GamificationConfig, Achievement, LevelReward, GamificationSeason } from "@/lib/types";
import { useAuthData } from "@/hooks/useAuthData";
import { useUsersData } from "@/hooks/useUsersData";
import { useModulesData } from "@/hooks/useModulesData";
import { useAttendantsData } from "@/hooks/useAttendantsData";
import { useEvaluationsData } from "@/hooks/useEvaluationsData";
import { useGamificationData } from "@/hooks/useGamificationData";

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
  evaluations: Evaluation[];
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'data'>) => Promise<void>;
  aiAnalysisResults: EvaluationAnalysis[];
  lastAiAnalysis: string | null;
  runAiAnalysis: () => Promise<void>;
  isAiAnalysisRunning: boolean;
  analysisProgress: { current: number; total: number; evaluation: Evaluation | null; status: 'idle' | 'processing' | 'waiting' | 'done'; countdown: number; lastResult: EvaluationAnalysis | null; };
  isProgressModalOpen: boolean;
  setIsProgressModalOpen: (isOpen: boolean) => void;
  gamificationConfig: GamificationConfig;
  updateGamificationConfig: (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => Promise<void>;
  achievements: Achievement[];
  updateAchievement: (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => Promise<void>;
  levelRewards: LevelReward[];
  updateLevelReward: (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => Promise<void>;
  seasons: GamificationSeason[];
  addSeason: (seasonData: Omit<GamificationSeason, 'id'>) => Promise<void>;
  updateSeason: (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => Promise<void>;
  deleteSeason: (id: string) => Promise<void>;
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {

  const {
    user,
    setUser,
    loading,
    login,
    logout,
  } = useAuthData();

  const {
    modules,
    addModule,
    updateModule,
    toggleModuleStatus,
    deleteModule,
    getModulesFromStorage,
  } = useModulesData();

  const {
    allUsers,
    setAllUsers,
    updateUser,
    deleteUser,
    getUsersFromStorage,
    hasSuperAdmin,
  } = useUsersData({ user, setUser });

  const {
    attendants,
    addAttendant,
    updateAttendant,
    deleteAttendant,
  } = useAttendantsData();
  
  const {
    evaluations,
    addEvaluation,
    aiAnalysisResults,
    lastAiAnalysis,
    isAiAnalysisRunning,
    runAiAnalysis,
    analysisProgress,
    isProgressModalOpen,
    setIsProgressModalOpen,
  } = useEvaluationsData();

  const {
    gamificationConfig,
    updateGamificationConfig,
    achievements,
    updateAchievement,
    levelRewards,
    updateLevelReward,
    seasons,
    addSeason,
    updateSeason,
    deleteSeason,
    activeSeason,
    nextSeason,
  } = useGamificationData();

  const registerUser = async (userData: Omit<User, "id">) => {
    const currentUsers = getUsersFromStorage();
    if (currentUsers.find((u) => u.email === userData.email)) {
      throw new Error("Email já cadastrado");
    }
    
    const modulesToAssign = userData.role === 'superadmin'
      ? getModulesFromStorage().map(m => m.id)
      : userData.modules;

    const newUser: User = {
      ...userData,
      id: new Date().toISOString(),
      modules: modulesToAssign,
    };

    const newUsers = [...currentUsers, newUser];
    setAllUsers(newUsers);
    localStorage.setItem("controle_acesso_users", JSON.stringify(newUsers));
    
    if (!user) { // This means a public registration
        setUser(newUser);
        localStorage.setItem("controle_acesso_session", JSON.stringify(newUser));
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
      if (!user) {
          throw new Error("Usuário não autenticado");
      }
      
      let updatedUsers = allUsers.map(u => {
          if(u.id === user.id) {
              return { ...u, ...userData };
          }
          return u;
      });

      setAllUsers(updatedUsers);
      localStorage.setItem("controle_acesso_users", JSON.stringify(updatedUsers));
      
      const updatedSessionUser = { ...user, ...userData };
      setUser(updatedSessionUser);
      localStorage.setItem("controle_acesso_session", JSON.stringify(updatedSessionUser));
  };


  const value = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    register: registerUser,
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
    evaluations,
    addEvaluation,
    aiAnalysisResults,
    lastAiAnalysis,
    runAiAnalysis,
    isAiAnalysisRunning,
    analysisProgress,
    isProgressModalOpen,
    setIsProgressModalOpen,
    gamificationConfig,
    updateGamificationConfig,
    achievements,
    updateAchievement,
    levelRewards,
    updateLevelReward,
    seasons,
    addSeason,
    updateSeason,
    deleteSeason,
    activeSeason,
    nextSeason,
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
