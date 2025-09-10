"use client";

import { useContext } from "react";
import { AuthContext } from "@/providers/AuthProvider";

// Hook que usa o AuthProvider para acessar todos os dados e funcionalidades
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  
  return {
    // Compatibilidade com a interface antiga
    user: context.user,
    isAuthenticated: !!context.user,
    authLoading: context.authLoading,
    appLoading: context.loading,
    loading: context.loading,
    
    // Dados do sistema
    modules: context.modules || [],
    attendants: context.attendants || [],
    evaluations: context.evaluations || [],
    evaluationImports: context.evaluationImports || [],
    attendantImports: context.attendantImports || [],
    funcoes: context.funcoes || [],
    setores: context.setores || [],
    gamificationConfig: context.gamificationConfig,
    seasons: context.seasons || [],
    users: context.users || [],
    allUsers: context.users || [], // Alias para compatibilidade
    
    // Funções de autenticação
    login: context.login,
    logout: context.logout,
    
    // Funções de usuário
    createUser: context.createUser,
    updateUser: context.updateUser,
    deleteUser: context.deleteUser,
    
    // Funções de módulo
    createModule: context.createModule,
    updateModule: context.updateModule,
    deleteModule: context.deleteModule,
    
    // Funções de atendente
    createAttendant: context.createAttendant,
    updateAttendant: context.updateAttendant,
    deleteAttendant: context.deleteAttendant,
    importAttendants: context.importAttendants,
    reverseAttendantImport: context.reverseAttendantImport,
    
    // Funções de avaliação
    createEvaluation: context.createEvaluation,
    updateEvaluation: context.updateEvaluation,
    deleteEvaluation: context.deleteEvaluation,
    deleteEvaluations: async (evaluationIds: string[], progressTitle?: string) => {
      // Implementar delete múltiplo baseado no delete individual
      for (const id of evaluationIds) {
        await context.deleteEvaluation(id);
      }
    },
    importEvaluations: context.importEvaluations,
    reverseEvaluationImport: context.reverseEvaluationImport,
    revertEvaluationImport: context.reverseEvaluationImport, // Alias para compatibilidade
    
    // Funções de gamificação
    updateGamificationConfig: context.updateGamificationConfig,
    createSeason: context.createSeason,
    updateSeason: context.updateSeason,
    deleteSeason: context.deleteSeason,
    
    // Funções de RH
    createFuncao: context.createFuncao,
    createSetor: context.createSetor,
    
    // Análise IA
    analysisProgress: context.analysisProgress,
    startAnalysis: context.startAnalysis,
    runAiAnalysis: context.startAnalysis, // Alias para compatibilidade
    stopAnalysis: context.stopAnalysis,
    aiAnalysisResults: [], // TODO: Implementar no AuthProvider
    lastAiAnalysis: null, // TODO: Implementar no AuthProvider
    isAiAnalysisRunning: context.analysisProgress.status !== 'idle',
    
    // Status de importação/processamento
    importStatus: context.importStatus,
    isProcessing: context.importStatus.isProcessing,
    isProgressModalOpen: context.importStatus.isOpen,
    setIsProgressModalOpen: (open: boolean) => {
      // TODO: Implementar no AuthProvider se necessário
    },
    
    // Função para recarregar dados
    fetchAllData: context.fetchAllData,
    refetch: context.fetchAllData, // Alias para compatibilidade
    
    // Dados adicionais que podem ser necessários
    activeSeason: context.seasons?.find(s => s.active) || null,
    xpEvents: [], // TODO: Implementar se necessário
    
    // Compatibilidade com erros
    error: null
  };
};