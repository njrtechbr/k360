
"use client";

import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";
import type { User, Role, Module, Attendant, Evaluation, EvaluationImport, AttendantImport, Funcao, Setor, GamificationConfig, Achievement, LevelReward, GamificationSeason, UnlockedAchievement, EvaluationAnalysis } from "@/lib/types";
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
import { collection, doc, getDoc, getDocs, setDoc, updateDoc, writeBatch, deleteDoc, query, where } from 'firebase/firestore';
import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from "@/lib/achievements";
import { getScoreFromRating } from "@/lib/gamification";
import { analyzeEvaluation } from "@/ai/flows/analyze-evaluation-flow";


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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  appLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  hasSuperAdmin: () => Promise<boolean>;
  
  // All Users
  allUsers: User[];
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<void>;
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
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>) => Promise<Evaluation>;
  deleteEvaluations: (evaluationIds: string[]) => Promise<void>;
  
  // Imports
  evaluationImports: EvaluationImport[];
  attendantImports: AttendantImport[];
  addEvaluationImportRecord: (importData: Omit<EvaluationImport, 'id'>, userId: string) => Promise<EvaluationImport>;
  revertEvaluationImport: (importId: string) => Promise<void>;
  addAttendantImportRecord: (importData: Omit<AttendantImport, 'id'>, userId: string) => Promise<AttendantImport>;
  revertAttendantImport: (importId: string) => Promise<void>;

  // Gamification
  gamificationConfig: GamificationConfig;
  achievements: Achievement[];
  levelRewards: LevelReward[];
  seasons: GamificationSeason[];
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  unlockedAchievements: UnlockedAchievement[];
  updateGamificationConfig: (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => Promise<void>;
  updateAchievement: (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => Promise<void>;
  updateLevelReward: (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => Promise<void>;
  addSeason: (seasonData: Omit<GamificationSeason, 'id'>) => void;
  updateSeason: (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => void;
  deleteSeason: (id: string) => void;
  recalculateAllGamificationData: (attendants: Attendant[], evaluations: Evaluation[], aiAnalysisResults: EvaluationAnalysis[]) => Promise<void>;

  // AI Analysis
  aiAnalysisResults: EvaluationAnalysis[];
  lastAiAnalysis: string | null;
  isAiAnalysisRunning: boolean;
  runAiAnalysis: () => Promise<void>;
  analysisProgress: AnalysisProgress;
  isProgressModalOpen: boolean;
  setIsProgressModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const mergeWithDefaults = <T extends { id?: string; level?: number }>(
  defaults: T[],
  savedItems: Partial<T>[],
  key: 'id' | 'level'
): T[] => {
  const savedMap = new Map(savedItems.map(item => [item[key], item]));
  return defaults.map(defaultItem => ({
    ...defaultItem,
    ...savedMap.get(defaultItem[key]),
  }));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(true);

  // Data State
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [attendants, setAttendants] = useState<Attendant[]>([]);
  const [funcoes, setFuncoes] = useState<Funcao[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [evaluationImports, setEvaluationImports] = useState<EvaluationImport[]>([]);
  const [attendantImports, setAttendantImports] = useState<AttendantImport[]>([]);
  const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [levelRewards, setLevelRewards] = useState<LevelReward[]>(INITIAL_LEVEL_REWARDS);
  const [seasons, setSeasons] = useState<GamificationSeason[]>([]);
  const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(null);
  const [nextSeason, setNextSeason] = useState<GamificationSeason | null>(null);
  const [unlockedAchievements, setUnlockedAchievements] = useState<UnlockedAchievement[]>([]);
  
  // AI Analysis State
  const [aiAnalysisResults, setAiAnalysisResults] = useState<EvaluationAnalysis[]>([]);
  const [lastAiAnalysis, setLastAiAnalysis] = useState<string | null>(null);
  const [isAiAnalysisRunning, setIsAiAnalysisRunning] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, evaluation: null, status: 'idle', countdown: 0, lastResult: null });


  // --- Data Fetching Callbacks ---
  const fetchAllUsers = useCallback(async () => {
      console.log("AUTH: Buscando todos os usuários do Firestore...");
      const snapshot = await getDocs(collection(db, "users"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  }, []);

  const fetchModules = useCallback(async () => {
      console.log("MODULES: Buscando módulos do Firestore...");
      const snapshot = await getDocs(collection(db, "modules"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module));
  }, []);

  const fetchAttendants = useCallback(async () => {
      console.log("ATTENDANTS: Buscando atendentes do Firestore...");
      const snapshot = await getDocs(collection(db, "attendants"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendant));
  }, []);

  const fetchEvaluations = useCallback(async () => {
      console.log("EVALUATIONS: Buscando avaliações do Firestore...");
      const snapshot = await getDocs(collection(db, "evaluations"));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation));
  }, []);
  
  const fetchCollection = useCallback(async (name: 'funcoes' | 'setores' | 'evaluationImports' | 'attendantImports' | 'unlockedAchievements') => {
      console.log(`DATA: Buscando ${name} do Firestore...`);
      const snapshot = await getDocs(collection(db, name));
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }, []);

  const fetchGamificationConfig = useCallback(async () => {
    console.log("GAMIFICATION: Buscando configurações do Firestore...");
    const configDocRef = doc(db, "gamification", "config");
    const configDoc = await getDoc(configDocRef);
    if (configDoc.exists()) {
      const data = configDoc.data();
      const mergedAchievements = data.achievements ? mergeWithDefaults(INITIAL_ACHIEVEMENTS, data.achievements, 'id') : INITIAL_ACHIEVEMENTS;
      const mergedLevelRewards = data.levelRewards ? mergeWithDefaults(INITIAL_LEVEL_REWARDS, data.levelRewards, 'level') : INITIAL_LEVEL_REWARDS;
      return { ...INITIAL_GAMIFICATION_CONFIG, ...data, achievements: mergedAchievements, levelRewards: mergedLevelRewards };
    } else {
      await setDoc(configDocRef, { ...INITIAL_GAMIFICATION_CONFIG, achievements: INITIAL_ACHIEVEMENTS.map(({ isUnlocked, icon, ...a }) => a), levelRewards: INITIAL_LEVEL_REWARDS.map(({ icon, ...r }) => r) });
      return INITIAL_GAMIFICATION_CONFIG;
    }
  }, []);

  const initializeApp = useCallback(async () => {
    setAppLoading(true);
    console.log("AUTH: Iniciando inicialização do App...");
    try {
        const [
            usersData, modulesData, attendantsData, evaluationsData, 
            evaluationImportsData, attendantImportsData, unlockedAchievementsData, 
            gamificationConfigData, funcoesData, setoresData
        ] = await Promise.all([
            fetchAllUsers(), fetchModules(), fetchAttendants(), fetchEvaluations(),
            fetchCollection('evaluationImports'), fetchCollection('attendantImports'), fetchCollection('unlockedAchievements'),
            fetchGamificationConfig(), fetchCollection('funcoes'), fetchCollection('setores')
        ]);
        
        setAllUsers(usersData);
        setModules(modulesData);
        setAttendants(attendantsData);
        setEvaluations(evaluationsData);
        setEvaluationImports(evaluationImportsData as EvaluationImport[]);
        setAttendantImports(attendantImportsData as AttendantImport[]);
        setUnlockedAchievements(unlockedAchievementsData as UnlockedAchievement[]);
        setGamificationConfig(gamificationConfigData);
        setAchievements(gamificationConfigData.achievements);
        setLevelRewards(gamificationConfigData.levelRewards);
        setSeasons(gamificationConfigData.seasons);
        setFuncoes(funcoesData.map(f => f.id));
        setSetores(setoresData.map(s => s.id));

        console.log("AUTH: Todos os dados foram carregados com sucesso.");

    } catch (error) {
        console.error("AUTH: Falha crítica na inicialização do app", error);
        toast({ variant: "destructive", title: "Erro de Inicialização", description: "Não foi possível carregar os dados do aplicativo." });
    } finally {
        setAppLoading(false);
    }
  }, [fetchAllUsers, fetchModules, fetchAttendants, fetchEvaluations, fetchCollection, fetchGamificationConfig, toast]);


  // --- Auth Lifecycle ---
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && !!user) {
        initializeApp();
    } else if (!authLoading && !user) {
        setAppLoading(false);
    }
  }, [user, authLoading, initializeApp]);
  
  useEffect(() => {
    const now = new Date();
    const currentActiveSeason = seasons.find(s => s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now) || null;
    setActiveSeason(currentActiveSeason);
    
    const nextUpcomingSeason = seasons
        .filter(s => s.active && new Date(s.startDate) > now)
        .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
    setNextSeason(nextUpcomingSeason);
  }, [seasons]);

  // --- Auth Actions ---
  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login bem-sucedido!", description: `Bem-vindo de volta.` });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro de autenticação", description: "Email ou senha incorretos." });
      throw error;
    }
  }, [toast]);
  
  const register = useCallback(async (userData: Omit<User, 'id'>) => {
    try {
      const allModuleIds = modules.map(doc => doc.id);
      const userCredential = await createUserWithEmailAndPassword(auth, userData.password ? userData.password : "123456");
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: userData.name });
      const { password, ...userDataForDb } = userData;
      const finalModules = userData.role === ROLES.SUPERADMIN ? allModuleIds : userDataForDb.modules;
      await setDoc(doc(db, "users", firebaseUser.uid), { ...userDataForDb, modules: finalModules });
      await fetchAllUsers();
      toast({ title: "Conta Criada!", description: "Sua conta foi criada com sucesso." });
    } catch (error: any) {
      const description = error.code === 'auth/email-already-in-use' ? "Este email já está em uso." : "Ocorreu um erro desconhecido.";
      toast({ variant: "destructive", title: "Erro no Registro", description });
      throw error;
    }
  }, [toast, modules, fetchAllUsers]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setAppLoading(true);
    setAllUsers([]);
    setModules([]);
    setAttendants([]);
    // Clear all other states as well
  }, []);

  const updateProfile = useCallback(async (userData: Partial<User>) => {
    if (!auth.currentUser) throw new Error("Usuário não autenticado");
    const userDocRef = doc(db, "users", auth.currentUser.uid);
    if (userData.name) await updateFirebaseProfile(auth.currentUser, { displayName: userData.name });
    await updateDoc(userDocRef, { name: userData.name });
    if (userData.password) await updatePassword(auth.currentUser, userData.password);
    const updatedDoc = await getDoc(userDocRef);
    if(updatedDoc.exists()) setUser({ id: updatedDoc.id, ...updatedDoc.data() } as User);
    toast({ title: "Perfil Atualizado!", description: "Suas informações foram atualizadas." });
  }, [toast]);

  const hasSuperAdmin = useCallback(async (): Promise<boolean> => {
      const q = query(collection(db, 'users'), where("role", "==", ROLES.SUPERADMIN));
      const snapshot = await getDocs(q);
      return !snapshot.empty;
  }, []);

  // --- User Actions ---
  const updateUser = useCallback(async (userId: string, userData: { name: string; role: Role; modules: string[] }) => {
    await updateDoc(doc(db, "users", userId), userData);
    if (user?.id === userId) setUser({ ...user, ...userData });
    await fetchAllUsers().then(setAllUsers);
    toast({ title: "Usuário Atualizado!", description: "Os dados foram atualizados." });
  }, [user, fetchAllUsers, toast]);

  const deleteUser = useCallback(async (userId: string) => {
    if (user?.id === userId) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Você não pode excluir sua própria conta."});
        return;
    }
    await deleteDoc(doc(db, "users", userId));
    await fetchAllUsers().then(setAllUsers);
    toast({ title: "Usuário Removido!" });
  }, [user?.id, fetchAllUsers, toast]);

  // --- Module Actions ---
  const addModule = useCallback(async (moduleData: Omit<Module, 'id' | 'active'>) => {
    const newId = moduleData.name.toLowerCase().replace(/\s+/g, '-');
    if (modules.find(m => m.id === newId)) {
      toast({ variant: "destructive", title: "Erro", description: "Um módulo com este ID já existe." });
      return;
    }
    await setDoc(doc(db, "modules", newId), { ...moduleData, active: true, id: newId });
    await fetchModules().then(setModules);
    toast({ title: "Módulo Adicionado!" });
  }, [modules, fetchModules, toast]);
  
  const updateModule = useCallback(async (moduleId: string, moduleData: Partial<Omit<Module, 'id' | 'active'>>) => {
    await updateDoc(doc(db, "modules", moduleId), moduleData);
    await fetchModules().then(setModules);
    toast({ title: "Módulo Atualizado!" });
  }, [fetchModules, toast]);

  const toggleModuleStatus = useCallback(async (moduleId: string) => {
    const moduleToUpdate = modules.find(m => m.id === moduleId);
    if (!moduleToUpdate) return;
    await updateDoc(doc(db, "modules", moduleId), { active: !moduleToUpdate.active });
    await fetchModules().then(setModules);
    toast({ title: "Status Alterado!" });
  }, [modules, fetchModules, toast]);

  const deleteModule = useCallback(async (moduleId: string) => {
    await deleteDoc(doc(db, "modules", moduleId));
    // Also remove from users
    const batch = writeBatch(db);
    allUsers.forEach(u => {
        if (u.modules.includes(moduleId)) {
            const updatedModules = u.modules.filter(m => m !== moduleId);
            batch.update(doc(db, "users", u.id), { modules: updatedModules });
        }
    });
    await batch.commit();
    await fetchModules().then(setModules);
    await fetchAllUsers().then(setAllUsers);
    toast({ title: "Módulo Removido!" });
  }, [allUsers, fetchModules, fetchAllUsers, toast]);


  // --- RH Config Actions ---
  const addFuncao = useCallback(async (funcao: string) => {
    await setDoc(doc(db, "funcoes", funcao), { name: funcao });
    await fetchCollection('funcoes').then(data => setFuncoes(data.map(d => d.id)));
  }, [fetchCollection]);

  const updateFuncao = useCallback(async (oldFuncao: string, newFuncao: string) => {
    await deleteDoc(doc(db, "funcoes", oldFuncao));
    await setDoc(doc(db, "funcoes", newFuncao), { name: newFuncao });
    await fetchCollection('funcoes').then(data => setFuncoes(data.map(d => d.id)));
  }, [fetchCollection]);
  
  const deleteFuncao = useCallback(async (funcao: string) => {
    await deleteDoc(doc(db, "funcoes", funcao));
    await fetchCollection('funcoes').then(data => setFuncoes(data.map(d => d.id)));
  }, [fetchCollection]);

  const addSetor = useCallback(async (setor: string) => {
    await setDoc(doc(db, "setores", setor), { name: setor });
    await fetchCollection('setores').then(data => setSetores(data.map(d => d.id)));
  }, [fetchCollection]);
  
  const updateSetor = useCallback(async (oldSetor: string, newSetor: string) => {
    await deleteDoc(doc(db, "setores", oldSetor));
    await setDoc(doc(db, "setores", newSetor), { name: newSetor });
    await fetchCollection('setores').then(data => setSetores(data.map(d => d.id)));
  }, [fetchCollection]);
  
  const deleteSetor = useCallback(async (setor: string) => {
    await deleteDoc(doc(db, "setores", setor));
    await fetchCollection('setores').then(data => setSetores(data.map(d => d.id)));
  }, [fetchCollection]);
  
  // --- Attendant Actions ---
  const addAttendant = useCallback(async (attendantData: Omit<Attendant, 'id'>) => {
    const newId = attendantData.id || doc(collection(db, "attendants")).id;
    const finalAttendantData = { ...attendantData, id: newId };
    await setDoc(doc(db, "attendants", newId), finalAttendantData);
    await fetchAttendants().then(setAttendants);
    return finalAttendantData;
  }, [fetchAttendants]);

  const updateAttendant = useCallback(async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
     await updateDoc(doc(db, "attendants", attendantId), attendantData);
     await fetchAttendants().then(setAttendants);
     toast({ title: "Atendente Atualizado!" });
  }, [fetchAttendants, toast]);

  const deleteAttendants = useCallback(async (attendantIds: string[]) => {
      const batch = writeBatch(db);
      attendantIds.forEach(id => batch.delete(doc(db, "attendants", id)));
      await batch.commit();
      await fetchAttendants().then(setAttendants);
      toast({ title: "Atendentes Removidos!" });
  }, [fetchAttendants, toast]);

  // --- Evaluation Actions ---
  const addEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'id' | 'xpGained'>): Promise<Evaluation> => {
        const evaluationDate = new Date(evaluationData.data);
        const baseScore = getScoreFromRating(evaluationData.nota, gamificationConfig.ratingScores);
        
        let xpGained = baseScore;
        const currentActiveSeason = seasons.find(s => s.active && evaluationDate >= new Date(s.startDate) && evaluationDate <= new Date(s.endDate));
        if (currentActiveSeason) {
            const totalMultiplier = gamificationConfig.globalXpMultiplier * currentActiveSeason.xpMultiplier;
            xpGained = baseScore * totalMultiplier;
        }
        
        const docRef = doc(collection(db, "evaluations"));
        const finalEvaluation = { ...evaluationData, data: evaluationData.data || new Date().toISOString(), xpGained, id: docRef.id };
        await setDoc(docRef, finalEvaluation);
        await fetchEvaluations().then(setEvaluations);
        return finalEvaluation;
  }, [gamificationConfig, seasons, fetchEvaluations]);

  const deleteEvaluations = useCallback(async (evaluationIds: string[]) => {
     const batch = writeBatch(db);
     evaluationIds.forEach(id => batch.delete(doc(db, "evaluations", id)));
     await batch.commit();
     await fetchEvaluations().then(setEvaluations);
     if (typeof window !== 'undefined') {
        const currentAiAnalysis = JSON.parse(localStorage.getItem(AI_ANALYSIS_STORAGE_KEY) || '[]') as EvaluationAnalysis[];
        const aiAnalysisToKeep = currentAiAnalysis.filter(ar => !evaluationIds.includes(ar.evaluationId));
        localStorage.setItem(AI_ANALYSIS_STORAGE_KEY, JSON.stringify(aiAnalysisToKeep));
        setAiAnalysisResults(aiAnalysisToKeep);
     }
  }, [fetchEvaluations]);

  // --- Import Actions ---
  const addEvaluationImportRecord = useCallback(async (importData: Omit<EvaluationImport, 'id'>, userId: string) => {
    const docRef = doc(collection(db, "evaluationImports"));
    const newImport = { ...importData, id: docRef.id, importedBy: userId, importedAt: new Date().toISOString() };
    await setDoc(docRef, newImport);
    await fetchCollection('evaluationImports').then(data => setEvaluationImports(data as EvaluationImport[]));
    return newImport;
  }, [fetchCollection]);
  
  const revertEvaluationImport = useCallback(async (importId: string) => {
    const importToRevert = evaluationImports.find(i => i.id === importId);
    if (!importToRevert) return;
    await deleteEvaluations(importToRevert.evaluationIds);
    await deleteDoc(doc(db, "evaluationImports", importId));
    await fetchCollection('evaluationImports').then(data => setEvaluationImports(data as EvaluationImport[]));
    toast({ title: "Importação Revertida!" });
  }, [evaluationImports, deleteEvaluations, fetchCollection, toast]);

  const addAttendantImportRecord = useCallback(async (importData: Omit<AttendantImport, 'id'>, userId: string) => {
    const docRef = doc(collection(db, "attendantImports"));
    const newImport = { ...importData, id: docRef.id, importedBy: userId, importedAt: new Date().toISOString() };
    await setDoc(docRef, newImport);
    await fetchCollection('attendantImports').then(data => setAttendantImports(data as AttendantImport[]));
    return newImport;
  }, [fetchCollection]);
  
  const revertAttendantImport = useCallback(async (importId: string) => {
    const importToRevert = attendantImports.find(i => i.id === importId);
    if (!importToRevert) return;
    await deleteAttendants(importToRevert.attendantIds);
    await deleteDoc(doc(db, "attendantImports", importId));
    await fetchCollection('attendantImports').then(data => setAttendantImports(data as AttendantImport[]));
    toast({ title: "Importação Revertida!" });
  }, [attendantImports, deleteAttendants, fetchCollection, toast]);
  
  // --- Gamification Actions ---
  const updateFullGamificationConfig = useCallback(async (config: GamificationConfig) => {
        const configToSave = {
            ...config,
            achievements: config.achievements.map(({ isUnlocked, icon, ...ach }) => ach),
            levelRewards: config.levelRewards.map(({ icon, ...reward }) => reward),
        };
        await setDoc(doc(db, "gamification", "config"), configToSave);
        await fetchGamificationConfig().then(setGamificationConfig);
  }, [fetchGamificationConfig]);

  const updateGamificationConfig = useCallback(async (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => {
        await updateDoc(doc(db, "gamification", "config"), newConfig);
        await fetchGamificationConfig().then(cfg => {
            setGamificationConfig(cfg);
            setAchievements(cfg.achievements);
            setLevelRewards(cfg.levelRewards);
            setSeasons(cfg.seasons);
        });
        toast({ title: "Configurações Salvas!" });
  }, [fetchGamificationConfig, toast]);

  const updateAchievement = useCallback(async (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => {
    const updatedAchievements = achievements.map(ach => ach.id === id ? { ...ach, ...data } : ach);
    await updateFullGamificationConfig({ ...gamificationConfig, achievements: updatedAchievements });
  }, [achievements, gamificationConfig, updateFullGamificationConfig]);

  const updateLevelReward = useCallback(async (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => {
    const updatedLevelRewards = levelRewards.map(reward => reward.level === level ? { ...reward, ...data } : reward);
    await updateFullGamificationConfig({ ...gamificationConfig, levelRewards: updatedLevelRewards });
  }, [levelRewards, gamificationConfig, updateFullGamificationConfig]);
  
  const saveSeasons = useCallback(async (newSeasons: GamificationSeason[]) => {
    await updateDoc(doc(db, "gamification", "config"), { seasons: newSeasons });
    await fetchGamificationConfig().then(cfg => setSeasons(cfg.seasons));
  }, [fetchGamificationConfig]);

  const addSeason = useCallback((seasonData: Omit<GamificationSeason, 'id'>) => {
    saveSeasons([...seasons, { ...seasonData, id: crypto.randomUUID() }]);
    toast({ title: "Sessão Adicionada!" });
  }, [seasons, saveSeasons, toast]);
  
  const updateSeason = useCallback((id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => {
    saveSeasons(seasons.map(s => s.id === id ? { ...s, ...seasonData } : s));
    toast({ title: "Sessão Atualizada!" });
  }, [seasons, saveSeasons, toast]);
  
  const deleteSeason = useCallback((id: string) => {
    saveSeasons(seasons.filter(s => s.id !== id));
    toast({ title: "Sessão Removida!" });
  }, [seasons, saveSeasons, toast]);
  
  const recalculateAllGamificationData = useCallback(async (allAttendants: Attendant[], allEvaluations: Evaluation[], allAiAnalysis: EvaluationAnalysis[]) => {
    console.log("GAMIFICATION: Iniciando recalculo geral...");
    const currentConfig = await fetchGamificationConfig();
    const evBatch = writeBatch(db);
    allEvaluations.forEach(ev => {
        const evaluationDate = new Date(ev.data);
        const seasonForEvaluation = currentConfig.seasons.find(s => s.active && evaluationDate >= new Date(s.startDate) && evaluationDate <= new Date(s.endDate));
        const baseScore = getScoreFromRating(ev.nota, currentConfig.ratingScores);
        const seasonMultiplier = seasonForEvaluation?.xpMultiplier ?? 1;
        evBatch.update(doc(db, "evaluations", ev.id), { xpGained: baseScore * currentConfig.globalXpMultiplier * seasonMultiplier });
    });
    await evBatch.commit();
    
    const currentUnlocked = await fetchCollection('unlockedAchievements');
    const deleteBatch = writeBatch(db);
    currentUnlocked.forEach(ua => deleteBatch.delete(doc(db, "unlockedAchievements", ua.id)));
    await deleteBatch.commit();

    const addBatch = writeBatch(db);
    for (const attendant of allAttendants) {
        const attendantEvaluations = allEvaluations.filter(ev => ev.attendantId === attendant.id);
        for (const achievement of currentConfig.achievements) {
            const seasonForAchievement = currentConfig.seasons.find(s => s.active);
            if (achievement.active && seasonForAchievement && achievement.isUnlocked(attendant, attendantEvaluations, allEvaluations, allAttendants, allAiAnalysis)) {
                const totalMultiplier = currentConfig.globalXpMultiplier * (seasonForAchievement.xpMultiplier || 1);
                addBatch.set(doc(collection(db, "unlockedAchievements")), {
                    attendantId: attendant.id,
                    achievementId: achievement.id,
                    unlockedAt: new Date().toISOString(),
                    xpGained: achievement.xp * totalMultiplier,
                });
            }
        }
    }
    await addBatch.commit();
    await fetchEvaluations().then(setEvaluations);
    await fetchCollection('unlockedAchievements').then(data => setUnlockedAchievements(data as UnlockedAchievement[]));
    toast({title: "Gamificação Recalculada!", description: "Todos os pontos e conquistas foram atualizados."});
  }, [fetchGamificationConfig, fetchCollection, fetchEvaluations, toast]);

  // --- AI Analysis Actions ---
  const runAiAnalysis = useCallback(async () => {
    setIsAiAnalysisRunning(true);
    setIsProgressModalOpen(true);
    const existingAnalysis = JSON.parse(localStorage.getItem(AI_ANALYSIS_STORAGE_KEY) || '[]') as EvaluationAnalysis[];
    const analyzedIds = new Set(existingAnalysis.map(a => a.evaluationId));
    const pendingEvaluations = evaluations.filter(e => !analyzedIds.has(e.id) && e.comentario && e.comentario.trim() !== '(Sem comentário)' && e.comentario.trim() !== '');
    
    if (pendingEvaluations.length === 0) {
      toast({ title: 'Nenhuma nova avaliação', description: 'Todos os comentários já foram analisados.' });
      setIsAiAnalysisRunning(false); setIsProgressModalOpen(false); return;
    }
    
    setAnalysisProgress({ current: 0, total: pendingEvaluations.length, evaluation: null, status: 'idle', countdown: 0, lastResult: null });
    let processedCount = 0;
    
    try {
      for (const ev of pendingEvaluations) {
        processedCount++;
        setAnalysisProgress(prev => ({ ...prev, current: processedCount, evaluation: ev, status: 'processing' }));
        const result = await analyzeEvaluation({ rating: ev.nota, comment: ev.comentario });
        const newResult: EvaluationAnalysis = { evaluationId: ev.id, sentiment: result.sentiment, summary: result.summary, analyzedAt: new Date().toISOString() };
        
        const currentResults = JSON.parse(localStorage.getItem(AI_ANALYSIS_STORAGE_KEY) || '[]') as EvaluationAnalysis[];
        const updatedResults = [...currentResults, newResult];
        localStorage.setItem(AI_ANALYSIS_STORAGE_KEY, JSON.stringify(updatedResults));
        setAiAnalysisResults(updatedResults);

        setAnalysisProgress(prev => ({ ...prev, status: 'waiting', lastResult: newResult }));
        const countdownDuration = 5;
        for (let i = countdownDuration; i > 0; i--) {
          setAnalysisProgress(prev => ({ ...prev, countdown: i }));
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      const now = new Date().toISOString();
      localStorage.setItem(LAST_AI_ANALYSIS_DATE_KEY, now);
      setLastAiAnalysis(now);
      toast({ title: 'Análise Concluída!', description: `${processedCount} novas avaliações processadas.` });
    } catch (error) {
      toast({ variant: "destructive", title: 'Erro na Análise de IA', description: 'Ocorreu um erro. Tente novamente.' });
    } finally {
      setIsAiAnalysisRunning(false); setIsProgressModalOpen(false);
      setAnalysisProgress({ current: 0, total: 0, evaluation: null, status: 'done', countdown: 0, lastResult: null });
    }
  }, [evaluations, toast]);

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    authLoading,
    appLoading,
    login,
    logout,
    register,
    updateProfile,
    hasSuperAdmin,
    allUsers,
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
    evaluationImports,
    attendantImports,
    addEvaluationImportRecord,
    revertEvaluationImport,
    addAttendantImportRecord,
    revertAttendantImport,
    gamificationConfig,
    achievements,
    levelRewards,
    seasons,
    activeSeason,
    nextSeason,
    unlockedAchievements,
    updateGamificationConfig,
    updateAchievement,
    updateLevelReward,
    addSeason,
    updateSeason,
    deleteSeason,
    recalculateAllGamificationData,
    aiAnalysisResults,
    lastAiAnalysis,
    isAiAnalysisRunning,
    runAiAnalysis,
    analysisProgress,
    isProgressModalOpen,
    setIsProgressModalOpen,
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
