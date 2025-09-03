
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
import { doc, getDoc, setDoc, collection, getDocs, writeBatch, query, where, updateDoc } from "firebase/firestore";

// Hooks
import { useUsersData } from "@/hooks/useUsersData";
import { useModulesData } from "@/hooks/useModulesData";
import { useAttendantsData } from "@/hooks/useAttendantsData";
import { useEvaluationsData } from "@/hooks/useEvaluationsData";
import { useGamificationData } from "@/hooks/useGamificationData";
import { useRhConfigData } from "@/hooks/useRhConfigData";
import { getScoreFromRating } from "@/hooks/useGamificationData";
import { INITIAL_ATTENDANTS } from "@/lib/initial-data";
import { INITIAL_EVALUATIONS } from "@/lib/initial-data-evaluations";
import { INITIAL_FUNCOES, INITIAL_SETORES } from "@/lib/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  allUsers: User[];
  fetchAllUsers: () => Promise<User[]>;
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  hasSuperAdmin: () => Promise<boolean>;
  modules: Module[];
  fetchModules: () => Promise<Module[]>;
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  attendants: Attendant[];
  fetchAttendants: () => Promise<Attendant[]>;
  addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<Attendant>;
  updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
  deleteAttendants: (attendantIds: string[]) => Promise<void>;
  evaluations: Evaluation[];
  fetchEvaluations: () => Promise<Evaluation[]>;
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
  addSeason: (seasonData: Omit<GamificationSeason, 'id'>) => void;
  updateSeason: (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => void;
  deleteSeason: (id: string) => void;
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  unlockedAchievements: UnlockedAchievement[];
  fetchUnlockedAchievements: () => Promise<UnlockedAchievement[]>;
  evaluationImports: EvaluationImport[];
  fetchEvaluationImports: () => Promise<EvaluationImport[]>;
  addImportRecord: (importData: Omit<EvaluationImport, 'id' | 'importedBy'>) => Promise<EvaluationImport>;
  revertImport: (importId: string) => Promise<void>;
  recalculateAllGamificationData: () => Promise<void>;
  funcoes: Funcao[];
  setores: Setor[];
  fetchFuncoes: () => Promise<string[]>;
  fetchSetores: () => Promise<string[]>;
  addFuncao: (funcao: string) => Promise<void>;
  updateFuncao: (oldFuncao: string, newFuncao: string) => Promise<void>;
  deleteFuncao: (funcao: string) => Promise<void>;
  addSetor: (setor: string) => Promise<void>;
  updateSetor: (oldSetor: string, newSetor: string) => Promise<void>;
  deleteSetor: (setor: string) => Promise<void>;
  attendantImports: AttendantImport[];
  addAttendantImportRecord: (importData: Omit<AttendantImport, 'id' | 'importedBy'>) => Promise<AttendantImport>;
  revertAttendantImport: (importId: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hooks
  const modulesData = useModulesData();
  const usersData = useUsersData({ user, setUser });
  const attendantsData = useAttendantsData();
  const gamificationData = useGamificationData();
  const evaluationsData = useEvaluationsData({ gamificationConfig: gamificationData.gamificationConfig, seasons: gamificationData.seasons });
  const rhConfigData = useRhConfigData();

  const seedInitialData = useCallback(async () => {
    console.log("SEED: Verificando se os dados iniciais são necessários...");
    const batch = writeBatch(db);
    let operations = 0;

    // Seed Modules
    const modulesSnap = await getDocs(collection(db, "modules"));
    if (modulesSnap.empty) {
        console.log("SEED: Coleção 'modules' vazia. Semeando dados...");
        INITIAL_MODULES.forEach(module => {
            batch.set(doc(db, "modules", module.id), module);
            operations++;
        });
    }

    // Seed Funcoes
    const funcoesSnap = await getDocs(collection(db, "funcoes"));
    if (funcoesSnap.empty) {
        console.log("SEED: Coleção 'funcoes' vazia. Semeando dados...");
        INITIAL_FUNCOES.forEach(funcao => {
            batch.set(doc(db, "funcoes", funcao), { name: funcao });
            operations++;
        });
    }
    
    // Seed Setores
    const setoresSnap = await getDocs(collection(db, "setores"));
    if (setoresSnap.empty) {
        console.log("SEED: Coleção 'setores' vazia. Semeando dados...");
        INITIAL_SETORES.forEach(setor => {
            batch.set(doc(db, "setores", setor), { name: setor });
            operations++;
        });
    }

    // Seed Attendants
    const attendantsSnap = await getDocs(collection(db, "attendants"));
    if (attendantsSnap.empty) {
        console.log("SEED: Coleção 'attendants' vazia. Semeando dados...");
        INITIAL_ATTENDANTS.forEach(attendant => {
            batch.set(doc(db, "attendants", attendant.id), attendant);
            operations++;
        });
    }

    // Seed Evaluations
    const evaluationsSnap = await getDocs(collection(db, "evaluations"));
    if (evaluationsSnap.empty) {
        console.log("SEED: Coleção 'evaluations' vazia. Semeando dados...");
        INITIAL_EVALUATIONS.forEach(evaluation => {
            batch.set(doc(db, "evaluations", evaluation.id), evaluation);
            operations++;
        });
    }

    if (operations > 0) {
        console.log(`SEED: Executando ${operations} operações de escrita em lote...`);
        await batch.commit();
        console.log("SEED: Dados iniciais semeados com sucesso.");
    } else {
        console.log("SEED: O banco de dados já está populado. Nenhuma ação necessária.");
    }
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
        setLoading(true);
        console.log("AUTH: Iniciando inicialização do App...");
        
        await seedInitialData();

        // Fetch essential data for UI (menus, etc.)
        console.log("AUTH: Carregando dados essenciais da UI...");
        await modulesData.fetchModules();
        console.log("AUTH: Dados essenciais carregados.");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    const userData = { id: userDoc.id, ...userDoc.data() } as User;
                    setUser(userData);
                    console.log(`AUTH: Usuário autenticado e encontrado no Firestore (UID: ${firebaseUser.uid}).`);
                } else {
                     console.log(`AUTH: Usuário autenticado (UID: ${firebaseUser.uid}) não encontrado no Firestore. Criando novo perfil...`);
                    const newUser: Omit<User, 'id'> = {
                        name: firebaseUser.displayName || "Novo Usuário",
                        email: firebaseUser.email!,
                        role: ROLES.USER,
                        modules: []
                    };
                    await setDoc(userDocRef, newUser);
                    const createdUserData = { id: firebaseUser.uid, ...newUser };
                    setUser(createdUserData);
                }
            } else {
                 console.log("AUTH: Nenhum usuário autenticado.");
                 setUser(null);
            }
             console.log("AUTH: Inicialização de autenticação concluída.");
             setLoading(false);
        });
        
        return () => {
             console.log("AUTH: Limpando listener de autenticação.");
             unsubscribe();
        };
    };

    initializeApp();
  }, [seedInitialData, modulesData.fetchModules]);

  const login = async (email: string, password: string) => {
    try {
      console.log(`AUTH: Tentativa de login para ${email}`);
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login bem-sucedido!", description: `Bem-vindo de volta.` });
    } catch (error: any) {
      console.error("AUTH: Erro no Login:", error);
      toast({ variant: "destructive", title: "Erro de autenticação", description: "Email ou senha incorretos." });
      throw error;
    }
  };

  const register = async (userData: Omit<User, 'id'>) => {
    try {
      console.log(`AUTH: Tentativa de registro para ${userData.email}`);
      const userCredential = await createUserWithEmailAndPassword(auth, userData.password ? userData.password : "123456");
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName: userData.name });

      const { password, ...userDataForDb } = userData;
      let finalModules = userDataForDb.modules;

      // If user is superadmin, grant all modules
      if (userData.role === ROLES.SUPERADMIN) {
        const allModules = await modulesData.fetchModules();
        finalModules = allModules.map(m => m.id);
      }
      
      const newUserDoc = { ...userDataForDb, modules: finalModules };

      await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);
      console.log(`AUTH: Documento do usuário criado no Firestore para ${firebaseUser.uid}`);
      await usersData.fetchAllUsers();

      toast({ title: "Conta Criada!", description: "Sua conta foi criada com sucesso." });
      
    } catch (error: any) {
      console.error("AUTH: Erro no Registro:", error);
      let description = "Ocorreu um erro desconhecido.";
      if (error.code === 'auth/email-already-in-use') description = "Este endereço de email já está em uso.";
      else if (error.code === 'auth/weak-password') description = "A senha é muito fraca. Use pelo menos 6 caracteres.";
      toast({ variant: "destructive", title: "Erro no Registro", description });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      console.log("AUTH: Logout realizado com sucesso.");
    } catch (error: any) {
       console.error("AUTH: Erro no Logout:", error);
       toast({ variant: "destructive", title: "Erro no Logout", description: error.message });
    }
  };

  const updateProfile = async (userData: Partial<User>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    const dataToUpdate: Partial<Omit<User, 'id' | 'password'>> = {};

    if (userData.name) {
        await updateFirebaseProfile(auth.currentUser, { displayName: userData.name });
        dataToUpdate.name = userData.name;
    }
    if (Object.keys(dataToUpdate).length > 0) await updateDoc(userDocRef, dataToUpdate);
    if (userData.password) await updatePassword(auth.currentUser, userData.password);
    
    const updatedDoc = await getDoc(userDocRef);
    if(updatedDoc.exists()) setUser({ id: updatedDoc.id, ...updatedDoc.data() } as User);
    toast({ title: "Perfil Atualizado!", description: "Suas informações foram atualizadas." });
  };

  const hasSuperAdmin = async (): Promise<boolean> => {
      const q = query(collection(db, 'users'), where("role", "==", ROLES.SUPERADMIN));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
  };
  
  const deleteModule = async (moduleId: string) => {
    await modulesData.deleteModule(moduleId);
    const allCurrentUsers = await usersData.fetchAllUsers();
    const batch = writeBatch(db);
    allCurrentUsers.forEach(u => {
        if (u.modules?.includes(moduleId)) {
            const updatedModules = u.modules.filter(m => m !== moduleId);
            batch.update(doc(db, "users", u.id), { modules: updatedModules });
        }
    });
    await batch.commit();
    await usersData.fetchAllUsers();
    console.log(`MODULES: Módulo ${moduleId} removido de todos os usuários.`);
  };

  const recalculateAllGamificationData = useCallback(async () => {
    console.log("AUTH: Iniciando recalculo geral de dados de gamificação...");
    const allAttendants = await attendantsData.fetchAttendants();
    const allEvaluations = await evaluationsData.fetchEvaluations();
    await gamificationData.recalculateAllGamificationData(allAttendants, allEvaluations, evaluationsData.aiAnalysisResults);
     console.log("AUTH: Recalculo de gamificação concluído.");
  }, [attendantsData, evaluationsData, gamificationData]);

  const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>): Promise<Evaluation> => {
    const baseScore = getScoreFromRating(evaluationData.nota, gamificationData.gamificationConfig.ratingScores);
    const totalMultiplier = (gamificationData.gamificationConfig.globalXpMultiplier || 1) * (gamificationData.activeSeason?.xpMultiplier || 1);
    const xpGained = baseScore * totalMultiplier;

    const newEvaluation = await evaluationsData.addEvaluation(evaluationData, xpGained);
    await recalculateAllGamificationData();
    return newEvaluation;
  };

  const deleteEvaluations = async (evaluationIds: string[]) => {
    await evaluationsData.deleteEvaluations(evaluationIds);
    await recalculateAllGamificationData();
    toast({ title: "Avaliações Removidas", description: `${evaluationIds.length} avaliações foram removidas e a gamificação foi recalculada.` });
  }

  const addImportRecord = async (importData: Omit<EvaluationImport, 'id' | 'importedBy'>): Promise<EvaluationImport> => {
      if(!user) throw new Error("Usuário não autenticado");
      return evaluationsData.addImportRecord(importData);
  }

  const addAttendantImportRecord = async (importData: Omit<AttendantImport, 'id' | 'importedBy'>): Promise<AttendantImport> => {
       if(!user) throw new Error("Usuário não autenticado");
      return attendantsData.addAttendantImportRecord(importData, user.id);
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: user !== null,
    loading,
    login,
    logout,
    register,
    updateProfile,
    allUsers: usersData.allUsers,
    fetchAllUsers: usersData.fetchAllUsers,
    updateUser: usersData.updateUser,
    deleteUser: usersData.deleteUser,
    hasSuperAdmin,
    modules: modulesData.modules,
    fetchModules: modulesData.fetchModules,
    addModule: modulesData.addModule,
    updateModule: modulesData.updateModule,
    toggleModuleStatus: modulesData.toggleModuleStatus,
    deleteModule,
    attendants: attendantsData.attendants,
    fetchAttendants: attendantsData.fetchAttendants,
    addAttendant: attendantsData.addAttendant,
    updateAttendant: attendantsData.updateAttendant,
    deleteAttendants: attendantsData.deleteAttendants,
    evaluations: evaluationsData.evaluations,
    fetchEvaluations: evaluationsData.fetchEvaluations,
    addEvaluation,
    deleteEvaluations,
    aiAnalysisResults: evaluationsData.aiAnalysisResults,
    lastAiAnalysis: evaluationsData.lastAiAnalysis,
    runAiAnalysis: evaluationsData.runAiAnalysis,
    isAiAnalysisRunning: evaluationsData.isAiAnalysisRunning,
    analysisProgress: evaluationsData.analysisProgress,
    isProgressModalOpen: evaluationsData.isProgressModalOpen,
    setIsProgressModalOpen: evaluationsData.setIsProgressModalOpen,
    ...gamificationData,
    recalculateAllGamificationData,
    ...rhConfigData,
    evaluationImports: evaluationsData.evaluationImports,
    fetchEvaluationImports: evaluationsData.fetchEvaluationImports,
    addImportRecord,
    revertImport: evaluationsData.revertImport,
    attendantImports: attendantsData.attendantImports,
    addAttendantImportRecord,
    revertAttendantImport: attendantsData.revertAttendantImport,
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
