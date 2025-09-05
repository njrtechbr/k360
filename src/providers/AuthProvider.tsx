"use client";

import type { ReactNode } from "react";
import React, { useCallback, useEffect, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import type { User, Role, Module, Attendant, Evaluation, EvaluationImport, AttendantImport, Funcao, Setor, GamificationConfig, Achievement, LevelReward, GamificationSeason, XpEvent } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

// Serviços Prisma
import { UserService } from "@/services/userService";
import { ModuleService } from "@/services/moduleService";
import { AttendantService } from "@/services/attendantService";
import { EvaluationService } from "@/services/evaluationService";
import { GamificationService } from "@/services/gamificationService";
import { RHService } from "@/services/rhService";

import { INITIAL_ACHIEVEMENTS, INITIAL_LEVEL_REWARDS } from "@/lib/achievements";
import { getScoreFromRating } from "@/lib/gamification";
import { analyzeEvaluation } from '@/ai/flows/analyze-evaluation-flow';
import type { EvaluationAnalysis } from '@/lib/types';
import { de } from "date-fns/locale";
import { de } from "date-fns/locale";
import { de } from "date-fns/locale";
import { de } from "date-fns/locale";

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
    total: number;
    isProcessing: boolean;
};

interface AuthContextType {
    // Estado de autenticação
    user: User | null;
    authLoading: boolean;
    
    // Dados do sistema
    users: User[];
    modules: Module[];
    attendants: Attendant[];
    evaluations: Evaluation[];
    evaluationImports: EvaluationImport[];
    attendantImports: AttendantImport[];
    funcoes: Funcao[];
    setores: Setor[];
    gamificationConfig: GamificationConfig;
    seasons: GamificationSeason[];
    
    // Estados de carregamento
    loading: boolean;
    
    // Funções de autenticação
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    
    // Funções de usuário
    createUser: (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateUser: (userId: string, userData: Partial<User>) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
    
    // Funções de módulo
    createModule: (moduleData: Omit<Module, 'users'>) => Promise<void>;
    updateModule: (moduleId: string, moduleData: Partial<Module>) => Promise<void>;
    deleteModule: (moduleId: string) => Promise<void>;
    
    // Funções de atendente
    createAttendant: (attendantData: Omit<Attendant, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
    updateAttendant: (attendantId: string, attendantData: Partial<Attendant>) => Promise<void>;
    deleteAttendant: (attendantId: string) => Promise<void>;
    importAttendants: (file: File) => Promise<void>;
    reverseAttendantImport: (importId: string) => Promise<void>;
    
    // Funções de avaliação
    createEvaluation: (evaluationData: Omit<Evaluation, 'id' | 'createdAt'>) => Promise<void>;
    updateEvaluation: (evaluationId: string, evaluationData: Partial<Evaluation>) => Promise<void>;
    deleteEvaluation: (evaluationId: string) => Promise<void>;
    importEvaluations: (file: File, attendantMap: Record<string, string>) => Promise<void>;
    reverseEvaluationImport: (importId: string) => Promise<void>;
    
    // Funções de gamificação
    updateGamificationConfig: (config: Partial<GamificationConfig>) => Promise<void>;
    createSeason: (seasonData: Omit<GamificationSeason, 'id' | 'createdAt'>) => Promise<void>;
    updateSeason: (seasonId: string, seasonData: Partial<GamificationSeason>) => Promise<void>;
    deleteSeason: (seasonId: string) => Promise<void>;
    
    // Funções de RH
    createFuncao: (name: string) => Promise<void>;
    createSetor: (name: string) => Promise<void>;
    
    // Análise IA
    analysisProgress: AnalysisProgress;
    startAnalysis: () => Promise<void>;
    stopAnalysis: () => void;
    
    // Status de importação
    importStatus: ImportStatus;
    
    // Função para recarregar dados
    fetchAllData: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const { toast } = useToast();
    
    // Estados
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    
    // Dados do sistema
    const [users, setUsers] = useState<User[]>([]);
    const [modules, setModules] = useState<Module[]>([]);
    const [attendants, setAttendants] = useState<Attendant[]>([]);
    const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
    const [evaluationImports, setEvaluationImports] = useState<EvaluationImport[]>([]);
    const [attendantImports, setAttendantImports] = useState<AttendantImport[]>([]);
    const [funcoes, setFuncoes] = useState<Funcao[]>([]);
    const [setores, setSetores] = useState<Setor[]>([]);
    const [gamificationConfig, setGamificationConfig] = useState<GamificationConfig>(INITIAL_GAMIFICATION_CONFIG);
    const [seasons, setSeasons] = useState<GamificationSeason[]>([]);
    
    // Estados de análise e importação
    const [analysisProgress, setAnalysisProgress] = useState<AnalysisProgress>({
        current: 0,
        total: 0,
        evaluation: null,
        status: 'idle',
        countdown: 0,
        lastResult: null
    });
    
    const [importStatus, setImportStatus] = useState<ImportStatus>({
        isOpen: false,
        logs: [],
        progress: 0,
        total: 0,
        isProcessing: false
    });

    // Efeito para gerenciar autenticação
    useEffect(() => {
        if (status === 'loading') {
            setAuthLoading(true);
            return;
        }

        if (session?.user) {
            setUser({
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: session.user.role as Role,
                modules: [], // Será carregado em fetchAllData
                createdAt: new Date(),
                updatedAt: new Date()
            });
            fetchAllData();
        } else {
            setUser(null);
        }
        
        setAuthLoading(false);
    }, [session, status]);

    // Função para buscar todos os dados
    const fetchAllData = useCallback(async () => {
        if (!session?.user) return;
        
        setLoading(true);
        try {
            const [
                usersData,
                modulesData,
                attendantsData,
                evaluationsData,
                funcoesData,
                setoresData,
                seasonsData
            ] = await Promise.all([
                UserService.findAll(),
                ModuleService.findAll(),
                AttendantService.findAll(),
                EvaluationService.findAll(),
                RHService.findAllFuncoes(),
                RHService.findAllSetores(),
                GamificationService.findAllSeasons()
            ]);

            setUsers(usersData);
            setModules(modulesData);
            setAttendants(attendantsData);
            setEvaluations(evaluationsData);
            setFuncoes(funcoesData);
            setSetores(setoresData);
            setSeasons(seasonsData);
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            toast({
                title: "Erro",
                description: "Falha ao carregar dados do sistema",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [session, toast]);    // 
Funções de autenticação
    const login = useCallback(async (email: string, password: string) => {
        try {
            const result = await signIn('credentials', {
                email,
                password,
                redirect: false
            });

            if (result?.error) {
                throw new Error('Credenciais inválidas');
            }

            toast({
                title: "Login realizado!",
                description: "Bem-vindo de volta!"
            });
        } catch (error) {
            console.error('Erro no login:', error);
            toast({
                title: "Erro no login",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive"
            });
            throw error;
        }
    }, [toast]);

    const logout = useCallback(async () => {
        try {
            await signOut({ redirect: false });
            setUser(null);
            toast({
                title: "Logout realizado",
                description: "Até logo!"
            });
        } catch (error) {
            console.error('Erro no logout:', error);
            toast({
                title: "Erro no logout",
                description: "Erro ao fazer logout",
                variant: "destructive"
            });
        }
    }, [toast]);

    // Funções de usuário
    const createUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            await UserService.create({
                name: userData.name,
                email: userData.email,
                password: userData.password!,
                role: userData.role,
                modules: userData.modules?.map(m => m.id) || []
            });
            
            await fetchAllData();
            toast({
                title: "Usuário criado!",
                description: "Usuário criado com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar usuário",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const updateUser = useCallback(async (userId: string, userData: Partial<User>) => {
        try {
            const updateData: any = {
                name: userData.name,
                email: userData.email,
                role: userData.role
            };

            if (userData.password) {
                updateData.password = userData.password;
            }

            if (userData.modules) {
                updateData.modules = userData.modules.map(m => m.id);
            }

            await UserService.update(userId, updateData);
            await fetchAllData();
            
            toast({
                title: "Usuário atualizado!",
                description: "Dados atualizados com sucesso."
            });
        } catch (error) {
            console.error('Erro ao atualizar usuário:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao atualizar usuário",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const deleteUser = useCallback(async (userId: string) => {
        try {
            await UserService.delete(userId);
            await fetchAllData();
            
            toast({
                title: "Usuário removido!",
                description: "Usuário removido com sucesso."
            });
        } catch (error) {
            console.error('Erro ao deletar usuário:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao remover usuário",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    // Funções de módulo
    const createModule = useCallback(async (moduleData: Omit<Module, 'users'>) => {
        try {
            await ModuleService.create({
                id: moduleData.id,
                name: moduleData.name,
                description: moduleData.description,
                path: moduleData.path,
                active: moduleData.active
            });
            
            await fetchAllData();
            toast({
                title: "Módulo criado!",
                description: "Módulo criado com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar módulo:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar módulo",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const updateModule = useCallback(async (moduleId: string, moduleData: Partial<Module>) => {
        try {
            await ModuleService.update(moduleId, {
                name: moduleData.name,
                description: moduleData.description,
                path: moduleData.path,
                active: moduleData.active
            });
            
            await fetchAllData();
            toast({
                title: "Módulo atualizado!",
                description: "Módulo atualizado com sucesso."
            });
        } catch (error) {
            console.error('Erro ao atualizar módulo:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao atualizar módulo",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const deleteModule = useCallback(async (moduleId: string) => {
        try {
            await ModuleService.delete(moduleId);
            await fetchAllData();
            
            toast({
                title: "Módulo removido!",
                description: "Módulo removido com sucesso."
            });
        } catch (error) {
            console.error('Erro ao deletar módulo:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao remover módulo",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    // Funções de atendente
    const createAttendant = useCallback(async (attendantData: Omit<Attendant, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            await AttendantService.create({
                name: attendantData.name,
                email: attendantData.email,
                funcao: attendantData.funcao,
                setor: attendantData.setor,
                status: attendantData.status,
                avatarUrl: attendantData.avatarUrl,
                telefone: attendantData.telefone,
                portaria: attendantData.portaria,
                situacao: attendantData.situacao,
                dataAdmissao: attendantData.dataAdmissao,
                dataNascimento: attendantData.dataNascimento,
                rg: attendantData.rg,
                cpf: attendantData.cpf
            });
            
            await fetchAllData();
            toast({
                title: "Atendente criado!",
                description: "Atendente criado com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar atendente:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar atendente",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const updateAttendant = useCallback(async (attendantId: string, attendantData: Partial<Attendant>) => {
        try {
            await AttendantService.update(attendantId, {
                name: attendantData.name,
                email: attendantData.email,
                funcao: attendantData.funcao,
                setor: attendantData.setor,
                status: attendantData.status,
                avatarUrl: attendantData.avatarUrl,
                telefone: attendantData.telefone,
                portaria: attendantData.portaria,
                situacao: attendantData.situacao,
                dataAdmissao: attendantData.dataAdmissao,
                dataNascimento: attendantData.dataNascimento,
                rg: attendantData.rg,
                cpf: attendantData.cpf
            });
            
            await fetchAllData();
            toast({
                title: "Atendente atualizado!",
                description: "Dados atualizados com sucesso."
            });
        } catch (error) {
            console.error('Erro ao atualizar atendente:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao atualizar atendente",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const deleteAttendant = useCallback(async (attendantId: string) => {
        try {
            await AttendantService.delete(attendantId);
            await fetchAllData();
            
            toast({
                title: "Atendente removido!",
                description: "Atendente removido com sucesso."
            });
        } catch (error) {
            console.error('Erro ao deletar atendente:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao remover atendente",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    // Funções de importação
    const importAttendants = useCallback(async (file: File) => {
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const attendants = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== headers.length) continue;
                
                const attendant: any = {};
                headers.forEach((header, index) => {
                    attendant[header] = values[index];
                });
                
                // Validar campos obrigatórios
                if (!attendant.name || !attendant.email || !attendant.cpf) {
                    continue;
                }
                
                attendants.push({
                    name: attendant.name,
                    email: attendant.email,
                    funcao: attendant.funcao || '',
                    setor: attendant.setor || '',
                    status: attendant.status || 'ATIVO',
                    telefone: attendant.telefone || '',
                    portaria: attendant.portaria || '',
                    situacao: attendant.situacao || '',
                    dataAdmissao: attendant.dataAdmissao ? new Date(attendant.dataAdmissao) : new Date(),
                    dataNascimento: attendant.dataNascimento ? new Date(attendant.dataNascimento) : new Date(),
                    rg: attendant.rg || '',
                    cpf: attendant.cpf
                });
            }
            
            if (attendants.length === 0) {
                throw new Error('Nenhum atendente válido encontrado no arquivo');
            }
            
            const response = await fetch('/api/attendants/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    attendants,
                    fileName: file.name
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao importar atendentes');
            }
            
            const result = await response.json();
            await fetchAllData();
            
            toast({
                title: "Importação concluída!",
                description: `${result.count} atendentes importados com sucesso.`
            });
        } catch (error) {
            console.error('Erro na importação:', error);
            toast({
                title: "Erro na importação",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const reverseAttendantImport = useCallback(async (importId: string) => {
        try {
            await AttendantService.deleteByImportId(importId);
            await fetchAllData();
            
            toast({
                title: "Importação revertida!",
                description: "Dados da importação foram removidos."
            });
        } catch (error) {
            console.error('Erro ao reverter importação:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao reverter importação",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);    // F
unções de avaliação
    const createEvaluation = useCallback(async (evaluationData: Omit<Evaluation, 'id' | 'createdAt'>) => {
        try {
            await EvaluationService.create({
                attendantId: evaluationData.attendantId,
                nota: evaluationData.nota,
                comentario: evaluationData.comentario || '',
                data: evaluationData.data,
                xpGained: evaluationData.xpGained || 0
            });
            
            await fetchAllData();
            toast({
                title: "Avaliação criada!",
                description: "Avaliação criada com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar avaliação:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar avaliação",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const updateEvaluation = useCallback(async (evaluationId: string, evaluationData: Partial<Evaluation>) => {
        try {
            await EvaluationService.update(evaluationId, {
                nota: evaluationData.nota,
                comentario: evaluationData.comentario,
                data: evaluationData.data,
                xpGained: evaluationData.xpGained
            });
            
            await fetchAllData();
            toast({
                title: "Avaliação atualizada!",
                description: "Avaliação atualizada com sucesso."
            });
        } catch (error) {
            console.error('Erro ao atualizar avaliação:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao atualizar avaliação",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const deleteEvaluation = useCallback(async (evaluationId: string) => {
        try {
            await EvaluationService.delete(evaluationId);
            await fetchAllData();
            
            toast({
                title: "Avaliação removida!",
                description: "Avaliação removida com sucesso."
            });
        } catch (error) {
            console.error('Erro ao deletar avaliação:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao remover avaliação",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const importEvaluations = useCallback(async (file: File, attendantMap: Record<string, string>) => {
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                throw new Error('Arquivo CSV deve ter pelo menos um cabeçalho e uma linha de dados');
            }
            
            const headers = lines[0].split(',').map(h => h.trim());
            const evaluations = [];
            
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map(v => v.trim());
                if (values.length !== headers.length) continue;
                
                const evaluation: any = {};
                headers.forEach((header, index) => {
                    evaluation[header] = values[index];
                });
                
                // Mapear nome do atendente para ID se necessário
                let attendantId = evaluation.attendantId;
                if (!attendantId && evaluation.attendantName && attendantMap[evaluation.attendantName]) {
                    attendantId = attendantMap[evaluation.attendantName];
                }
                
                // Validar campos obrigatórios
                if (!attendantId || !evaluation.nota || !evaluation.data) {
                    continue;
                }
                
                evaluations.push({
                    attendantId,
                    nota: parseInt(evaluation.nota),
                    comentario: evaluation.comentario || '',
                    data: new Date(evaluation.data)
                });
            }
            
            if (evaluations.length === 0) {
                throw new Error('Nenhuma avaliação válida encontrada no arquivo');
            }
            
            const response = await fetch('/api/evaluations/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    evaluations,
                    fileName: file.name
                })
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao importar avaliações');
            }
            
            const result = await response.json();
            await fetchAllData();
            
            toast({
                title: "Importação concluída!",
                description: `${result.evaluationsCount} avaliações importadas com sucesso.`
            });
        } catch (error) {
            console.error('Erro na importação:', error);
            toast({
                title: "Erro na importação",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const reverseEvaluationImport = useCallback(async (importId: string) => {
        try {
            await EvaluationService.deleteByImportId(importId);
            await fetchAllData();
            
            toast({
                title: "Importação revertida!",
                description: "Avaliações da importação foram removidas."
            });
        } catch (error) {
            console.error('Erro ao reverter importação:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao reverter importação",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    // Funções de gamificação
    const updateGamificationConfig = useCallback(async (config: Partial<GamificationConfig>) => {
        try {
            const response = await fetch('/api/gamification', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config)
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Erro ao atualizar configuração');
            }
            
            setGamificationConfig(prev => ({ ...prev, ...config }));
            
            toast({
                title: "Configuração atualizada!",
                description: "Configurações de gamificação atualizadas com sucesso."
            });
        } catch (error) {
            console.error('Erro ao atualizar configuração:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao atualizar configuração",
                variant: "destructive"
            });
            throw error;
        }
    }, [toast]);

    const createSeason = useCallback(async (seasonData: Omit<GamificationSeason, 'id' | 'createdAt'>) => {
        try {
            await GamificationService.createSeason({
                name: seasonData.name,
                startDate: seasonData.startDate,
                endDate: seasonData.endDate,
                active: seasonData.active,
                xpMultiplier: seasonData.xpMultiplier
            });
            
            await fetchAllData();
            toast({
                title: "Temporada criada!",
                description: "Temporada criada com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar temporada:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar temporada",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const updateSeason = useCallback(async (seasonId: string, seasonData: Partial<GamificationSeason>) => {
        try {
            await GamificationService.updateSeason(seasonId, {
                name: seasonData.name,
                startDate: seasonData.startDate,
                endDate: seasonData.endDate,
                active: seasonData.active,
                xpMultiplier: seasonData.xpMultiplier
            });
            
            await fetchAllData();
            toast({
                title: "Temporada atualizada!",
                description: "Temporada atualizada com sucesso."
            });
        } catch (error) {
            console.error('Erro ao atualizar temporada:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao atualizar temporada",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const deleteSeason = useCallback(async (seasonId: string) => {
        try {
            await GamificationService.deleteSeason(seasonId);
            await fetchAllData();
            
            toast({
                title: "Temporada removida!",
                description: "Temporada removida com sucesso."
            });
        } catch (error) {
            console.error('Erro ao deletar temporada:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao remover temporada",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    // Funções de RH
    const createFuncao = useCallback(async (name: string) => {
        try {
            await RHService.createFuncao({ name });
            await fetchAllData();
            
            toast({
                title: "Função criada!",
                description: "Função criada com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar função:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar função",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    const createSetor = useCallback(async (name: string) => {
        try {
            await RHService.createSetor({ name });
            await fetchAllData();
            
            toast({
                title: "Setor criado!",
                description: "Setor criado com sucesso."
            });
        } catch (error) {
            console.error('Erro ao criar setor:', error);
            toast({
                title: "Erro",
                description: error instanceof Error ? error.message : "Erro ao criar setor",
                variant: "destructive"
            });
            throw error;
        }
    }, [fetchAllData, toast]);

    // Análise IA
    const startAnalysis = useCallback(async () => {
        try {
            // Buscar avaliações sem análise IA
            const evaluationsToAnalyze = evaluations.filter(eval => !eval.aiAnalysis);
            
            if (evaluationsToAnalyze.length === 0) {
                toast({
                    title: "Análise completa",
                    description: "Todas as avaliações já foram analisadas pela IA"
                });
                return;
            }
            
            setAnalysisProgress({
                current: 0,
                total: evaluationsToAnalyze.length,
                evaluation: null,
                status: 'processing',
                countdown: 0,
                lastResult: null
            });
            
            for (let i = 0; i < evaluationsToAnalyze.length; i++) {
                const evaluation = evaluationsToAnalyze[i];
                
                setAnalysisProgress(prev => ({
                    ...prev,
                    current: i + 1,
                    evaluation,
                    status: 'processing'
                }));
                
                try {
                    const response = await fetch('/api/evaluations/analysis', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            evaluationId: evaluation.id
                        })
                    });
                    
                    if (response.ok) {
                        const result = await response.json();
                        setAnalysisProgress(prev => ({
                            ...prev,
                            lastResult: result.analysis
                        }));
                    }
                } catch (error) {
                    console.error('Erro na análise IA:', error);
                }
                
                // Aguardar 2 segundos entre análises para não sobrecarregar a API
                if (i < evaluationsToAnalyze.length - 1) {
                    setAnalysisProgress(prev => ({ ...prev, status: 'waiting', countdown: 2 }));
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
            
            setAnalysisProgress(prev => ({ ...prev, status: 'done' }));
            await fetchAllData();
            
            toast({
                title: "Análise concluída!",
                description: `${evaluationsToAnalyze.length} avaliações analisadas pela IA`
            });
        } catch (error) {
            console.error('Erro na análise IA:', error);
            toast({
                title: "Erro na análise",
                description: error instanceof Error ? error.message : "Erro desconhecido",
                variant: "destructive"
            });
            setAnalysisProgress(prev => ({ ...prev, status: 'idle' }));
        }
    }, [evaluations, fetchAllData, toast]);

    const stopAnalysis = useCallback(() => {
        setAnalysisProgress({
            current: 0,
            total: 0,
            evaluation: null,
            status: 'idle',
            countdown: 0,
            lastResult: null
        });
        
        toast({
            title: "Análise interrompida",
            description: "Processo de análise IA foi interrompido"
        });
    }, [toast]);

    const value: AuthContextType = {
        // Estado de autenticação
        user,
        authLoading,
        
        // Dados do sistema
        users,
        modules,
        attendants,
        evaluations,
        evaluationImports,
        attendantImports,
        funcoes,
        setores,
        gamificationConfig,
        seasons,
        
        // Estados de carregamento
        loading,
        
        // Funções de autenticação
        login,
        logout,
        
        // Funções de usuário
        createUser,
        updateUser,
        deleteUser,
        
        // Funções de módulo
        createModule,
        updateModule,
        deleteModule,
        
        // Funções de atendente
        createAttendant,
        updateAttendant,
        deleteAttendant,
        importAttendants,
        reverseAttendantImport,
        
        // Funções de avaliação
        createEvaluation,
        updateEvaluation,
        deleteEvaluation,
        importEvaluations,
        reverseEvaluationImport,
        
        // Funções de gamificação
        updateGamificationConfig,
        createSeason,
        updateSeason,
        deleteSeason,
        
        // Funções de RH
        createFuncao,
        createSetor,
        
        // Análise IA
        analysisProgress,
        startAnalysis,
        stopAnalysis,
        
        // Status de importação
        importStatus,
        
        // Função para recarregar dados
        fetchAllData
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = React.useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}