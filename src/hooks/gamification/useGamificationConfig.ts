"use client";

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ConfigService, type GamificationSettings } from '@/services/gamification';
import type { GamificationConfig, AchievementConfig, LevelTrackConfig } from '@/lib/types';

export interface UseGamificationConfigReturn {
  // Estado
  config: GamificationSettings;
  isLoading: boolean;
  error: string | null;
  
  // Ações
  updateGamificationConfig: (config: Partial<GamificationConfig>) => Promise<void>;
  updateAchievementConfig: (config: Partial<AchievementConfig>) => Promise<void>;
  updateLevelTrackConfig: (config: Partial<LevelTrackConfig>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  validateConfig: () => { isValid: boolean; errors: string[]; warnings: string[] };
  exportConfig: () => string;
  importConfig: (configJson: string) => Promise<boolean>;
  refreshConfig: () => Promise<void>;
}

export function useGamificationConfig(): UseGamificationConfigReturn {
  const [config, setConfig] = useState<GamificationSettings>({
    gamificationConfig: ConfigService.getDefaultGamificationConfig(),
    achievementConfig: ConfigService.getDefaultAchievementConfig(),
    levelTrackConfig: ConfigService.getDefaultLevelTrackConfig()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Buscar configurações da API
  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gamification/config');
      if (!response.ok) {
        throw new Error(`Erro na API: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Mesclar com valores padrão
      const mergedConfig: GamificationSettings = {
        gamificationConfig: ConfigService.mergeWithDefaults(
          data.gamificationConfig || {},
          ConfigService.getDefaultGamificationConfig()
        ),
        achievementConfig: ConfigService.mergeWithDefaults(
          data.achievementConfig || {},
          ConfigService.getDefaultAchievementConfig()
        ),
        levelTrackConfig: ConfigService.mergeWithDefaults(
          data.levelTrackConfig || {},
          ConfigService.getDefaultLevelTrackConfig()
        )
      };
      
      setConfig(mergedConfig);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(errorMessage);
      console.error('Erro ao buscar configurações de gamificação:', err);
      
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de gamificação.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Carregar configurações na inicialização
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Atualizar configuração de gamificação
  const updateGamificationConfig = useCallback(async (newConfig: Partial<GamificationConfig>) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'gamification',
          config: newConfig
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração de gamificação');
      }
      
      // Atualizar estado local
      setConfig(prev => ({
        ...prev,
        gamificationConfig: { ...prev.gamificationConfig, ...newConfig }
      }));
      
      toast({
        title: 'Configuração Salva!',
        description: 'As configurações de gamificação foram atualizadas.'
      });
    } catch (err) {
      console.error('Erro ao atualizar configuração de gamificação:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Atualizar configuração de conquistas
  const updateAchievementConfig = useCallback(async (newConfig: Partial<AchievementConfig>) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'achievement',
          config: newConfig
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração de conquistas');
      }
      
      // Atualizar estado local
      setConfig(prev => ({
        ...prev,
        achievementConfig: { ...prev.achievementConfig, ...newConfig }
      }));
      
      toast({
        title: 'Configuração Salva!',
        description: 'As configurações de conquistas foram atualizadas.'
      });
    } catch (err) {
      console.error('Erro ao atualizar configuração de conquistas:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Atualizar configuração de trilha de níveis
  const updateLevelTrackConfig = useCallback(async (newConfig: Partial<LevelTrackConfig>) => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/api/gamification/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'levelTrack',
          config: newConfig
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao atualizar configuração de trilha de níveis');
      }
      
      // Atualizar estado local
      setConfig(prev => ({
        ...prev,
        levelTrackConfig: { ...prev.levelTrackConfig, ...newConfig }
      }));
      
      toast({
        title: 'Configuração Salva!',
        description: 'As configurações de trilha de níveis foram atualizadas.'
      });
    } catch (err) {
      console.error('Erro ao atualizar configuração de trilha de níveis:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar as configurações.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Resetar para valores padrão
  const resetToDefaults = useCallback(async () => {
    try {
      setIsLoading(true);
      
      const defaultConfig: GamificationSettings = {
        gamificationConfig: ConfigService.getDefaultGamificationConfig(),
        achievementConfig: ConfigService.getDefaultAchievementConfig(),
        levelTrackConfig: ConfigService.getDefaultLevelTrackConfig()
      };
      
      const response = await fetch('/api/gamification/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'reset',
          config: defaultConfig
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao resetar configurações');
      }
      
      setConfig(defaultConfig);
      
      toast({
        title: 'Configurações Resetadas!',
        description: 'Todas as configurações foram restauradas para os valores padrão.'
      });
    } catch (err) {
      console.error('Erro ao resetar configurações:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível resetar as configurações.'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Validar configuração atual
  const validateConfig = useCallback(() => {
    return ConfigService.validateAllConfigs(config);
  }, [config]);

  // Exportar configuração
  const exportConfig = useCallback(() => {
    return ConfigService.exportConfig(config);
  }, [config]);

  // Importar configuração
  const importConfig = useCallback(async (configJson: string) => {
    try {
      const importResult = ConfigService.importConfig(configJson);
      
      if (!importResult.success) {
        toast({
          variant: 'destructive',
          title: 'Erro na Importação',
          description: importResult.error
        });
        return false;
      }
      
      if (!importResult.settings) {
        throw new Error('Configurações não encontradas no resultado da importação');
      }
      
      // Salvar configurações importadas
      const response = await fetch('/api/gamification/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'import',
          config: importResult.settings
        })
      });
      
      if (!response.ok) {
        throw new Error('Falha ao salvar configurações importadas');
      }
      
      setConfig(importResult.settings);
      
      toast({
        title: 'Configurações Importadas!',
        description: 'As configurações foram importadas e salvas com sucesso.'
      });
      
      return true;
    } catch (err) {
      console.error('Erro ao importar configurações:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível importar as configurações.'
      });
      return false;
    }
  }, [toast]);

  // Atualizar configurações manualmente
  const refreshConfig = useCallback(async () => {
    await fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    isLoading,
    error,
    updateGamificationConfig,
    updateAchievementConfig,
    updateLevelTrackConfig,
    resetToDefaults,
    validateConfig,
    exportConfig,
    importConfig,
    refreshConfig
  };
}