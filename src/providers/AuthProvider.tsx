

"use client";

import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";
import type { User, Role, Module, Attendant, Evaluation, EvaluationImport, AttendantImport, Funcao, Setor, GamificationConfig, Achievement, LevelReward, GamificationSeason, XpEvent } from "@/lib/types";
import { ROLES } from "@/lib/types";
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

interface AuthContextType {
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
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>) => Promise<Evaluation>;
  deleteEvaluations: (evaluationIds: string[]) => Promise<void>;
  
  // Imports
  evaluationImports: EvaluationImport[];
  attendantImports: AttendantImport[];
  importLegacyEvaluations: (evaluationsData: Omit<Evaluation, 'xpGained'>[], fileName: string, userId: string) => Promise<void>;
  importWhatsAppEvaluations: (evaluationsData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>[], agentMap: Record<string, string>, fileName: string, userId: string) => Promise<void>;
  importAttendants: (attendantsData: Omit<Attendant, 'importId'>[], fileName: string, userId: string) => Promise<void>;
  revertEvaluationImport: (importId: string) => Promise<void>;
  revertAttendantImport: (importId: string) => Promise<void>;
  importStatus: ImportStatus;
  setImportStatus: React.Dispatch<React.SetStateAction<ImportStatus>>;


  // Gamification
  xpEvents: XpEvent[];
  seasonXpEvents: XpEvent[]; // <-- XP Events filtered by active season
  gamificationConfig: GamificationConfig;
  achievements: Achievement[];
  levelRewards: LevelReward[];
  seasons: GamificationSeason[];
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  updateGamificationConfig: (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => Promise<void>;
  updateAchievement: (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => Promise<void>;
  updateLevelReward: (level: number, data: Partial<Omit<LevelReward, 'level' | 'icon' | 'color'>>) => Promise<void>;
  addSeason: (seasonData: Omit<GamificationSeason, 'id'>) => void;
  updateSeason: (id: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => void;
  deleteSeason: (id: string) => void;

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

const INITIAL_IMPORT_STATUS: ImportStatus = {
    isOpen: false,
    logs: [],
    progress: 0,
    title: 'Aguardando Importação',
    status: 'idle'
};

const getUniqueEvaluations = (evals: Evaluation[]): Evaluation[] => {
    const seen = new Set();
    return evals.filter(el => {
        const duplicate = seen.has(el.id);
        seen.add(el.id);
        return !duplicate;
    });
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  
  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

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
  const [xpEvents, setXpEvents] = useState<XpEvent[]>([]);
  const [seasonXpEvents, setSeasonXpEvents] = useState<XpEvent[]>([]);

  // AI Analysis State
  const [aiAnalysisResults, setAiAnalysisResults] = useState<EvaluationAnalysis[]>([]);
  const [lastAiAnalysis, setLastAiAnalysis] = useState<string | null>(null);
  const [isAiAnalysisRunning, setIsAiAnalysisRunning] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({ current: 0, total: 0, evaluation: null, status: 'idle', countdown: 0, lastResult: null });

  // Import State
  const [importStatus, setImportStatus] = useState<ImportStatus>(INITIAL_IMPORT_STATUS);

  // --- Data Fetching Callbacks ---
  const fetchAllData = useCallback(async () => {
    setAppLoading(true);
    console.log("AUTH: Iniciando inicialização do App...");
    try {
        const [
            usersData, modulesData, attendantsData, evaluationsData, 
            evaluationImportsData, attendantImportsData, 
            gamificationConfigData, funcoesData, setoresData, xpEventsData
        ] = await Promise.all([
            getDocs(collection(db, "users")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as User))),
            getDocs(collection(db, "modules")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Module))),
            getDocs(collection(db, "attendants")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Attendant))),
            getDocs(collection(db, "evaluations")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Evaluation))),
            getDocs(collection(db, "evaluationImports")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvaluationImport))),
            getDocs(collection(db, "attendantImports")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AttendantImport))),
            getDoc(doc(db, "gamification", "config")).then(async (configDoc) => {
                if (configDoc.exists()) {
                    const data = configDoc.data();
                    const mergedAchievements = data.achievements ? mergeWithDefaults(INITIAL_ACHIEVEMENTS, data.achievements, 'id') : INITIAL_ACHIEVEMENTS;
                    const mergedLevelRewards = data.levelRewards ? mergeWithDefaults(INITIAL_LEVEL_REWARDS, data.levelRewards, 'level') : INITIAL_LEVEL_REWARDS;
                    return { ...INITIAL_GAMIFICATION_CONFIG, ...data, achievements: mergedAchievements, levelRewards: mergedLevelRewards };
                }
                return INITIAL_GAMIFICATION_CONFIG;
            }),
            getDocs(collection(db, "funcoes")).then(snap => snap.docs.map(doc => doc.id)),
            getDocs(collection(db, "setores")).then(snap => snap.docs.map(doc => doc.id)),
            getDocs(collection(db, "xp_events")).then(snap => snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as XpEvent))),
        ]);
        
        setAllUsers(usersData);
        setModules(modulesData.length > 0 ? modulesData : []);
        setAttendants(attendantsData);
        setEvaluations(getUniqueEvaluations(evaluationsData));
        setEvaluationImports(evaluationImportsData);
        setAttendantImports(attendantImportsData);
        setGamificationConfig(gamificationConfigData);
        setAchievements(gamificationConfigData.achievements);
        setLevelRewards(gamificationConfigData.levelRewards);
        setSeasons(gamificationConfigData.seasons);
        setFuncoes(funcoesData);
        setSetores(setoresData);
        setXpEvents(xpEventsData);

        if (modulesData.length === 0) {
            console.log("AUTH: No modules found, seeding initial modules.");
            const batch = writeBatch(db);
            const initialModules = [
              { id: 'rh', name: 'Recursos Humanos', description: 'Gerenciamento de atendentes e funcionários.', path: '/dashboard/rh', active: true },
              { id: 'pesquisa-satisfacao', name: 'Pesquisa de Satisfação', description: 'Gerenciamento de pesquisas de satisfação e avaliações.', path: '/dashboard/pesquisa-satisfacao', active: true },
              { id: 'gamificacao', name: 'Gamificação', description: 'Acompanhe o ranking, o progresso e as recompensas da equipe.', path: '/dashboard/gamificacao', active: true },
            ];
            initialModules.forEach(mod => {
              const docRef = doc(db, "modules", mod.id);
              batch.set(docRef, mod);
            });
            await batch.commit();
            setModules(initialModules);
        }

        console.log("AUTH: Todos os dados foram carregados com sucesso.");

    } catch (error) {
        console.error("AUTH: Falha crítica na inicialização do app", error);
        toast({ variant: "destructive", title: "Erro de Inicialização", description: "Não foi possível carregar os dados do aplicativo." });
    } finally {
        setAppLoading(false);
    }
  }, [toast]);


  // --- Auth Lifecycle ---
  useEffect(() => {
    setAuthLoading(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
            setUser(null); // User exists in Auth but not in Firestore DB
        }
      } else {
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!authLoading && user) {
        fetchAllData();
    } else if (!authLoading && !user) {
        setAppLoading(false);
    }
  }, [user, authLoading, fetchAllData]);
  
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
            const filteredEvents = xpEvents.filter(e => {
                const eventDate = new Date(e.date);
                return eventDate >= seasonStart && eventDate <= seasonEnd;
            });
            setSeasonXpEvents(filteredEvents);
        } else {
            setSeasonXpEvents([]);
        }
    }, [seasons, xpEvents]);

  // --- Auth Actions ---
  const login = useCallback(async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({ title: "Login bem-sucedido!" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erro de autenticação", description: "Email ou senha incorretos." });
      throw error;
    }
  }, [toast]);
  
  const register = useCallback(async (userData: Omit<User, 'id'>) => {
    try {
      const allModuleIds = modules.map(doc => doc.id);
      const userCredential = await createUserWithEmailAndPassword(auth, userData.password! );
      const firebaseUser = userCredential.user;
      await updateFirebaseProfile(firebaseUser, { displayName: userData.name });
      const { password, ...userDataForDb } = userData;
      const finalModules = userData.role === ROLES.SUPERADMIN ? allModuleIds : userDataForDb.modules;
      await setDoc(doc(db, "users", firebaseUser.uid), { ...userDataForDb, modules: finalModules });
      await fetchAllData();
      toast({ title: "Conta Criada!", description: "Sua conta foi criada com sucesso." });
    } catch (error: any) {
      const description = error.code === 'auth/email-already-in-use' ? "Este email já está em uso." : "Ocorreu um erro desconhecido.";
      toast({ variant: "destructive", title: "Erro no Registro", description });
      throw error;
    }
  }, [toast, modules, fetchAllData]);

  const logout = useCallback(async () => {
    await signOut(auth);
    setUser(null);
    setAppLoading(true);
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
    const users = await getDocs(collection(db, "users"));
    setAllUsers(users.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    toast({ title: "Usuário Atualizado!", description: "Os dados foram atualizados." });
  }, [user, toast]);

  const deleteUser = useCallback(async (userId: string) => {
    if (user?.id === userId) {
        toast({ variant: "destructive", title: "Ação não permitida", description: "Você não pode excluir sua própria conta."});
        return;
    }
    await deleteDoc(doc(db, "users", userId));
    setAllUsers(prev => prev.filter(u => u.id !== userId));
    toast({ title: "Usuário Removido!" });
  }, [user?.id, toast]);

  // --- Module Actions ---
  const addModule = useCallback(async (moduleData: Omit<Module, 'id' | 'active'>) => {
    const newId = moduleData.name.toLowerCase().replace(/\s+/g, '-');
    if (modules.find(m => m.id === newId)) {
      toast({ variant: "destructive", title: "Erro", description: "Um módulo com este ID já existe." });
      return;
    }
    const newModule = { ...moduleData, active: true, id: newId };
    await setDoc(doc(db, "modules", newId), newModule);
    setModules(prev => [...prev, newModule]);
    toast({ title: "Módulo Adicionado!" });
  }, [modules, toast]);
  
  const updateModule = useCallback(async (moduleId: string, moduleData: Partial<Omit<Module, 'id' | 'active'>>) => {
    await updateDoc(doc(db, "modules", moduleId), moduleData);
    setModules(prev => prev.map(m => m.id === moduleId ? {...m, ...moduleData} : m));
    toast({ title: "Módulo Atualizado!" });
  }, [toast]);

  const toggleModuleStatus = useCallback(async (moduleId: string) => {
    const moduleToUpdate = modules.find(m => m.id === moduleId);
    if (!moduleToUpdate) return;
    const newStatus = !moduleToUpdate.active;
    await updateDoc(doc(db, "modules", moduleId), { active: newStatus });
    setModules(prev => prev.map(m => m.id === moduleId ? {...m, active: newStatus} : m));
    toast({ title: "Status Alterado!" });
  }, [modules, toast]);

  const deleteModule = useCallback(async (moduleId: string) => {
    await deleteDoc(doc(db, "modules", moduleId));
    setModules(prev => prev.filter(m => m.id !== moduleId));
    const batch = writeBatch(db);
    allUsers.forEach(u => {
        if (u.modules.includes(moduleId)) {
            const updatedModules = u.modules.filter(m => m !== moduleId);
            batch.update(doc(db, "users", u.id), { modules: updatedModules });
        }
    });
    await batch.commit();
    setAllUsers(prev => prev.map(u => ({ ...u, modules: u.modules.filter(m => m !== moduleId) })));
    toast({ title: "Módulo Removido!" });
  }, [allUsers, toast]);


  // --- RH Config Actions ---
  const addFuncao = useCallback(async (funcao: string) => {
    await setDoc(doc(db, "funcoes", funcao), { name: funcao });
    setFuncoes(prev => [...prev, funcao]);
  }, []);

  const updateFuncao = useCallback(async (oldFuncao: string, newFuncao: string) => {
    await deleteDoc(doc(db, "funcoes", oldFuncao));
    await setDoc(doc(db, "funcoes", newFuncao), { name: newFuncao });
    setFuncoes(prev => [...prev.filter(f => f !== oldFuncao), newFuncao]);
  }, []);
  
  const deleteFuncao = useCallback(async (funcao: string) => {
    await deleteDoc(doc(db, "funcoes", funcao));
    setFuncoes(prev => prev.filter(f => f !== funcao));
  }, []);

  const addSetor = useCallback(async (setor: string) => {
    await setDoc(doc(db, "setores", setor), { name: setor });
    setSetores(prev => [...prev, setor]);
  }, []);
  
  const updateSetor = useCallback(async (oldSetor: string, newSetor: string) => {
    await deleteDoc(doc(db, "setores", oldSetor));
    await setDoc(doc(db, "setores", newSetor), { name: newSetor });
    setSetores(prev => [...prev.filter(s => s !== oldSetor), newSetor]);
  }, []);
  
  const deleteSetor = useCallback(async (setor: string) => {
    await deleteDoc(doc(db, "setores", setor));
    setSetores(prev => prev.filter(s => s !== setor));
  }, []);
  
  // --- Attendant Actions ---
  const addAttendant = useCallback(async (attendantData: Omit<Attendant, 'id'>) => {
    const newId = attendantData.id || doc(collection(db, "attendants")).id;
    const finalAttendantData = { ...attendantData, id: newId };
    await setDoc(doc(db, "attendants", newId), finalAttendantData);
    setAttendants(prev => [...prev, finalAttendantData]);
    return finalAttendantData;
  }, []);

  const updateAttendant = useCallback(async (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => {
     await updateDoc(doc(db, "attendants", attendantId), attendantData);
     setAttendants(prev => prev.map(a => a.id === attendantId ? { ...a, ...attendantData } as Attendant : a));
     toast({ title: "Atendente Atualizado!" });
  }, [toast]);

  const deleteAttendants = useCallback(async (attendantIds: string[]) => {
      const batch = writeBatch(db);
      attendantIds.forEach(id => batch.delete(doc(db, "attendants", id)));
      await batch.commit();
      setAttendants(prev => prev.filter(a => !attendantIds.includes(a.id)));
      toast({ title: "Atendentes Removidos!" });
  }, [toast]);

  // --- Evaluation Actions ---
  const addEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>): Promise<Evaluation> => {
      const evaluationDate = new Date();
      const baseScore = getScoreFromRating(evaluationData.nota, gamificationConfig.ratingScores);
      
      const seasonForEvaluation = seasons.find(s => s.active && evaluationDate >= new Date(s.startDate) && evaluationDate <= new Date(s.endDate));
      const seasonMultiplier = seasonForEvaluation?.xpMultiplier ?? 1;
      const totalMultiplier = gamificationConfig.globalXpMultiplier * seasonMultiplier;
      const finalXp = baseScore * totalMultiplier;
      
      const newEvaluation: Evaluation = {
          ...evaluationData,
          id: '', // Will be set by Firestore
          data: evaluationDate.toISOString(),
          xpGained: finalXp,
          importId: "native"
      };

      const docRef = doc(collection(db, "evaluations"));
      newEvaluation.id = docRef.id;

      const xpEventRef = doc(collection(db, "xp_events"));
      const newXpEvent: XpEvent = {
          id: xpEventRef.id,
          attendantId: newEvaluation.attendantId,
          points: finalXp,
          basePoints: baseScore,
          multiplier: totalMultiplier,
          reason: `Avaliação de ${newEvaluation.nota} estrela(s)`,
          date: newEvaluation.data,
          type: 'evaluation',
          relatedId: newEvaluation.id,
      };

      const batch = writeBatch(db);
      batch.set(docRef, newEvaluation);
      batch.set(xpEventRef, newXpEvent);
      await batch.commit();

      setEvaluations(prev => [...prev, newEvaluation]);
      setXpEvents(prev => [...prev, newXpEvent]);
      
      return newEvaluation;
  }, [gamificationConfig, seasons]);

    const deleteEvaluations = useCallback(async (evaluationIds: string[]) => {
        if (evaluationIds.length === 0) return;
        setIsProcessing(true);
        
        let deletedCount = 0;
        let skippedCount = 0;
        
        try {
            const batch = writeBatch(db);
            const xpEventsToDelete = new Set<string>();

            // Find all related xp_events in chunks
            for (let i = 0; i < evaluationIds.length; i += 30) {
                const chunk = evaluationIds.slice(i, i + 30);
                if (chunk.length === 0) continue;
                
                const q = query(collection(db, "xp_events"), where("relatedId", "in", chunk), where("type", "==", "evaluation"));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => xpEventsToDelete.add(doc.id));
            }
            
            // Prepare batch delete
            for (const evaluationId of evaluationIds) {
                const evaluation = evaluations.find(ev => ev.id === evaluationId);
                if (evaluation && evaluation.importId === 'native') {
                    skippedCount++;
                    continue; // Skip native evaluations
                }
                batch.delete(doc(db, "evaluations", evaluationId));
                deletedCount++;
            }

            xpEventsToDelete.forEach(eventId => {
                batch.delete(doc(db, "xp_events", eventId));
            });

            await batch.commit();

            // Update local state for immediate feedback
            setEvaluations(prev => prev.filter(ev => !evaluationIds.includes(ev.id)));
            setXpEvents(prev => prev.filter(xp => !xpEventsToDelete.has(xp.id)));

            if(deletedCount > 0) {
              toast({ title: "Exclusão Concluída", description: `${deletedCount} avaliações e seus XPs foram removidos.` });
            }
            if(skippedCount > 0) {
              toast({ variant: 'default', title: 'Aviso', description: `${skippedCount} avaliações nativas foram ignoradas e não podem ser excluídas em massa.` });
            }

        } catch (error: any) {
            console.error("Error deleting evaluations:", error);
            toast({ variant: 'destructive', title: "Erro ao Excluir", description: error.message });
        } finally {
            setIsProcessing(false);
        }
    }, [evaluations, toast]);
  
  // --- Gamification Actions ---
  const recalculateAllGamificationData = useCallback(async () => {
    const currentAttendants = await getDocs(collection(db, "attendants")).then(snap => snap.docs.map(d => ({id: d.id, ...d.data()}) as Attendant));
    const currentEvaluations = await getDocs(collection(db, "evaluations")).then(snap => snap.docs.map(d => ({id: d.id, ...d.data()}) as Evaluation));

    setImportStatus(prev => ({...prev, progress: 50, logs: [...prev.logs, 'Recalculando todos os eventos de XP...'] }));

    const configDoc = await getDoc(doc(db, "gamification", "config"));
    const loadedConfigData = configDoc.exists() ? configDoc.data() : {};
    const mergedAchievements = loadedConfigData.achievements ? mergeWithDefaults(INITIAL_ACHIEVEMENTS, loadedConfigData.achievements, 'id') : INITIAL_ACHIEVEMENTS;
    const mergedLevelRewards = loadedConfigData.levelRewards ? mergeWithDefaults(INITIAL_LEVEL_REWARDS, loadedConfigData.levelRewards, 'level') : INITIAL_LEVEL_REWARDS;
    const currentConfig = { ...INITIAL_GAMIFICATION_CONFIG, ...loadedConfigData, achievements: mergedAchievements, levelRewards: mergedLevelRewards };

    const xpEventsBatch = writeBatch(db);
    const existingXpEventsSnapshot = await getDocs(collection(db, "xp_events"));
    existingXpEventsSnapshot.forEach(doc => xpEventsBatch.delete(doc.ref));

    const allAiAnalysis = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(AI_ANALYSIS_STORAGE_KEY) || '[]') : [];

    for (const ev of currentEvaluations) {
        const evaluationDate = new Date(ev.data);
        const seasonForEvaluation = currentConfig.seasons.find(s => s.active && evaluationDate >= new Date(s.startDate) && evaluationDate <= new Date(s.endDate));
        const baseScore = getScoreFromRating(ev.nota, currentConfig.ratingScores);
        const seasonMultiplier = seasonForEvaluation?.xpMultiplier ?? 1;
        const totalMultiplier = currentConfig.globalXpMultiplier * seasonMultiplier;
        const finalXp = baseScore * totalMultiplier;

        const xpEventRef = doc(collection(db, "xp_events"));
        xpEventsBatch.set(xpEventRef, {
            id: xpEventRef.id,
            attendantId: ev.attendantId,
            points: finalXp,
            basePoints: baseScore,
            multiplier: totalMultiplier,
            reason: `Avaliação de ${ev.nota} estrela(s)`,
            date: ev.data,
            type: 'evaluation',
            relatedId: ev.id,
        });
    }

    setImportStatus(prev => ({...prev, progress: 75, logs: [...prev.logs, 'Verificando troféus e conquistas...'] }));

    for (const attendant of currentAttendants) {
        const attendantEvaluations = currentEvaluations.filter(e => e.attendantId === attendant.id).sort((a,b) => new Date(a.data).getTime() - new Date(b.data).getTime());
        
        for (const achievement of currentConfig.achievements) {
            if (!achievement.active) continue;

            const existingUnlock = await getDocs(query(collection(db, 'xp_events'), where('attendantId', '==', attendant.id), where('relatedId', '==', achievement.id), where('type', '==', 'achievement'))).then(snap => !snap.empty);

            if (existingUnlock) continue;

            let unlockDate: string | null = null;
            
            // Check condition iteratively to find unlock date
            for (let i = 0; i < attendantEvaluations.length; i++) {
                const subEvaluations = attendantEvaluations.slice(0, i + 1);
                if (achievement.isUnlocked(attendant, subEvaluations, currentEvaluations, currentAttendants, allAiAnalysis)) {
                    unlockDate = subEvaluations[i].data; // Date of the evaluation that triggered the achievement
                    break;
                }
            }

            if (unlockDate) {
                 const seasonForAchievement = currentConfig.seasons.find(s => s.active && new Date(unlockDate!) >= new Date(s.startDate) && new Date(unlockDate!) <= new Date(s.endDate));
                if (seasonForAchievement) {
                    const totalMultiplier = currentConfig.globalXpMultiplier * (seasonForAchievement.xpMultiplier || 1);
                    const xpEventRef = doc(collection(db, "xp_events"));
                    xpEventsBatch.set(xpEventRef, {
                        id: xpEventRef.id,
                        attendantId: attendant.id,
                        points: achievement.xp * totalMultiplier,
                        basePoints: achievement.xp,
                        multiplier: totalMultiplier,
                        reason: `Troféu: ${achievement.title}`,
                        date: unlockDate,
                        type: 'achievement',
                        relatedId: achievement.id,
                    });
                }
            }
        }
    }
    
    await xpEventsBatch.commit();
    setImportStatus(prev => ({...prev, progress: 100, logs: [...prev.logs, 'Recálculo completo!'] }));
    await fetchAllData();
  }, [fetchAllData]);

  // --- Import Actions ---
  const importLegacyEvaluations = useCallback(async (evaluationsData: Omit<Evaluation, 'xpGained'>[], fileName: string, userId: string) => {
    setIsProcessing(true);
    setImportStatus({ isOpen: true, logs: [], progress: 0, title: 'Importando Avaliações (Legado)', status: 'processing' });
    
    try {
        setImportStatus(prev => ({...prev, logs: [...prev.logs, `Iniciando importação do arquivo: ${fileName}`]}));
        const batch = writeBatch(db);
        const importDocRef = doc(collection(db, "evaluationImports"));
        
        evaluationsData.forEach(evData => {
            const docRef = doc(db, "evaluations", evData.id);
            batch.set(docRef, {...evData, importId: importDocRef.id});
        });
        
        batch.set(importDocRef, { fileName, evaluationIds: evaluationsData.map(e => e.id), attendantMap: {}, importedBy: userId, importedAt: new Date().toISOString() });
        setImportStatus(prev => ({...prev, progress: 25, logs: [...prev.logs, `Lote com ${evaluationsData.length} avaliações preparado.`]}));
        
        await batch.commit();
        setImportStatus(prev => ({...prev, progress: 50, logs: [...prev.logs, 'Avaliações salvas no banco de dados.']}));

        await recalculateAllGamificationData();
        
        setImportStatus(prev => ({...prev, status: 'done', title: 'Importação Concluída!', logs: [...prev.logs, 'Processo finalizado com sucesso.'] }));
        toast({ title: "Importação Concluída!", description: `${evaluationsData.length} avaliações importadas.` });
        setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 3000);

    } catch (e) {
        console.error(e);
        setImportStatus(prev => ({...prev, status: 'error', title: 'Erro na Importação', logs: [...prev.logs, 'Ocorreu um erro. Verifique o console.'] }));
        toast({ variant: 'destructive', title: "Erro na Importação", description: "Não foi possível concluir a importação." });
    } finally {
         setIsProcessing(false);
    }
  }, [recalculateAllGamificationData, toast]);

  const importWhatsAppEvaluations = useCallback(async (evaluationsData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>[], agentMap: Record<string, string>, fileName: string, userId: string) => {
      setIsProcessing(true);
      setImportStatus({ isOpen: true, logs: [], progress: 0, title: 'Importando Avaliações (WhatsApp)', status: 'processing' });

      try {
          setImportStatus(prev => ({...prev, logs: [...prev.logs, `Iniciando importação de ${fileName}`]}));
          const batch = writeBatch(db);
          const newEvaluationIds: string[] = [];
          const importDocRef = doc(collection(db, "evaluationImports"));

          evaluationsData.forEach(evData => {
              const docRef = doc(collection(db, "evaluations"));
              batch.set(docRef, {...evData, importId: importDocRef.id});
              newEvaluationIds.push(docRef.id);
          });
          
          batch.set(importDocRef, { fileName, evaluationIds: newEvaluationIds, attendantMap: agentMap, importedBy: userId, importedAt: new Date().toISOString() });
          setImportStatus(prev => ({...prev, progress: 25, logs: [...prev.logs, `${evaluationsData.length} avaliações preparadas.`]}));
          
          await batch.commit();
          setImportStatus(prev => ({...prev, progress: 50, logs: [...prev.logs, 'Avaliações salvas com sucesso.']}));

          await recalculateAllGamificationData();
          
          setImportStatus(prev => ({...prev, status: 'done', title: 'Importação Concluída!', logs: [...prev.logs, 'Processo finalizado.'] }));
          toast({ title: "Importação Concluída!" });
          setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 3000);

      } catch (e) {
          console.error(e);
          setImportStatus(prev => ({...prev, status: 'error', title: 'Erro na Importação', logs: [...prev.logs, 'Ocorreu um erro grave.'] }));
          toast({ variant: 'destructive', title: "Erro na Importação" });
      } finally {
          setIsProcessing(false);
      }
  }, [recalculateAllGamificationData, toast]);

  const importAttendants = useCallback(async (attendantsData: Omit<Attendant, 'importId'>[], fileName: string, userId: string) => {
      setIsProcessing(true);
      setImportStatus({ isOpen: true, logs: [], progress: 0, title: 'Importando Atendentes', status: 'processing' });
      try {
          setImportStatus(prev => ({...prev, logs: [...prev.logs, `Iniciando importação de ${fileName}`]}));
          const batch = writeBatch(db);
          const newAttendantIds: string[] = [];
          const importDocRef = doc(collection(db, "attendantImports"));

          attendantsData.forEach(attData => {
              const docRef = doc(db, "attendants", attData.id);
              batch.set(docRef, {...attData, importId: importDocRef.id});
              newAttendantIds.push(attData.id);
          });
          
          batch.set(importDocRef, { fileName, attendantIds: newAttendantIds, importedBy: userId, importedAt: new Date().toISOString() });
           setImportStatus(prev => ({...prev, progress: 50, logs: [...prev.logs, `${attendantsData.length} atendentes salvos no banco.`]}));
          
          await batch.commit();
          
          setImportStatus(prev => ({...prev, progress: 100, logs: [...prev.logs, 'Finalizando...']}));
          await fetchAllData();

          setImportStatus(prev => ({...prev, status: 'done', title: 'Importação de Atendentes Concluída!', logs: [...prev.logs, 'Processo finalizado.'] }));
          toast({ title: "Importação de Atendentes Concluída!" });
          setTimeout(() => setImportStatus(INITIAL_IMPORT_STATUS), 3000);

      } catch (e) {
          console.error(e);
          setImportStatus(prev => ({...prev, status: 'error', title: 'Erro na Importação', logs: [...prev.logs, 'Ocorreu um erro.'] }));
          toast({ variant: 'destructive', title: "Erro na Importação" });
      } finally {
          setIsProcessing(false);
      }
  }, [fetchAllData, toast]);


  const revertEvaluationImport = useCallback(async (importId: string) => {
    const importToRevert = (await getDocs(collection(db, 'evaluationImports'))).docs
        .map(d => ({ id: d.id, ...d.data() } as EvaluationImport))
        .find(i => i.id === importId);
        
    if (!importToRevert) return;
    
    await deleteEvaluations(importToRevert.evaluationIds);
    await deleteDoc(doc(db, "evaluationImports", importId));
    setEvaluationImports(prev => prev.filter(i => i.id !== importId));
    toast({ title: "Importação Revertida!" });
  }, [deleteEvaluations, toast]);
  
  const revertAttendantImport = useCallback(async (importId: string) => {
    const importToRevert = (await getDocs(collection(db, 'attendantImports'))).docs
        .map(d => ({ id: d.id, ...d.data() } as AttendantImport))
        .find(i => i.id === importId);

    if (!importToRevert) return;

    await deleteAttendants(importToRevert.attendantIds);
    await deleteDoc(doc(db, "attendantImports", importId));
    setAttendantImports(prev => prev.filter(i => i.id !== importId));
    toast({ title: "Importação Revertida!" });
  }, [deleteAttendants, toast]);
  
  const updateFullGamificationConfig = useCallback(async (config: GamificationConfig) => {
        const configToSave = {
            ...config,
            achievements: config.achievements.map(({ isUnlocked, icon, ...ach }) => ach),
            levelRewards: config.levelRewards.map(({ icon, ...reward }) => reward),
        };
        await setDoc(doc(db, "gamification", "config"), configToSave);
        const newConfig = await getDoc(doc(db, "gamification", "config")).then(d => d.data() as GamificationConfig);
        setGamificationConfig(newConfig);
        setAchievements(newConfig.achievements);
        setLevelRewards(newConfig.levelRewards);
        setSeasons(newConfig.seasons);
  }, []);

  const updateGamificationConfig = useCallback(async (newConfig: Partial<Pick<GamificationConfig, 'ratingScores' | 'globalXpMultiplier'>>) => {
        const configDocRef = doc(db, "gamification", "config");
        await updateDoc(configDocRef, newConfig);
        setGamificationConfig(prev => ({...prev, ...newConfig}));
        toast({ title: "Configurações Salvas!" });
  }, [toast]);

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
    setSeasons(newSeasons);
  }, []);

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
    isProcessing,
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
    importLegacyEvaluations,
    importWhatsAppEvaluations,
    importAttendants,
    revertEvaluationImport,
    revertAttendantImport,
    importStatus,
    setImportStatus,
    xpEvents,
    seasonXpEvents,
    gamificationConfig,
    achievements,
    levelRewards,
    seasons,
    activeSeason,
    nextSeason,
    updateGamificationConfig,
    updateAchievement,
    updateLevelReward,
    addSeason,
    updateSeason,
    deleteSeason,
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
