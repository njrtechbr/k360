"use client";

import React, { useCallback, useEffect, useState, createContext, useContext } from "react";
import type { ReactNode } from "react";
import type { User, Role, Module, Attendant, Evaluation, EvaluationImport, AttendantImport, Funcao, Setor, GamificationConfig, Achievement, LevelReward, GamificationSeason, XpEvent } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { useSafeState } from "@/hooks/useSafeState";
import { 
  validateAttendantArray, 
  validateEvaluationArray, 
  validateImportStatus,
  isValidArray,
  DEFAULT_IMPORT_STATUS,
  EMPTY_ATTENDANT_ARRAY,
  EMPTY_EVALUATION_ARRAY,
  EMPTY_XP_EVENT_ARRAY,
  type SafeDataState
} from "@/lib/data-validation";

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
  
  // Estados seguros para todas as entidades
  attendants: SafeDataState<Attendant[]>;
  evaluations: SafeDataState<Evaluation[]>;
  allUsers: SafeDataState<User[]>;
  modules: SafeDataState<Module[]>;
  attendantImports: SafeDataState<AttendantImport[]>;
  evaluationImports: SafeDataState<EvaluationImport[]>;
  funcoes: SafeDataState<Funcao[]>;
  setores: SafeDataState<Setor[]>;
  gamificationConfig: SafeDataState<GamificationConfig>;
  achievements: SafeDataState<Achievement[]>;
  levelRewards: SafeDataState<LevelReward[]>;
  seasons: SafeDataState<GamificationSeason[]>;
  xpEvents: SafeDataState<XpEvent[]>;
  seasonXpEvents: SafeDataState<XpEvent[]>;
  
  // Estados derivados
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;
  
  // Indicadores globais
  hasAnyError: boolean;
  isAnyLoading: boolean;
  
  // User management
  createUser: (userData: { name: string; email: string; password: string; role: Role; modules: string[] }) => Promise<User>;
  updateUser: (userId: string, userData: { name: string; role: Role; modules: string[] }) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  
  // Module management
  addModule: (moduleData: Omit<Module, 'id' | 'active'>) => Promise<void>;
  updateModule: (moduleId: string, moduleData: Partial<Omit<Module, 'id' | 'active'>>) => Promise<void>;
  toggleModuleStatus: (moduleId: string) => Promise<void>;
  deleteModule: (moduleId: string) => Promise<void>;
  
  // Attendant management
  addAttendant: (attendantData: Omit<Attendant, 'id'>) => Promise<Attendant>;
  updateAttendant: (attendantId: string, attendantData: Partial<Omit<Attendant, 'id'>>) => Promise<void>;
  deleteAttendants: (attendantIds: string[]) => Promise<void>;
  
  // RH Config management
  addFuncao: (funcao: string) => Promise<void>;
  updateFuncao: (oldFuncao: string, newFuncao: string) => Promise<void>;
  deleteFuncao: (funcao: string) => Promise<void>;
  addSetor: (setor: string) => Promise<void>;
  updateSetor: (oldSetor: string, newSetor: string) => Promise<void>;
  deleteSetor: (setor: string) => Promise<void>;

  // Evaluation management
  addEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>) => Promise<Evaluation>;
  deleteEvaluations: (evaluationIds: string[], title: string) => Promise<void>;
  
  // Import management
  importAttendants: (attendants: Omit<Attendant, 'id' | 'importId'>[], fileName: string, userId: string) => Promise<void>;
  importEvaluations: (evaluations: Omit<Evaluation, 'id' | 'importId' | 'xpGained'>[], fileName: string) => Promise<void>;
  importWhatsAppEvaluations: (evaluations: Omit<Evaluation, 'id' | 'xpGained' | 'importId'>[], agentMap: Record<string, string>, fileName: string) => Promise<void>;
  deleteAttendantImport: (importId: string) => Promise<void>;
  deleteEvaluationImport: (importId: string) => Promise<void>;
  
  // Gamification management
  updateGamificationConfig: (config: Partial<GamificationConfig>) => Promise<void>;
  updateAchievement: (id: string, data: Partial<Omit<Achievement, 'id' | 'icon' | 'color' | 'isUnlocked'>>) => Promise<void>;
  addGamificationSeason: (season: Omit<GamificationSeason, 'id'>) => Promise<void>;
  updateGamificationSeason: (seasonId: string, seasonData: Partial<Omit<GamificationSeason, 'id'>>) => Promise<void>;
  deleteGamificationSeason: (seasonId: string) => Promise<void>;
  
  // XP Events management
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
  
  // Data Refresh com retry automático
  fetchAllData: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
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
  
  // Estados seguros usando useSafeState para todas as entidades
  const attendantsState = useSafeState({
    initialValue: EMPTY_ATTENDANT_ARRAY,
    validator: (data): data is Attendant[] => isValidArray(data),
    fallback: EMPTY_ATTENDANT_ARRAY,
    enableWarnings: true
  });

  const evaluationsState = useSafeState({
    initialValue: EMPTY_EVALUATION_ARRAY,
    validator: (data): data is Evaluation[] => isValidArray(data),
    fallback: EMPTY_EVALUATION_ARRAY,
    enableWarnings: true
  });

  const allUsersState = useSafeState({
    initialValue: [] as User[],
    validator: (data): data is User[] => isValidArray(data),
    fallback: [] as User[],
    enableWarnings: true
  });

  const modulesState = useSafeState({
    initialValue: [] as Module[],
    validator: (data): data is Module[] => isValidArray(data),
    fallback: [] as Module[],
    enableWarnings: true
  });

  const attendantImportsState = useSafeState({
    initialValue: [] as AttendantImport[],
    validator: (data): data is AttendantImport[] => isValidArray(data),
    fallback: [] as AttendantImport[],
    enableWarnings: true
  });

  const evaluationImportsState = useSafeState({
    initialValue: [] as EvaluationImport[],
    validator: (data): data is EvaluationImport[] => isValidArray(data),
    fallback: [] as EvaluationImport[],
    enableWarnings: true
  });

  const funcoesState = useSafeState({
    initialValue: [] as Funcao[],
    validator: (data): data is Funcao[] => isValidArray(data),
    fallback: [] as Funcao[],
    enableWarnings: true
  });

  const setoresState = useSafeState({
    initialValue: [] as Setor[],
    validator: (data): data is Setor[] => isValidArray(data),
    fallback: [] as Setor[],
    enableWarnings: true
  });

  const gamificationConfigState = useSafeState({
    initialValue: INITIAL_GAMIFICATION_CONFIG,
    validator: (data): data is GamificationConfig => data !== null && typeof data === 'object',
    fallback: INITIAL_GAMIFICATION_CONFIG,
    enableWarnings: true
  });

  const achievementsState = useSafeState({
    initialValue: INITIAL_ACHIEVEMENTS,
    validator: (data): data is Achievement[] => isValidArray(data),
    fallback: INITIAL_ACHIEVEMENTS,
    enableWarnings: true
  });

  const levelRewardsState = useSafeState({
    initialValue: INITIAL_LEVEL_REWARDS,
    validator: (data): data is LevelReward[] => isValidArray(data),
    fallback: INITIAL_LEVEL_REWARDS,
    enableWarnings: true
  });

  const seasonsState = useSafeState({
    initialValue: [] as GamificationSeason[],
    validator: (data): data is GamificationSeason[] => isValidArray(data),
    fallback: [] as GamificationSeason[],
    enableWarnings: true
  });

  const xpEventsState = useSafeState({
    initialValue: EMPTY_XP_EVENT_ARRAY,
    validator: (data): data is XpEvent[] => isValidArray(data),
    fallback: EMPTY_XP_EVENT_ARRAY,
    enableWarnings: true
  });

  const seasonXpEventsState = useSafeState({
    initialValue: EMPTY_XP_EVENT_ARRAY,
    validator: (data): data is XpEvent[] => isValidArray(data),
    fallback: EMPTY_XP_EVENT_ARRAY,
    enableWarnings: true
  });

  // Estados derivados
  const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(null);
  const [nextSeason, setNextSeason] = useState<GamificationSeason | null>(null);

  // Indicadores globais
  const hasAnyError = [
    attendantsState.error,
    evaluationsState.error,
    allUsersState.error,
    modulesState.error,
    attendantImportsState.error,
    evaluationImportsState.error,
    funcoesState.error,
    setoresState.error,
    gamificationConfigState.error,
    achievementsState.error,
    levelRewardsState.error,
    seasonsState.error,
    xpEventsState.error,
    seasonXpEventsState.error
  ].some(error => error !== null);

  const isAnyLoading = [
    attendantsState.loading,
    evaluationsState.loading,
    allUsersState.loading,
    modulesState.loading,
    attendantImportsState.loading,
    evaluationImportsState.loading,
    funcoesState.loading,
    setoresState.loading,
    gamificationConfigState.loading,
    achievementsState.loading,
    levelRewardsState.loading,
    seasonsState.loading,
    xpEventsState.loading,
    seasonXpEventsState.loading
  ].some(loading => loading);
  
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
  
  // Função auxiliar para fazer fetch com retry automático
  const fetchWithRetry = useCallback(async (
    url: string, 
    options: RequestInit = {}, 
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<Response> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        // Se a resposta for bem-sucedida, retorna
        if (response.ok) {
          return response;
        }
        
        // Se for erro 4xx (cliente), não tenta novamente
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Para erros 5xx (servidor), tenta novamente
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Erro desconhecido');
        
        console.warn(`Tentativa ${attempt}/${maxRetries} falhou para ${url}:`, lastError.message);
        
        // Se não é a última tentativa, aguarda antes de tentar novamente
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }
    
    throw lastError || new Error('Falha após múltiplas tentativas');
  }, []);

  // Função para buscar dados de uma entidade específica com tratamento de erro
  const fetchEntityData = useCallback(async (
    url: string,
    entityName: string,
    setState: (data: any) => void,
    setLoading: (loading: boolean) => void,
    setError: (error: string | null) => void,
    validator?: (data: unknown) => boolean,
    fallback?: any
  ): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithRetry(url);
      const data = await response.json();
      
      // Validar dados se validator foi fornecido
      if (validator && !validator(data)) {
        console.warn(`Dados inválidos recebidos para ${entityName}:`, data);
        if (fallback !== undefined) {
          setState(fallback);
        }
        setError(`Dados inválidos recebidos para ${entityName}`);
        return;
      }
      
      setState(data);
      console.log(`✅ ${entityName} carregados com sucesso:`, Array.isArray(data) ? `${data.length} itens` : 'dados carregados');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error(`❌ Erro ao carregar ${entityName}:`, errorMessage);
      
      setError(`Erro ao carregar ${entityName}: ${errorMessage}`);
      
      // Usar fallback se fornecido
      if (fallback !== undefined) {
        setState(fallback);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchWithRetry]);

  // Fetch all data from API routes com tratamento robusto de erros
  const fetchAllData = useCallback(async () => {
    try {
      setAppLoading(true);
      
      // Só buscar dados se o usuário estiver autenticado
      if (!session?.user) {
        console.log('👤 Usuário não autenticado, limpando dados...');
        
        // Limpar todos os estados quando não autenticado
        attendantsState.setData(EMPTY_ATTENDANT_ARRAY);
        evaluationsState.setData(EMPTY_EVALUATION_ARRAY);
        allUsersState.setData([]);
        modulesState.setData([]);
        attendantImportsState.setData([]);
        evaluationImportsState.setData([]);
        funcoesState.setData([]);
        setoresState.setData([]);
        gamificationConfigState.setData(INITIAL_GAMIFICATION_CONFIG);
        achievementsState.setData(INITIAL_ACHIEVEMENTS);
        levelRewardsState.setData(INITIAL_LEVEL_REWARDS);
        seasonsState.setData([]);
        xpEventsState.setData(EMPTY_XP_EVENT_ARRAY);
        seasonXpEventsState.setData(EMPTY_XP_EVENT_ARRAY);
        
        setAppLoading(false);
        return;
      }

      console.log('🔄 Iniciando carregamento de dados...');
      const userRole = session.user.role as Role;
      
      // Buscar dados em paralelo para melhor performance
      const fetchPromises: Promise<void>[] = [];
      
      // Fetch users from API - apenas para ADMIN e SUPERADMIN
      if (['ADMIN', 'SUPERADMIN'].includes(userRole)) {
        fetchPromises.push(
          fetchEntityData(
            '/api/users',
            'usuários',
            allUsersState.setData,
            allUsersState.setLoading,
            allUsersState.setError,
            (data) => isValidArray(data),
            []
          )
        );
      } else {
        // Usuários sem permissão não precisam da lista de usuários
        allUsersState.setData([]);
      }
      
      // Fetch modules
      fetchPromises.push(
        fetchEntityData(
          '/api/modules',
          'módulos',
          modulesState.setData,
          modulesState.setLoading,
          modulesState.setError,
          (data) => isValidArray(data),
          []
        )
      );
      
      // Fetch attendants
      fetchPromises.push(
        fetchEntityData(
          '/api/attendants',
          'atendentes',
          attendantsState.setData,
          attendantsState.setLoading,
          attendantsState.setError,
          (data) => isValidArray(data),
          EMPTY_ATTENDANT_ARRAY
        )
      );
      
      // Fetch funcoes
      fetchPromises.push(
        fetchEntityData(
          '/api/funcoes',
          'funções',
          funcoesState.setData,
          funcoesState.setLoading,
          funcoesState.setError,
          (data) => isValidArray(data),
          []
        )
      );
      
      // Fetch setores
      fetchPromises.push(
        fetchEntityData(
          '/api/setores',
          'setores',
          setoresState.setData,
          setoresState.setLoading,
          setoresState.setError,
          (data) => isValidArray(data),
          []
        )
      );
      
      // Fetch attendant imports
      fetchPromises.push(
        fetchEntityData(
          '/api/attendants/imports',
          'importações de atendentes',
          attendantImportsState.setData,
          attendantImportsState.setLoading,
          attendantImportsState.setError,
          (data) => isValidArray(data),
          []
        )
      );
      
      // Fetch evaluation imports
      fetchPromises.push(
        fetchEntityData(
          '/api/evaluations/imports',
          'importações de avaliações',
          evaluationImportsState.setData,
          evaluationImportsState.setLoading,
          evaluationImportsState.setError,
          (data) => isValidArray(data),
          []
        )
      );
      
      // Fetch evaluations
      fetchPromises.push(
        fetchEntityData(
          '/api/evaluations',
          'avaliações',
          evaluationsState.setData,
          evaluationsState.setLoading,
          evaluationsState.setError,
          (data) => isValidArray(data),
          EMPTY_EVALUATION_ARRAY
        )
      );
      
      // Fetch gamification config
      fetchPromises.push(
        (async () => {
          gamificationConfigState.setLoading(true);
          gamificationConfigState.setError(null);
          
          try {
            const response = await fetchWithRetry('/api/gamification', {
              headers: { 'x-internal-request': 'true' }
            });
            const gamificationData = await response.json();
            
            gamificationConfigState.setData(gamificationData);
            achievementsState.setData(gamificationData.achievements || INITIAL_ACHIEVEMENTS);
            levelRewardsState.setData(gamificationData.levelRewards || INITIAL_LEVEL_REWARDS);
            seasonsState.setData(gamificationData.seasons || []);
            
            console.log('✅ Configuração de gamificação carregada com sucesso');
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('❌ Erro ao carregar configuração de gamificação:', errorMessage);
            
            // Fallback to default config if API fails
            gamificationConfigState.setData(INITIAL_GAMIFICATION_CONFIG);
            achievementsState.setData(INITIAL_ACHIEVEMENTS);
            levelRewardsState.setData(INITIAL_LEVEL_REWARDS);
            seasonsState.setData([]);
            
            gamificationConfigState.setError(`Erro ao carregar gamificação: ${errorMessage}`);
          } finally {
            gamificationConfigState.setLoading(false);
          }
        })()
      );
      
      // Fetch XP events
      fetchPromises.push(
        (async () => {
          xpEventsState.setLoading(true);
          xpEventsState.setError(null);
          
          try {
            const response = await fetchWithRetry('/api/gamification/xp-events?limit=10000');
            const xpEventsData = await response.json();
            
            // A API retorna um objeto com a propriedade 'events'
            const events = xpEventsData.events || xpEventsData;
            const eventsArray = Array.isArray(events) ? events : [];
            
            xpEventsState.setData(eventsArray);
            
            console.log('✅ Eventos XP carregados com sucesso:', eventsArray.length);
            if (eventsArray.length > 0) {
              const eventsBySeason: Record<string, number> = {};
              eventsArray.forEach((event: any) => {
                const seasonId = event.seasonId || 'sem-temporada';
                eventsBySeason[seasonId] = (eventsBySeason[seasonId] || 0) + 1;
              });
              console.log('📊 Eventos por temporada:', eventsBySeason);
            }
            
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
            console.error('❌ Erro ao carregar eventos XP:', errorMessage);
            
            xpEventsState.setData(EMPTY_XP_EVENT_ARRAY);
            xpEventsState.setError(`Erro ao carregar eventos XP: ${errorMessage}`);
          } finally {
            xpEventsState.setLoading(false);
          }
        })()
      );
      
      // Aguardar todas as requisições
      await Promise.allSettled(fetchPromises);
      
      console.log('🎉 Carregamento de dados concluído');
      
    } catch (error) {
      console.error("❌ Erro geral ao carregar dados:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Ocorreu um erro ao carregar os dados. Algumas funcionalidades podem estar limitadas.",
        variant: "destructive"
      });
    } finally {
      setAppLoading(false);
    }
  }, [
    toast, 
    session, 
    fetchEntityData, 
    fetchWithRetry,
    attendantsState,
    evaluationsState,
    allUsersState,
    modulesState,
    attendantImportsState,
    evaluationImportsState,
    funcoesState,
    setoresState,
    gamificationConfigState,
    achievementsState,
    levelRewardsState,
    seasonsState,
    xpEventsState,
    seasonXpEventsState
  ]);

  // Função para tentar novamente apenas as requisições que falharam
  const retryFailedRequests = useCallback(async () => {
    console.log('🔄 Tentando novamente requisições que falharam...');
    
    const retryPromises: Promise<void>[] = [];
    
    if (attendantsState.error) {
      retryPromises.push(
        fetchEntityData(
          '/api/attendants',
          'atendentes',
          attendantsState.setData,
          attendantsState.setLoading,
          attendantsState.setError,
          (data) => isValidArray(data),
          EMPTY_ATTENDANT_ARRAY
        )
      );
    }
    
    if (evaluationsState.error) {
      retryPromises.push(
        fetchEntityData(
          '/api/evaluations',
          'avaliações',
          evaluationsState.setData,
          evaluationsState.setLoading,
          evaluationsState.setError,
          (data) => isValidArray(data),
          EMPTY_EVALUATION_ARRAY
        )
      );
    }
    
    if (modulesState.error) {
      retryPromises.push(
        fetchEntityData(
          '/api/modules',
          'módulos',
          modulesState.setData,
          modulesState.setLoading,
          modulesState.setError,
          (data) => isValidArray(data),
          []
        )
      );
    }
    
    // Adicionar outras entidades conforme necessário...
    
    if (retryPromises.length > 0) {
      await Promise.allSettled(retryPromises);
      toast({
        title: "Tentativa de reconexão",
        description: `Tentando reconectar ${retryPromises.length} serviços que falharam.`
      });
    } else {
      toast({
        title: "Nenhuma falha detectada",
        description: "Todos os serviços estão funcionando corretamente."
      });
    }
  }, [
    attendantsState,
    evaluationsState,
    modulesState,
    fetchEntityData,
    toast
  ]);
  
  // Calculate active season and filter XP events by season
  useEffect(() => {
    const now = new Date();
    const seasons = seasonsState.data;
    const xpEvents = xpEventsState.data;
    
    const currentActiveSeason = seasons.find(s => s.active && new Date(s.startDate) <= now && new Date(s.endDate) >= now) || null;
    setActiveSeason(currentActiveSeason);
    
    const nextUpcomingSeason = seasons
      .filter(s => s.active && new Date(s.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0] || null;
    setNextSeason(nextUpcomingSeason);

    if (currentActiveSeason) {
      const seasonStart = new Date(currentActiveSeason.startDate);
      const seasonEnd = new Date(currentActiveSeason.endDate);
      
      // Filtrar eventos XP da temporada ativa de forma segura
      const filteredEvents = xpEvents.filter(e => {
        try {
          const eventDate = new Date(e.date);
          return eventDate >= seasonStart && eventDate <= seasonEnd;
        } catch (error) {
          console.warn('Evento XP com data inválida:', e);
          return false;
        }
      });
      
      seasonXpEventsState.setData(filteredEvents);
      console.log(`📅 Temporada ativa: ${currentActiveSeason.name}, eventos: ${filteredEvents.length}`);
    } else {
      seasonXpEventsState.setData(EMPTY_XP_EVENT_ARRAY);
      console.log('📅 Nenhuma temporada ativa');
    }
  }, [seasonsState.data, xpEventsState.data, seasonXpEventsState]);
  
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
      
      // Atualizar estado local usando estado seguro
      const currentUsers = allUsersState.data;
      const updatedUsers = currentUsers.map(user => 
        user.id === userId ? updatedUser : user
      );
      allUsersState.setData(updatedUsers);
      
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
  }, [toast, allUsersState]);
  
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

      // Atualizar estado local usando estado seguro
      const currentUsers = allUsersState.data;
      const filteredUsers = currentUsers.filter(user => user.id !== userId);
      allUsersState.setData(filteredUsers);
      
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
  }, [toast, allUsersState]);

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
      
      // Atualizar estado local usando estado seguro
      const currentUsers = allUsersState.data;
      allUsersState.setData([...currentUsers, newUser]);
      
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
  }, [toast, allUsersState]);
  
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
      
      // Update local state usando estado seguro
      const currentModules = modulesState.data;
      modulesState.setData([...currentModules, newModule]);
      
      toast({ title: "Módulo adicionado!" });
    } catch (error) {
      console.error("Add module error:", error);
      toast({
        title: "Erro ao adicionar módulo",
        description: "Ocorreu um erro ao adicionar o módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast, modulesState]);
  
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
      
      // Update local state usando estado seguro
      const currentModules = modulesState.data;
      const updatedModules = currentModules.map(m => 
        m.id === moduleId ? { ...m, ...moduleData } : m
      );
      modulesState.setData(updatedModules);
      
      toast({ title: "Módulo atualizado!" });
    } catch (error) {
      console.error("Update module error:", error);
      toast({
        title: "Erro ao atualizar módulo",
        description: "Ocorreu um erro ao atualizar o módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast, modulesState]);
  
  const toggleModuleStatus = useCallback(async (moduleId: string) => {
    try {
      const currentModules = modulesState.data;
      const module = currentModules.find(m => m.id === moduleId);
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
      
      // Update local state usando estado seguro
      const updatedModules = currentModules.map(m => 
        m.id === moduleId ? { ...m, active: !m.active } : m
      );
      modulesState.setData(updatedModules);
      
      toast({ title: `Módulo ${module.active ? 'desativado' : 'ativado'}!` });
    } catch (error) {
      console.error("Toggle module status error:", error);
      toast({
        title: "Erro ao alterar status do módulo",
        description: "Ocorreu um erro ao alterar o status do módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [modulesState, toast]);
  
  const deleteModule = useCallback(async (moduleId: string) => {
    try {
      const response = await fetch(`/api/modules/${moduleId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete module');
      }
      
      // Update local state usando estado seguro
      const currentModules = modulesState.data;
      const filteredModules = currentModules.filter(m => m.id !== moduleId);
      modulesState.setData(filteredModules);
      
      toast({ title: "Módulo removido!" });
    } catch (error) {
      console.error("Delete module error:", error);
      toast({
        title: "Erro ao remover módulo",
        description: "Ocorreu um erro ao remover o módulo. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  }, [toast, modulesState]);
  
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
      
      // Update local state usando estado seguro
      const currentFuncoes = funcoesState.data;
      funcoesState.setData([...currentFuncoes, funcao]);
      
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
  }, [toast, funcoesState]);
  
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
      
      // Update local state usando estado seguro
      const currentSetores = setoresState.data;
      setoresState.setData([...currentSetores, setor]);
      
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
  }, [toast, setoresState]);
  
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

      // Atualizar estado local usando estados seguros
      const currentConfig = gamificationConfigState.data;
      
      if (config.ratingScores) {
        gamificationConfigState.setData({
          ...currentConfig,
          ratingScores: config.ratingScores
        });
      }

      if (config.globalXpMultiplier !== undefined) {
        gamificationConfigState.setData({
          ...currentConfig,
          globalXpMultiplier: config.globalXpMultiplier
        });
      }

      if (config.seasons) {
        seasonsState.setData(config.seasons);
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
  }, [toast, fetchAllData, gamificationConfigState, seasonsState]);
  
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
      
      // Update local state using safe states
      const currentAchievements = achievementsState.data;
      const updatedAchievements = currentAchievements.map(ach => 
        ach.id === id ? { ...ach, ...data } : ach
      );
      
      achievementsState.setData(updatedAchievements);
      
      // Update gamification config with new achievements
      const currentConfig = gamificationConfigState.data;
      const updatedConfig = {
        ...currentConfig,
        achievements: updatedAchievements
      };
      gamificationConfigState.setData(updatedConfig);
      
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
  }, [achievementsState, gamificationConfigState, toast]);
  
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
      
      // Atualizar estado local usando estado seguro
      const currentSeasons = seasonsState.data;
      seasonsState.setData([...currentSeasons, newSeason]);
      
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
  }, [toast, seasonsState]);
  
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
      
      // Atualizar estado local usando estado seguro
      const currentSeasons = seasonsState.data;
      const updatedSeasons = currentSeasons.map(season => 
        season.id === seasonId ? updatedSeason : season
      );
      seasonsState.setData(updatedSeasons);
      
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
  }, [toast, seasonsState]);
  
  const deleteGamificationSeason = useCallback(async (seasonId: string) => {
    try {
      const response = await fetch(`/api/gamification/seasons/${seasonId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao remover temporada');
      }
      
      // Atualizar estado local usando estado seguro
      const currentSeasons = seasonsState.data;
      const filteredSeasons = currentSeasons.filter(season => season.id !== seasonId);
      seasonsState.setData(filteredSeasons);
      
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
  }, [toast, seasonsState]);
  
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

      // Atualizar dados locais usando estados seguros
      xpEventsState.setData(EMPTY_XP_EVENT_ARRAY);
      seasonXpEventsState.setData(EMPTY_XP_EVENT_ARRAY);
      
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
  }, [toast, fetchAllData, setImportStatus, xpEventsState, seasonXpEventsState]);
  
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
    
    if (session?.user && status === 'authenticated') {
      console.log('👤 Usuário autenticado:', session.user.email, 'Role:', session.user.role);
      
      setUser({
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as Role,
        modules: [] // Will be loaded from API if needed
      });
      
      // Load all data only when fully authenticated
      fetchAllData();
    } else {
      console.log('👤 Usuário não autenticado, limpando estados...');
      
      setUser(null);
      
      // Limpar dados quando não autenticado usando os novos estados seguros
      attendantsState.reset();
      evaluationsState.reset();
      allUsersState.reset();
      modulesState.reset();
      attendantImportsState.reset();
      evaluationImportsState.reset();
      funcoesState.reset();
      setoresState.reset();
      gamificationConfigState.reset();
      achievementsState.reset();
      levelRewardsState.reset();
      seasonsState.reset();
      xpEventsState.reset();
      seasonXpEventsState.reset();
      
      setActiveSeason(null);
      setNextSeason(null);
    }
  }, [
    session, 
    status, 
    fetchAllData,
    attendantsState,
    evaluationsState,
    allUsersState,
    modulesState,
    attendantImportsState,
    evaluationImportsState,
    funcoesState,
    setoresState,
    gamificationConfigState,
    achievementsState,
    levelRewardsState,
    seasonsState,
    xpEventsState,
    seasonXpEventsState
  ]);
  
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
    
    // Estados seguros para todas as entidades
    attendants: {
      data: attendantsState.data,
      loading: attendantsState.loading,
      error: attendantsState.error
    },
    evaluations: {
      data: evaluationsState.data,
      loading: evaluationsState.loading,
      error: evaluationsState.error
    },
    allUsers: {
      data: allUsersState.data,
      loading: allUsersState.loading,
      error: allUsersState.error
    },
    modules: {
      data: modulesState.data,
      loading: modulesState.loading,
      error: modulesState.error
    },
    attendantImports: {
      data: attendantImportsState.data,
      loading: attendantImportsState.loading,
      error: attendantImportsState.error
    },
    evaluationImports: {
      data: evaluationImportsState.data,
      loading: evaluationImportsState.loading,
      error: evaluationImportsState.error
    },
    funcoes: {
      data: funcoesState.data,
      loading: funcoesState.loading,
      error: funcoesState.error
    },
    setores: {
      data: setoresState.data,
      loading: setoresState.loading,
      error: setoresState.error
    },
    gamificationConfig: {
      data: gamificationConfigState.data,
      loading: gamificationConfigState.loading,
      error: gamificationConfigState.error
    },
    achievements: {
      data: achievementsState.data,
      loading: achievementsState.loading,
      error: achievementsState.error
    },
    levelRewards: {
      data: levelRewardsState.data,
      loading: levelRewardsState.loading,
      error: levelRewardsState.error
    },
    seasons: {
      data: seasonsState.data,
      loading: seasonsState.loading,
      error: seasonsState.error
    },
    xpEvents: {
      data: xpEventsState.data,
      loading: xpEventsState.loading,
      error: xpEventsState.error
    },
    seasonXpEvents: {
      data: seasonXpEventsState.data,
      loading: seasonXpEventsState.loading,
      error: seasonXpEventsState.error
    },
    
    // Estados derivados
    activeSeason,
    nextSeason,
    
    // Indicadores globais
    hasAnyError,
    isAnyLoading,
    
    // Funções de gerenciamento
    createUser,
    updateUser,
    deleteUser,
    addModule,
    updateModule,
    toggleModuleStatus,
    deleteModule,
    addAttendant,
    updateAttendant,
    deleteAttendants,
    addFuncao,
    updateFuncao,
    deleteFuncao,
    addSetor,
    updateSetor,
    deleteSetor,
    addEvaluation,
    deleteEvaluations,
    importAttendants,
    importEvaluations,
    importWhatsAppEvaluations,
    deleteAttendantImport,
    deleteEvaluationImport,
    updateGamificationConfig,
    updateAchievement,
    addGamificationSeason,
    updateGamificationSeason,
    deleteGamificationSeason,
    addXpEvent,
    deleteXpEvent,
    resetXpEvents,
    analysisProgress,
    startAnalysis,
    stopAnalysis,
    importStatus,
    setImportStatus,
    fetchAllData,
    retryFailedRequests
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