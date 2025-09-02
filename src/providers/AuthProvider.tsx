
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
import { doc, getDoc, setDoc, collection, getDocs, getCountFromServer, writeBatch, query, where, updateDoc } from "firebase/firestore";

// Hooks
import { useUsersData } from "@/hooks/useUsersData";
import { useModulesData } from "@/hooks/useModulesData";
import { useAttendantsData } from "@/hooks/useAttendantsData";
import { useEvaluationsData } from "@/hooks/useEvaluationsData";
import { useGamificationData } from "@/hooks/useGamificationData";
import { useRhConfigData } from "@/hooks/useRhConfigData";
import { INITIAL_ATTENDANTS } from "@/lib/initial-data";
import { getScoreFromRating } from "@/hooks/useGamificationData";
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
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  hasSuperAdmin: () => Promise<boolean>;
  modules: Module[];
  addModule: (moduleData: Omit<Module, "id" | "active">) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, "id" | "active">>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  attendants: Attendant[];
  addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<Attendant>;
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
  addSeason: (seasonData: Omit<GamificationSeason, 'id'>) => void;
  updateSeason: (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => void;
  deleteSeason: (id: string) => void;
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  unlockedAchievements: UnlockedAchievement[];
  evaluationImports: EvaluationImport[];
  addImportRecord: (importData: Omit<EvaluationImport, 'id'>) => Promise<EvaluationImport>;
  revertImport: (importId: string) => Promise<void>;
  recalculateAllGamificationData: () => Promise<void>;
  funcoes: Funcao[];
  setores: Setor[];
  addFuncao: (funcao: string) => Promise<void>;
  updateFuncao: (oldFuncao: string, newFuncao: string) => Promise<void>;
  deleteFuncao: (funcao: string) => Promise<void>;
  addSetor: (setor: string) => Promise<void>;
  updateSetor: (oldSetor: string, newSetor: string) => Promise<void>;
  deleteSetor: (setor: string) => Promise<void>;
  attendantImports: AttendantImport[];
  addAttendantImportRecord: (importData: Omit<AttendantImport, 'id'>, userId: string) => Promise<AttendantImport>;
  revertAttendantImport: (importId: string) => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Hooks
  const { allUsers, fetchAllUsers, updateUser, deleteUser } = useUsersData({ user, setUser });
  const { modules, fetchModules, addModule, updateModule, toggleModuleStatus, deleteModule: deleteModuleFromHook } = useModulesData();
  const { attendants, fetchAttendants, addAttendant, updateAttendant, deleteAttendants, attendantImports, addAttendantImportRecord, revertAttendantImport } = useAttendantsData();
  const { gamificationConfig, fetchGamificationConfig, updateGamificationConfig, achievements, updateAchievement, levelRewards, updateLevelReward, seasons, addSeason, updateSeason, deleteSeason, activeSeason, nextSeason, unlockedAchievements, fetchUnlockedAchievements, recalculateAllGamificationData: recalcGamification } = useGamificationData();
  const { evaluations, fetchEvaluations, addEvaluation: addEvaluationFromHook, deleteEvaluations, aiAnalysisResults, lastAiAnalysis, isAiAnalysisRunning, runAiAnalysis, analysisProgress, isProgressModalOpen, setIsProgressModalOpen, evaluationImports, fetchEvaluationImports, addImportRecord, revertImport } = useEvaluationsData({ gamificationConfig, seasons });
  const { funcoes, setores, fetchFuncoes, fetchSetores, addFuncao, updateFuncao, deleteFuncao, addSetor, updateSetor, deleteSetor } = useRhConfigData();

  const seedCollection = useCallback(async (
    collectionName: string,
    initialData: any[],
    idField = 'id'
  ) => {
    console.log(`SEEDER: Verificando coleção '${collectionName}'...`);
    const collectionRef = collection(db, collectionName);
    const countSnapshot = await getCountFromServer(collectionRef);
    
    if (countSnapshot.data().count === 0) {
        console.log(`SEEDER: Coleção '${collectionName}' vazia. Semeando ${initialData.length} documentos...`);
        const batch = writeBatch(db);
        initialData.forEach(item => {
            const docRef = doc(db, collectionName, item[idField] || item.name); // Use name as ID for funcoes/setores
            batch.set(docRef, item);
        });
        await batch.commit();
        console.log(`SEEDER: Coleção '${collectionName}' semeada com sucesso.`);
        return true;
    }
    console.log(`SEEDER: Coleção '${collectionName}' já contém dados. Nenhuma ação necessária.`);
    return false;
  }, []);

  const recalculateAllData = useCallback(async () => {
    const allAttendants = await fetchAttendants();
    const allEvaluations = await fetchEvaluations();
    await recalcGamification(allAttendants, allEvaluations, aiAnalysisResults);
  }, [fetchAttendants, fetchEvaluations, recalcGamification, aiAnalysisResults]);
  
  useEffect(() => {
    const initializeApp = async () => {
        console.log("AUTH: Iniciando inicialização do App...");
        setLoading(true);

        const seededAttendants = await seedCollection('attendants', INITIAL_ATTENDANTS);
        if (seededAttendants) await fetchAttendants();
        
        const seededEvals = await seedCollection('evaluations', INITIAL_EVALUATIONS);
        if (seededEvals) await fetchEvaluations();

        const seededModules = await seedCollection('modules', INITIAL_MODULES);
        if (seededModules) await fetchModules();
        
        const seededFuncoes = await seedCollection('funcoes', INITIAL_FUNCOES.map(name => ({name})), 'name');
        if (seededFuncoes) await fetchFuncoes();
        
        const seededSetores = await seedCollection('setores', INITIAL_SETORES.map(name => ({name})), 'name');
        if (seededSetores) await fetchSetores();

        await fetchGamificationConfig();
        await fetchUnlockedAchievements();
        await fetchEvaluationImports();
        
        console.log("AUTH: Verificando estado de autenticação...");
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                console.log(`AUTH: Usuário autenticado encontrado (UID: ${firebaseUser.uid}). Buscando dados...`);
                const userDocRef = doc(db, "users", firebaseUser.uid);
                const userDoc = await getDoc(userDocRef);
                if (userDoc.exists()) {
                    setUser({ id: userDoc.id, ...userDoc.data() } as User);
                    console.log("AUTH: Dados do usuário carregados. Buscando todos os usuários...");
                    await fetchAllUsers();
                } else {
                    console.warn(`AUTH: Usuário autenticado (UID: ${firebaseUser.uid}) não encontrado no Firestore. Fazendo logout.`);
                    await signOut(auth);
                    setUser(null);
                }
            } else {
                console.log("AUTH: Nenhum usuário autenticado.");
                setUser(null);
                setAllUsers([]);
            }
             console.log("AUTH: Inicialização concluída.");
             setLoading(false);
        });

        return () => {
            console.log("AUTH: Limpando listener de autenticação.");
            unsubscribe();
        };
    };

    initializeApp();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      console.log(`AUTH: Tentativa de login para ${email}`);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting the user state and fetching data
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
      const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password || "123456");
      const firebaseUser = userCredential.user;

      await updateFirebaseProfile(firebaseUser, { displayName: userData.name });

      const { password, ...userDataForDb } = userData;
      const newUserDoc = { ...userDataForDb };

      await setDoc(doc(db, "users", firebaseUser.uid), newUserDoc);
      console.log(`AUTH: Documento do usuário criado no Firestore para ${firebaseUser.uid}`);
      await fetchAllUsers();

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
      setUser(null);
      setAllUsers([]);
      toast({ title: "Logout realizado", description: "Você foi desconectado com sucesso." });
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
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where("role", "==", ROLES.SUPERADMIN));
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count > 0;
  };
  
  const deleteModule = async (moduleId: string) => {
    await deleteModuleFromHook(moduleId);
    const allCurrentUsers = await fetchAllUsers();
    const batch = writeBatch(db);
    allCurrentUsers.forEach(u => {
        if (u.modules?.includes(moduleId)) {
            const updatedModules = u.modules.filter(m => m !== moduleId);
            batch.update(doc(db, "users", u.id), { modules: updatedModules });
        }
    });
    await batch.commit();
    await fetchAllUsers();
    console.log(`MODULES: Módulo ${moduleId} removido de todos os usuários.`);
  };

  const addEvaluation = async (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>): Promise<Evaluation> => {
    const baseScore = getScoreFromRating(evaluationData.nota, gamificationConfig.ratingScores);
    const totalMultiplier = (gamificationConfig.globalXpMultiplier || 1) * (activeSeason?.xpMultiplier || 1);
    const xpGained = baseScore * totalMultiplier;

    const newEvaluation = await addEvaluationFromHook(evaluationData, xpGained);
    const attendant = attendants.find(a => a.id === newEvaluation.attendantId);
    if (attendant) {
        const currentEvaluations = [...evaluations, newEvaluation];
        const allAttendants = attendants;
        const currentAiAnalysis = aiAnalysisResults;
        // checkAndRecordAchievements(attendant, allAttendants, currentEvaluations, currentAiAnalysis);
        // Recalculating all might be better to ensure consistency after any addition
        await recalculateAllData();
    }
    return newEvaluation;
  };

  const handleDeleteEvaluations = async (evaluationIds: string[]) => {
    await deleteEvaluations(evaluationIds);
    await recalculateAllData();
    toast({ title: "Avaliações Removidas", description: `${evaluationIds.length} avaliações foram removidas e a gamificação foi recalculada.` });
  }

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
    addEvaluation,
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
    recalculateAllGamificationData: recalculateAllData,
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
