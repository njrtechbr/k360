
"use client";

import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";
import type { User, Module, Role, Attendant, Evaluation, EvaluationAnalysis, GamificationConfig, Achievement, LevelReward, GamificationSeason, UnlockedAchievement, EvaluationImport, AttendantImport, Funcao, Setor } from "@/lib/types";
import { ROLES, INITIAL_MODULES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Firebase Imports
import { auth, db } from "@/lib/firebase";
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile as updateFirebaseProfile,
    updatePassword
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc, writeBatch, query, where, getCountFromServer } from "firebase/firestore";

// Hooks
import { useModulesData } from "@/hooks/useModulesData";
import { useAttendantsData } from "@/hooks/useAttendantsData";
import { useEvaluationsData } from "@/hooks/useEvaluationsData";
import { useGamificationData } from "@/hooks/useGamificationData";
import { useRhConfigData } from "@/hooks/useRhConfigData";

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
  hasSuperAdmin: () => Promise<boolean>;
  modules: Module[];
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  attendants: Attendant[];
  addAttendant: (attendantData: Attendant) => Promise<Attendant>;
  updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
  deleteAttendants: (attendantIds: string[]) => Promise<void>;
  evaluations: Evaluation[];
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>) => Promise<Evaluation>;
  deleteEvaluations: (evaluationIds: string[]) => Promise<void>;
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
  unlockedAchievements: UnlockedAchievement[];
  evaluationImports: EvaluationImport[];
  addImportRecord: (importData: Omit<EvaluationImport, 'id' | 'importedAt' | 'importedBy'>, userId: string) => EvaluationImport;
  revertImport: (importId: string) => void;
  recalculateAllGamificationData: (allAttendants: Attendant[], allEvaluations: Evaluation[], allAiAnalysis: EvaluationAnalysis[]) => void;
  funcoes: Funcao[];
  setores: Setor[];
  addFuncao: (funcao: string) => Promise<void>;
  updateFuncao: (oldFuncao: string, newFuncao: string) => Promise<void>;
  deleteFuncao: (funcao: string) => Promise<void>;
  addSetor: (setor: string) => Promise<void>;
  updateSetor: (oldSetor: string, newSetor: string) => Promise<void>;
  deleteSetor: (setor: string) => Promise<void>;
  attendantImports: AttendantImport[];
  addAttendantImportRecord: (importData: Omit<AttendantImport, 'id' | 'importedAt' | 'importedBy'>, userId: string) => AttendantImport;
  revertAttendantImport: (importId: string) => void;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [authLoading, setAuthLoading] = useState(true);

  // Hooks
  const { modules, addModule, updateModule, toggleModuleStatus, deleteModule } = useModulesData();
  const { loadingAttendants, attendants, addAttendant, updateAttendant, deleteAttendants, attendantImports, addAttendantImportRecord, revertAttendantImport } = useAttendantsData(!!user);
  const { gamificationConfig, updateGamificationConfig, achievements, updateAchievement, levelRewards, updateLevelReward, seasons, addSeason, updateSeason, deleteSeason, activeSeason, nextSeason, unlockedAchievements, checkAndRecordAchievements, recalculateAllGamificationData } = useGamificationData();
  const { evaluations, addEvaluation: addEvaluationFromHook, deleteEvaluations: deleteEvaluationsFromHook, aiAnalysisResults, lastAiAnalysis, isAiAnalysisRunning, runAiAnalysis, analysisProgress, isProgressModalOpen, setIsProgressModalOpen, evaluationImports, addImportRecord, revertImport } = useEvaluationsData({ gamificationConfig, activeSeason });
  const { funcoes, setores, addFuncao, updateFuncao, deleteFuncao, addSetor, updateSetor, deleteSetor } = useRhConfigData();

  const fetchAllUsers = useCallback(async () => {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const usersList = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
    setAllUsers(usersList);
    return usersList;
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
           await fetchAllUsers();
        } else {
          // This case handles users that exist in Auth but not in Firestore.
          // It could be due to a partial registration. We log them out.
          await signOut(auth);
          setUser(null);
        }
      } else {
        setUser(null);
        setAllUsers([]);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [fetchAllUsers]);

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the rest
      toast({
          title: "Login bem-sucedido!",
          description: `Bem-vindo de volta.`,
      });
    } catch (error: any) {
      console.error("Login Error:", error);
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: error.message || "Email ou senha incorretos.",
      });
      throw error;
    }
  };

  const register = async (userData: Omit<User, 'id'>) => {
    try {
      // The password will not be stored in Firestore, only used for creation.
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password ? userData.password : "123456");
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName: userData.name });

      // Don't store password in the database
      const { password, ...userDataForDb } = userData;

      const newUser: Omit<User, 'id'> = {
        ...userDataForDb
      };

      await setDoc(doc(db, "users", firebaseUser.uid), newUser);

      await fetchAllUsers(); // Refresh user list

      toast({
        title: "Conta Criada!",
        description: "Sua conta foi criada com sucesso.",
      });
      
    } catch (error: any) {
      console.error("Registration Error:", error);
       let description = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este endereço de email já está em uso.";
      } else if (error.code === 'auth/weak-password') {
        description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      }
      toast({
        variant: "destructive",
        title: "Erro no Registro",
        description,
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setAllUsers([]);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error: any) {
       console.error("Logout Error:", error);
       toast({
        variant: "destructive",
        title: "Erro no Logout",
        description: error.message,
      });
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!auth.currentUser) {
      throw new Error("Usuário não autenticado");
    }
    
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    
    const dataToUpdate: Partial<Omit<User, 'id' | 'password'>> = {};

    if (userData.name) {
        await updateFirebaseProfile(auth.currentUser, { displayName: userData.name });
        dataToUpdate.name = userData.name;
    }

    if (Object.keys(dataToUpdate).length > 0) {
        await updateDoc(userDocRef, dataToUpdate);
    }

    if (userData.password) {
        await updatePassword(auth.currentUser, userData.password);
    }
    
    const updatedDoc = await getDoc(userDocRef);
    if(updatedDoc.exists()) {
        setUser({ id: updatedDoc.id, ...updatedDoc.data() } as User);
    }

    toast({
        title: "Perfil Atualizado!",
        description: "Suas informações foram atualizadas."
    });
  };

  const hasSuperAdmin = async (): Promise<boolean> => {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where("role", "==", ROLES.SUPERADMIN));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count > 0;
  };
  
  const updateUser = async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
    const userDocRef = doc(db, "users", userId);
    await updateDoc(userDocRef, userData);
    await fetchAllUsers(); // Refresh user list
    toast({
        title: "Usuário Atualizado!",
        description: "Os dados do usuário foram atualizados com sucesso.",
    });
  };

  const deleteUser = async (userId: string) => {
    // Note: Deleting from Firestore does not delete from Firebase Auth.
    // A cloud function is needed for that. This will just delete the user from our app's user list.
    await deleteDoc(doc(db, "users", userId));
    await fetchAllUsers();
     toast({
        title: "Usuário Removido!",
        description: "O usuário foi removido do banco de dados (a autenticação pode precisar ser removida manualmente no Console Firebase).",
    });
  }

  const handleAddEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>): Promise<Evaluation> => {
    const newEvaluation = await addEvaluationFromHook(evaluationData);
    const attendant = attendants.find(a => a.id === newEvaluation.attendantId);
    if (attendant) {
        checkAndRecordAchievements(attendant, attendants, [...evaluations, newEvaluation], aiAnalysisResults);
    }
    return newEvaluation;
  }, [addEvaluationFromHook, attendants, evaluations, aiAnalysisResults, checkAndRecordAchievements]);

  const handleDeleteEvaluations = async (evaluationIds: string[]) => {
    try {
      await deleteEvaluationsFromHook(evaluationIds);
      const currentEvaluations = JSON.parse(localStorage.getItem('controle_acesso_evaluations') || '[]');
      recalculateAllGamificationData(attendants, currentEvaluations, aiAnalysisResults);
      toast({
        title: "Avaliações Excluídas",
        description: `${evaluationIds.length} avaliações foram removidas com sucesso.`,
      });
    } catch(error) {
       toast({
        variant: "destructive",
        title: "Erro ao Excluir",
        description: `Não foi possível remover as avaliações.`,
      });
    }
  }
  
  const loading = authLoading || loadingAttendants;

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
    deleteAttendants,
    evaluations,
    addEvaluation: handleAddEvaluation,
    deleteEvaluations: handleDeleteEvaluations,
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
    unlockedAchievements,
    evaluationImports,
    addImportRecord,
    revertImport,
    recalculateAllGamificationData,
    funcoes,
    setores,
    addFuncao,
    updateFuncao,
    deleteFuncao,
    addSetor,
    updateSetor,
    deleteSetor,
    attendantImports,
    addAttendantImportRecord,
    revertAttendantImport,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
