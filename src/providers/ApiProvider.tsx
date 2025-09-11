"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useState,
  useEffect,
} from "react";
import type { ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

// Import types
import type {
  User,
  Role,
  Module,
  Attendant,
  Evaluation,
  EvaluationImport,
  AttendantImport,
  Funcao,
  Setor,
  GamificationConfig,
  Achievement,
  LevelReward,
  GamificationSeason,
  XpEvent,
} from "@/lib/types";

// Import API hooks
import { useApiQuery, type UseApiQueryResult } from "@/hooks/api/useApiQuery";
import {
  useApiMutation,
  type UseApiMutationResult,
} from "@/hooks/api/useApiMutation";
import {
  useApiCreate,
  useApiUpdate,
  useApiDelete,
} from "@/hooks/api/useApiMutation";

// Import constants and utilities
import {
  INITIAL_ACHIEVEMENTS,
  INITIAL_LEVEL_REWARDS,
} from "@/lib/achievements";
import {
  EMPTY_ATTENDANT_ARRAY,
  EMPTY_EVALUATION_ARRAY,
  EMPTY_XP_EVENT_ARRAY,
} from "@/lib/data-validation";

const INITIAL_GAMIFICATION_CONFIG: GamificationConfig = {
  ratingScores: { "5": 5, "4": 3, "3": 1, "2": -2, "1": -5 },
  achievements: INITIAL_ACHIEVEMENTS,
  levelRewards: INITIAL_LEVEL_REWARDS,
  seasons: [],
  globalXpMultiplier: 1,
};

// Analysis Progress type (mantido do PrismaProvider)
type AnalysisProgress = {
  current: number;
  total: number;
  evaluation: Evaluation | null;
  status: "idle" | "processing" | "waiting" | "done";
  countdown: number;
  lastResult: any | null;
};

// Import Status type (mantido do PrismaProvider)
type ImportStatus = {
  isOpen: boolean;
  logs: string[];
  progress: number;
  title: string;
  status: "idle" | "processing" | "done" | "error";
};

const INITIAL_IMPORT_STATUS: ImportStatus = {
  isOpen: false,
  logs: [],
  progress: 0,
  title: "",
  status: "idle",
};

interface ApiContextType {
  // Auth state
  user: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  appLoading: boolean;
  isProcessing: boolean;

  // Auth functions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (userData: Omit<User, "id">) => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
  hasSuperAdmin: () => Promise<boolean>;

  // Data queries using API hooks
  attendants: UseApiQueryResult<Attendant[]>;
  evaluations: UseApiQueryResult<Evaluation[]>;
  allUsers: UseApiQueryResult<User[]>;
  modules: UseApiQueryResult<Module[]>;
  attendantImports: UseApiQueryResult<AttendantImport[]>;
  evaluationImports: UseApiQueryResult<EvaluationImport[]>;
  funcoes: UseApiQueryResult<Funcao[]>;
  setores: UseApiQueryResult<Setor[]>;
  gamificationConfig: UseApiQueryResult<GamificationConfig>;
  achievements: UseApiQueryResult<Achievement[]>;
  levelRewards: UseApiQueryResult<LevelReward[]>;
  seasons: UseApiQueryResult<GamificationSeason[]>;
  xpEvents: UseApiQueryResult<XpEvent[]>;
  seasonXpEvents: UseApiQueryResult<XpEvent[]>;

  // Derived states
  activeSeason: GamificationSeason | null;
  nextSeason: GamificationSeason | null;

  // Global indicators
  hasAnyError: boolean;
  isAnyLoading: boolean;

  // Mutation operations
  createUser: UseApiMutationResult<
    User,
    {
      name: string;
      email: string;
      password: string;
      role: Role;
      modules: string[];
    }
  >;
  updateUser: UseApiMutationResult<
    User,
    { userId: string; name: string; role: Role; modules: string[] }
  >;
  deleteUser: UseApiMutationResult<void, string>;

  addModule: UseApiMutationResult<Module, Omit<Module, "id" | "active">>;
  updateModule: UseApiMutationResult<
    Module,
    { moduleId: string; data: Partial<Omit<Module, "id" | "active">> }
  >;
  toggleModuleStatus: UseApiMutationResult<Module, string>;
  deleteModule: UseApiMutationResult<void, string>;

  addAttendant: UseApiMutationResult<Attendant, Omit<Attendant, "id">>;
  updateAttendant: UseApiMutationResult<
    Attendant,
    { attendantId: string; data: Partial<Omit<Attendant, "id">> }
  >;
  deleteAttendants: UseApiMutationResult<void, string[]>;

  addFuncao: UseApiMutationResult<Funcao, string>;
  updateFuncao: UseApiMutationResult<
    Funcao,
    { oldFuncao: string; newFuncao: string }
  >;
  deleteFuncao: UseApiMutationResult<void, string>;
  addSetor: UseApiMutationResult<Setor, string>;
  updateSetor: UseApiMutationResult<
    Setor,
    { oldSetor: string; newSetor: string }
  >;
  deleteSetor: UseApiMutationResult<void, string>;

  addEvaluation: UseApiMutationResult<
    Evaluation,
    Omit<Evaluation, "id" | "xpGained" | "importId">
  >;
  deleteEvaluations: UseApiMutationResult<
    void,
    { evaluationIds: string[]; title: string }
  >;

  importAttendants: UseApiMutationResult<
    void,
    {
      attendants: Omit<Attendant, "id" | "importId">[];
      fileName: string;
      userId: string;
    }
  >;
  importEvaluations: UseApiMutationResult<
    void,
    {
      evaluations: Omit<Evaluation, "id" | "importId" | "xpGained">[];
      fileName: string;
    }
  >;
  importWhatsAppEvaluations: UseApiMutationResult<
    void,
    {
      evaluations: Omit<Evaluation, "id" | "xpGained" | "importId">[];
      agentMap: Record<string, string>;
      fileName: string;
    }
  >;
  deleteAttendantImport: UseApiMutationResult<void, string>;
  deleteEvaluationImport: UseApiMutationResult<void, string>;

  updateGamificationConfig: UseApiMutationResult<
    GamificationConfig,
    Partial<GamificationConfig>
  >;
  updateAchievement: UseApiMutationResult<
    Achievement,
    {
      id: string;
      data: Partial<Omit<Achievement, "id" | "icon" | "color" | "isUnlocked">>;
    }
  >;
  addGamificationSeason: UseApiMutationResult<
    GamificationSeason,
    Omit<GamificationSeason, "id">
  >;
  updateGamificationSeason: UseApiMutationResult<
    GamificationSeason,
    { seasonId: string; data: Partial<Omit<GamificationSeason, "id">> }
  >;
  deleteGamificationSeason: UseApiMutationResult<void, string>;

  addXpEvent: UseApiMutationResult<XpEvent, Omit<XpEvent, "id">>;
  deleteXpEvent: UseApiMutationResult<void, string>;
  resetXpEvents: UseApiMutationResult<void, void>;

  // Legacy states (mantidos para compatibilidade)
  analysisProgress: AnalysisProgress;
  startAnalysis: () => Promise<void>;
  stopAnalysis: () => void;

  importStatus: ImportStatus;
  setImportStatus: React.Dispatch<React.SetStateAction<ImportStatus>>;

  // Data refresh functions
  fetchAllData: () => Promise<void>;
  retryFailedRequests: () => Promise<void>;
}

const ApiContext = createContext<ApiContextType | null>(null);

export const ApiProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const { data: session, status } = useSession();

  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [appLoading, setAppLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Legacy states (mantidos para compatibilidade)
  const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
    current: 0,
    total: 0,
    evaluation: null,
    status: "idle",
    countdown: 0,
    lastResult: null,
  });

  const [importStatus, setImportStatus] = useState<ImportStatus>(
    INITIAL_IMPORT_STATUS,
  );

  // Derived states
  const [activeSeason, setActiveSeason] = useState<GamificationSeason | null>(
    null,
  );
  const [nextSeason, setNextSeason] = useState<GamificationSeason | null>(null);

  // Determinar se deve buscar dados baseado na autenticação
  const isAuthenticated = !!session?.user;
  const userRole = session?.user?.role as Role;
  const shouldFetchData = isAuthenticated;

  // Data queries using API hooks
  const attendants = useApiQuery<Attendant[]>(
    ["attendants"],
    "/api/attendants",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 5 * 60 * 1000, // 5 minutos
      onError: (error) => console.error("Erro ao carregar atendentes:", error),
    },
  );

  const evaluations = useApiQuery<Evaluation[]>(
    ["evaluations"],
    "/api/evaluations",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 2 * 60 * 1000, // 2 minutos (dados mais dinâmicos)
      onError: (error) => console.error("Erro ao carregar avaliações:", error),
    },
  );

  const allUsers = useApiQuery<User[]>(["users"], "/api/users", undefined, {
    enabled: shouldFetchData && ["ADMIN", "SUPERADMIN"].includes(userRole),
    staleTime: 10 * 60 * 1000, // 10 minutos
    onError: (error) => console.error("Erro ao carregar usuários:", error),
  });

  const modules = useApiQuery<Module[]>(
    ["modules"],
    "/api/modules",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 15 * 60 * 1000, // 15 minutos (dados mais estáticos)
      onError: (error) => console.error("Erro ao carregar módulos:", error),
    },
  );

  const attendantImports = useApiQuery<AttendantImport[]>(
    ["attendant-imports"],
    "/api/attendants/imports",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 5 * 60 * 1000,
      onError: (error) =>
        console.error("Erro ao carregar importações de atendentes:", error),
    },
  );

  const evaluationImports = useApiQuery<EvaluationImport[]>(
    ["evaluation-imports"],
    "/api/evaluations/imports",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 5 * 60 * 1000,
      onError: (error) =>
        console.error("Erro ao carregar importações de avaliações:", error),
    },
  );

  const funcoes = useApiQuery<Funcao[]>(
    ["funcoes"],
    "/api/funcoes",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 15 * 60 * 1000,
      onError: (error) => console.error("Erro ao carregar funções:", error),
    },
  );

  const setores = useApiQuery<Setor[]>(["setores"], "/api/setores", undefined, {
    enabled: shouldFetchData,
    staleTime: 15 * 60 * 1000,
    onError: (error) => console.error("Erro ao carregar setores:", error),
  });

  const gamificationConfig = useApiQuery<GamificationConfig>(
    ["gamification-config"],
    "/api/gamification",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 10 * 60 * 1000,
      onError: (error) =>
        console.error("Erro ao carregar configuração de gamificação:", error),
    },
  );

  const achievements = useApiQuery<Achievement[]>(
    ["achievements"],
    "/api/gamification/achievements",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 10 * 60 * 1000,
      onError: (error) => console.error("Erro ao carregar conquistas:", error),
    },
  );

  const levelRewards = useApiQuery<LevelReward[]>(
    ["level-rewards"],
    "/api/gamification/level-rewards",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 15 * 60 * 1000,
      onError: (error) =>
        console.error("Erro ao carregar recompensas de nível:", error),
    },
  );

  const seasons = useApiQuery<GamificationSeason[]>(
    ["seasons"],
    "/api/gamification/seasons",
    undefined,
    {
      enabled: shouldFetchData,
      staleTime: 10 * 60 * 1000,
      onError: (error) => console.error("Erro ao carregar temporadas:", error),
    },
  );

  const xpEvents = useApiQuery<XpEvent[]>(
    ["xp-events"],
    "/api/gamification/xp-events",
    { limit: 10000 },
    {
      enabled: shouldFetchData,
      staleTime: 2 * 60 * 1000,
      onError: (error) => console.error("Erro ao carregar eventos XP:", error),
    },
  );

  const seasonXpEvents = useApiQuery<XpEvent[]>(
    ["season-xp-events", activeSeason?.id],
    activeSeason
      ? `/api/gamification/seasons/${activeSeason.id}/xp-events`
      : "",
    undefined,
    {
      enabled: shouldFetchData && !!activeSeason,
      staleTime: 2 * 60 * 1000,
      onError: (error) =>
        console.error("Erro ao carregar eventos XP da temporada:", error),
    },
  );

  // Global indicators
  const hasAnyError = [
    attendants.error,
    evaluations.error,
    allUsers.error,
    modules.error,
    attendantImports.error,
    evaluationImports.error,
    funcoes.error,
    setores.error,
    gamificationConfig.error,
    achievements.error,
    levelRewards.error,
    seasons.error,
    xpEvents.error,
    seasonXpEvents.error,
  ].some((error) => error !== null);

  const isAnyLoading = [
    attendants.loading,
    evaluations.loading,
    allUsers.loading,
    modules.loading,
    attendantImports.loading,
    evaluationImports.loading,
    funcoes.loading,
    setores.loading,
    gamificationConfig.loading,
    achievements.loading,
    levelRewards.loading,
    seasons.loading,
    xpEvents.loading,
    seasonXpEvents.loading,
  ].some((loading) => loading);

  // Mutation hooks for CRUD operations

  // User mutations
  const createUser = useApiCreate<
    User,
    {
      name: string;
      email: string;
      password: string;
      role: Role;
      modules: string[];
    }
  >("/api/users", {
    onSuccess: () => {
      allUsers.refetch();
      toast({ title: "Usuário criado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar usuário",
        description: error,
        variant: "destructive",
      });
    },
  });

  const updateUser = useApiUpdate<
    User,
    { userId: string; name: string; role: Role; modules: string[] }
  >((variables) => `/api/users/${variables.userId}`, {
    onSuccess: () => {
      allUsers.refetch();
      toast({ title: "Usuário atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error,
        variant: "destructive",
      });
    },
  });

  const deleteUser = useApiDelete<void, string>(
    (userId) => `/api/users/${userId}`,
    {
      onSuccess: () => {
        allUsers.refetch();
        toast({ title: "Usuário excluído com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir usuário",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // Module mutations
  const addModule = useApiCreate<Module, Omit<Module, "id" | "active">>(
    "/api/modules",
    {
      onSuccess: () => {
        modules.refetch();
        toast({ title: "Módulo adicionado com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao adicionar módulo",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const updateModule = useApiUpdate<
    Module,
    { moduleId: string; data: Partial<Omit<Module, "id" | "active">> }
  >((variables) => `/api/modules/${variables.moduleId}`, {
    onSuccess: () => {
      modules.refetch();
      toast({ title: "Módulo atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar módulo",
        description: error,
        variant: "destructive",
      });
    },
  });

  const toggleModuleStatus = useApiUpdate<Module, string>(
    (moduleId) => `/api/modules/${moduleId}/toggle`,
    {
      onSuccess: () => {
        modules.refetch();
        toast({ title: "Status do módulo alterado com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao alterar status do módulo",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const deleteModule = useApiDelete<void, string>(
    (moduleId) => `/api/modules/${moduleId}`,
    {
      onSuccess: () => {
        modules.refetch();
        toast({ title: "Módulo excluído com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir módulo",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // Attendant mutations
  const addAttendant = useApiCreate<Attendant, Omit<Attendant, "id">>(
    "/api/attendants",
    {
      onSuccess: () => {
        attendants.refetch();
        toast({ title: "Atendente adicionado com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao adicionar atendente",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const updateAttendant = useApiUpdate<
    Attendant,
    { attendantId: string; data: Partial<Omit<Attendant, "id">> }
  >((variables) => `/api/attendants/${variables.attendantId}`, {
    onSuccess: () => {
      attendants.refetch();
      toast({ title: "Atendente atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar atendente",
        description: error,
        variant: "destructive",
      });
    },
  });

  const deleteAttendants = useApiMutation<void, string[]>(
    async (attendantIds) => {
      const response = await fetch("/api/attendants/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendantIds }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir atendentes");
      }

      return { success: true, data: undefined };
    },
    {
      onSuccess: () => {
        attendants.refetch();
        toast({ title: "Atendentes excluídos com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir atendentes",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // RH Config mutations
  const addFuncao = useApiCreate<Funcao, string>("/api/funcoes", {
    onSuccess: () => {
      funcoes.refetch();
      toast({ title: "Função adicionada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar função",
        description: error,
        variant: "destructive",
      });
    },
  });

  const updateFuncao = useApiUpdate<
    Funcao,
    { oldFuncao: string; newFuncao: string }
  >("/api/funcoes", {
    onSuccess: () => {
      funcoes.refetch();
      toast({ title: "Função atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar função",
        description: error,
        variant: "destructive",
      });
    },
  });

  const deleteFuncao = useApiDelete<void, string>(
    (funcao) => `/api/funcoes/${encodeURIComponent(funcao)}`,
    {
      onSuccess: () => {
        funcoes.refetch();
        toast({ title: "Função excluída com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir função",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const addSetor = useApiCreate<Setor, string>("/api/setores", {
    onSuccess: () => {
      setores.refetch();
      toast({ title: "Setor adicionado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar setor",
        description: error,
        variant: "destructive",
      });
    },
  });

  const updateSetor = useApiUpdate<
    Setor,
    { oldSetor: string; newSetor: string }
  >("/api/setores", {
    onSuccess: () => {
      setores.refetch();
      toast({ title: "Setor atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar setor",
        description: error,
        variant: "destructive",
      });
    },
  });

  const deleteSetor = useApiDelete<void, string>(
    (setor) => `/api/setores/${encodeURIComponent(setor)}`,
    {
      onSuccess: () => {
        setores.refetch();
        toast({ title: "Setor excluído com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir setor",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // Evaluation mutations
  const addEvaluation = useApiCreate<
    Evaluation,
    Omit<Evaluation, "id" | "xpGained" | "importId">
  >("/api/evaluations", {
    onSuccess: () => {
      evaluations.refetch();
      xpEvents.refetch();
      toast({ title: "Avaliação adicionada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar avaliação",
        description: error,
        variant: "destructive",
      });
    },
  });

  const deleteEvaluations = useApiMutation<
    void,
    { evaluationIds: string[]; title: string }
  >(
    async (variables) => {
      const response = await fetch("/api/evaluations/bulk-delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao excluir avaliações");
      }

      return { success: true, data: undefined };
    },
    {
      onSuccess: () => {
        evaluations.refetch();
        xpEvents.refetch();
        toast({ title: "Avaliações excluídas com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir avaliações",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // Import mutations
  const importAttendants = useApiMutation<
    void,
    {
      attendants: Omit<Attendant, "id" | "importId">[];
      fileName: string;
      userId: string;
    }
  >(
    async (variables) => {
      const response = await fetch("/api/attendants/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao importar atendentes");
      }

      return { success: true, data: undefined };
    },
    {
      onSuccess: () => {
        attendants.refetch();
        attendantImports.refetch();
        toast({ title: "Atendentes importados com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao importar atendentes",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const importEvaluations = useApiMutation<
    void,
    {
      evaluations: Omit<Evaluation, "id" | "importId" | "xpGained">[];
      fileName: string;
    }
  >(
    async (variables) => {
      const response = await fetch("/api/evaluations/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao importar avaliações");
      }

      return { success: true, data: undefined };
    },
    {
      onSuccess: () => {
        evaluations.refetch();
        evaluationImports.refetch();
        xpEvents.refetch();
        toast({ title: "Avaliações importadas com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao importar avaliações",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const importWhatsAppEvaluations = useApiMutation<
    void,
    {
      evaluations: Omit<Evaluation, "id" | "xpGained" | "importId">[];
      agentMap: Record<string, string>;
      fileName: string;
    }
  >(
    async (variables) => {
      const response = await fetch("/api/evaluations/import-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(variables),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          error.error || "Erro ao importar avaliações do WhatsApp",
        );
      }

      return { success: true, data: undefined };
    },
    {
      onSuccess: () => {
        evaluations.refetch();
        evaluationImports.refetch();
        xpEvents.refetch();
        toast({ title: "Avaliações do WhatsApp importadas com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao importar avaliações do WhatsApp",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const deleteAttendantImport = useApiDelete<void, string>(
    (importId) => `/api/attendants/imports/${importId}`,
    {
      onSuccess: () => {
        attendantImports.refetch();
        attendants.refetch();
        toast({ title: "Importação de atendentes excluída com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir importação",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const deleteEvaluationImport = useApiDelete<void, string>(
    (importId) => `/api/evaluations/imports/${importId}`,
    {
      onSuccess: () => {
        evaluationImports.refetch();
        evaluations.refetch();
        xpEvents.refetch();
        toast({ title: "Importação de avaliações excluída com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir importação",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // Gamification mutations
  const updateGamificationConfig = useApiUpdate<
    GamificationConfig,
    Partial<GamificationConfig>
  >("/api/gamification", {
    onSuccess: () => {
      gamificationConfig.refetch();
      toast({ title: "Configuração de gamificação atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar configuração",
        description: error,
        variant: "destructive",
      });
    },
  });

  const updateAchievement = useApiUpdate<
    Achievement,
    {
      id: string;
      data: Partial<Omit<Achievement, "id" | "icon" | "color" | "isUnlocked">>;
    }
  >((variables) => `/api/gamification/achievements/${variables.id}`, {
    onSuccess: () => {
      achievements.refetch();
      gamificationConfig.refetch();
      toast({ title: "Conquista atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar conquista",
        description: error,
        variant: "destructive",
      });
    },
  });

  const addGamificationSeason = useApiCreate<
    GamificationSeason,
    Omit<GamificationSeason, "id">
  >("/api/gamification/seasons", {
    onSuccess: () => {
      seasons.refetch();
      toast({ title: "Temporada adicionada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar temporada",
        description: error,
        variant: "destructive",
      });
    },
  });

  const updateGamificationSeason = useApiUpdate<
    GamificationSeason,
    { seasonId: string; data: Partial<Omit<GamificationSeason, "id">> }
  >((variables) => `/api/gamification/seasons/${variables.seasonId}`, {
    onSuccess: () => {
      seasons.refetch();
      toast({ title: "Temporada atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar temporada",
        description: error,
        variant: "destructive",
      });
    },
  });

  const deleteGamificationSeason = useApiDelete<void, string>(
    (seasonId) => `/api/gamification/seasons/${seasonId}`,
    {
      onSuccess: () => {
        seasons.refetch();
        toast({ title: "Temporada excluída com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir temporada",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // XP Event mutations
  const addXpEvent = useApiCreate<XpEvent, Omit<XpEvent, "id">>(
    "/api/gamification/xp-events",
    {
      onSuccess: () => {
        xpEvents.refetch();
        seasonXpEvents.refetch();
        toast({ title: "Evento XP adicionado com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao adicionar evento XP",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const deleteXpEvent = useApiDelete<void, string>(
    (xpEventId) => `/api/gamification/xp-events/${xpEventId}`,
    {
      onSuccess: () => {
        xpEvents.refetch();
        seasonXpEvents.refetch();
        toast({ title: "Evento XP excluído com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao excluir evento XP",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  const resetXpEvents = useApiMutation<void, void>(
    async () => {
      const response = await fetch("/api/gamification/xp-events/reset", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao resetar eventos XP");
      }

      return { success: true, data: undefined };
    },
    {
      onSuccess: () => {
        xpEvents.refetch();
        seasonXpEvents.refetch();
        toast({ title: "Eventos XP resetados com sucesso!" });
      },
      onError: (error) => {
        toast({
          title: "Erro ao resetar eventos XP",
          description: error,
          variant: "destructive",
        });
      },
    },
  );

  // Calculate active season and next season
  useEffect(() => {
    const now = new Date();
    const seasonsData = seasons.data || [];

    const currentActiveSeason =
      seasonsData.find(
        (s) =>
          s.active &&
          new Date(s.startDate) <= now &&
          new Date(s.endDate) >= now,
      ) || null;

    setActiveSeason(currentActiveSeason);

    const nextUpcomingSeason =
      seasonsData
        .filter((s) => s.active && new Date(s.startDate) > now)
        .sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
        )[0] || null;

    setNextSeason(nextUpcomingSeason);
  }, [seasons.data]);

  // Auth functions (mantidas para compatibilidade - TODO: implementar)
  const login = useCallback(
    async (email: string, password: string) => {
      try {
        setIsProcessing(true);
        throw new Error("Login não implementado ainda");
      } catch (error: any) {
        console.error("Login error:", error);
        toast({
          title: "Erro ao fazer login",
          description:
            error.message ||
            "Ocorreu um erro ao fazer login. Por favor, tente novamente.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const register = useCallback(
    async (userData: Omit<User, "id">) => {
      try {
        setIsProcessing(true);
        throw new Error("Registro não implementado ainda");
      } catch (error: any) {
        console.error("Register error:", error);
        toast({
          title: "Erro ao registrar",
          description:
            error.message ||
            "Ocorreu um erro ao registrar. Por favor, tente novamente.",
          variant: "destructive",
        });
        throw error;
      } finally {
        setIsProcessing(false);
      }
    },
    [toast],
  );

  const updateProfile = useCallback(
    async (userData: Partial<User>) => {
      if (!user) return;

      try {
        setIsProcessing(true);
        throw new Error("Atualização de perfil não implementada ainda");
      } catch (error) {
        console.error("Update profile error:", error);
        toast({
          title: "Erro ao atualizar perfil",
          description:
            "Ocorreu um erro ao atualizar o perfil. Por favor, tente novamente.",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    },
    [user, toast],
  );

  const hasSuperAdmin = useCallback(async () => {
    try {
      return false;
    } catch (error) {
      console.error("Error checking for super admin:", error);
      return false;
    }
  }, []);

  // Legacy functions (mantidas para compatibilidade)
  const startAnalysis = useCallback(async () => {
    console.log("Analysis not implemented in ApiProvider yet");
  }, []);

  const stopAnalysis = useCallback(() => {
    console.log("Stop analysis not implemented in ApiProvider yet");
  }, []);

  // Data refresh functions
  const fetchAllData = useCallback(async () => {
    try {
      setAppLoading(true);

      if (!isAuthenticated) {
        console.log("👤 Usuário não autenticado, não carregando dados...");
        return;
      }

      console.log("🔄 Refazendo fetch de todos os dados...");

      // Refetch all queries
      await Promise.allSettled([
        attendants.refetch(),
        evaluations.refetch(),
        allUsers.refetch(),
        modules.refetch(),
        attendantImports.refetch(),
        evaluationImports.refetch(),
        funcoes.refetch(),
        setores.refetch(),
        gamificationConfig.refetch(),
        achievements.refetch(),
        levelRewards.refetch(),
        seasons.refetch(),
        xpEvents.refetch(),
        seasonXpEvents.refetch(),
      ]);

      console.log("🎉 Refresh de dados concluído");
    } catch (error) {
      console.error("❌ Erro ao fazer refresh dos dados:", error);
      toast({
        title: "Erro ao atualizar dados",
        description:
          "Ocorreu um erro ao atualizar os dados. Algumas funcionalidades podem estar limitadas.",
        variant: "destructive",
      });
    } finally {
      setAppLoading(false);
    }
  }, [
    isAuthenticated,
    toast,
    attendants,
    evaluations,
    allUsers,
    modules,
    attendantImports,
    evaluationImports,
    funcoes,
    setores,
    gamificationConfig,
    achievements,
    levelRewards,
    seasons,
    xpEvents,
    seasonXpEvents,
  ]);

  const retryFailedRequests = useCallback(async () => {
    console.log("🔄 Tentando novamente requisições que falharam...");

    const retryPromises: Promise<void>[] = [];

    if (attendants.error) retryPromises.push(attendants.refetch());
    if (evaluations.error) retryPromises.push(evaluations.refetch());
    if (allUsers.error) retryPromises.push(allUsers.refetch());
    if (modules.error) retryPromises.push(modules.refetch());
    if (attendantImports.error) retryPromises.push(attendantImports.refetch());
    if (evaluationImports.error)
      retryPromises.push(evaluationImports.refetch());
    if (funcoes.error) retryPromises.push(funcoes.refetch());
    if (setores.error) retryPromises.push(setores.refetch());
    if (gamificationConfig.error)
      retryPromises.push(gamificationConfig.refetch());
    if (achievements.error) retryPromises.push(achievements.refetch());
    if (levelRewards.error) retryPromises.push(levelRewards.refetch());
    if (seasons.error) retryPromises.push(seasons.refetch());
    if (xpEvents.error) retryPromises.push(xpEvents.refetch());
    if (seasonXpEvents.error) retryPromises.push(seasonXpEvents.refetch());

    if (retryPromises.length > 0) {
      await Promise.allSettled(retryPromises);
      toast({
        title: "Tentativa de reconexão",
        description: `Tentando reconectar ${retryPromises.length} serviços que falharam.`,
      });
    } else {
      toast({
        title: "Nenhuma falha detectada",
        description: "Todos os serviços estão funcionando corretamente.",
      });
    }
  }, [
    toast,
    attendants,
    evaluations,
    allUsers,
    modules,
    attendantImports,
    evaluationImports,
    funcoes,
    setores,
    gamificationConfig,
    achievements,
    levelRewards,
    seasons,
    xpEvents,
    seasonXpEvents,
  ]);

  // Update auth loading based on session status
  useEffect(() => {
    setAuthLoading(status === "loading");
    setUser((session?.user as User) || null);
  }, [session, status]);

  const contextValue: ApiContextType = {
    // Auth state
    user,
    isAuthenticated,
    authLoading,
    appLoading,
    isProcessing,

    // Auth functions
    login,
    logout,
    register,
    updateProfile,
    hasSuperAdmin,

    // Data queries
    attendants,
    evaluations,
    allUsers,
    modules,
    attendantImports,
    evaluationImports,
    funcoes,
    setores,
    gamificationConfig,
    achievements,
    levelRewards,
    seasons,
    xpEvents,
    seasonXpEvents,

    // Derived states
    activeSeason,
    nextSeason,

    // Global indicators
    hasAnyError,
    isAnyLoading,

    // Mutations
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

    // Legacy states
    analysisProgress,
    startAnalysis,
    stopAnalysis,
    importStatus,
    setImportStatus,

    // Data refresh
    fetchAllData,
    retryFailedRequests,
  };

  return (
    <ApiContext.Provider value={contextValue}>{children}</ApiContext.Provider>
  );
};

// Hook para usar o contexto
export const useApi = () => {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi deve ser usado dentro de um ApiProvider");
  }
  return context;
};

// Alias para compatibilidade com código existente
export const usePrisma = useApi;
