"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

export interface BackupMetadata {
  id: string;
  filename: string;
  filepath: string;
  size: number;
  checksum: string;
  createdAt: Date;
  createdBy?: string;
  status: 'success' | 'failed' | 'in_progress';
  duration: number;
  databaseVersion: string;
  schemaVersion: string;
}

export interface BackupOptions {
  filename?: string;
  directory?: string;
  includeData?: boolean;
  includeSchema?: boolean;
  compress?: boolean;
}

export interface BackupProgress {
  progress: number;
  message: string;
  status: 'idle' | 'in_progress' | 'completed' | 'failed';
  backupId?: string;
}

export function useBackupManager() {
  const { toast } = useToast();
  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [backupProgress, setBackupProgress] = useState<BackupProgress>({
    progress: 0,
    message: '',
    status: 'idle',
    backupId: undefined
  });

  // Buscar lista de backups
  const refreshBackups = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/backup/list');
      
      if (!response.ok) {
        throw new Error('Erro ao carregar lista de backups');
      }
      
      const data = await response.json();
      setBackups(data.backups || []);
    } catch (error) {
      console.error('Erro ao carregar backups:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar backups",
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Criar novo backup
  const createBackup = useCallback(async (options?: BackupOptions) => {
    try {
      setIsCreatingBackup(true);
      // Gerar ID temporário para o backup
      const tempBackupId = `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      setBackupProgress({
        progress: 0,
        message: 'Iniciando criação do backup...',
        status: 'in_progress',
        backupId: tempBackupId
      });

      const response = await fetch('/api/backup/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ options }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar backup');
      }

      const result = await response.json();
      
      setBackupProgress({
        progress: 100,
        message: 'Backup criado com sucesso!',
        status: 'completed',
        backupId: result.id || tempBackupId
      });

      toast({
        title: "Backup criado com sucesso!",
        description: `Arquivo: ${result.filename}`
      });

      // Atualizar lista de backups
      await refreshBackups();
      
      return result;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      setBackupProgress({
        progress: 0,
        message: 'Erro ao criar backup',
        status: 'failed',
        backupId: tempBackupId
      });
      
      toast({
        variant: "destructive",
        title: "Erro ao criar backup",
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
      throw error;
    } finally {
      setIsCreatingBackup(false);
      // Limpar progresso após 3 segundos
      setTimeout(() => {
        setBackupProgress({
          progress: 0,
          message: '',
          status: 'idle',
          backupId: undefined
        });
      }, 3000);
    }
  }, [toast, refreshBackups]);

  // Download de backup
  const downloadBackup = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup/download/${backupId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao baixar backup');
      }

      // Obter nome do arquivo do header
      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || `backup_${backupId}.sql`;

      // Criar blob e download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download iniciado",
        description: `Baixando arquivo: ${filename}`
      });
    } catch (error) {
      console.error('Erro ao baixar backup:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar backup",
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }, [toast]);

  // Excluir backup
  const deleteBackup = useCallback(async (backupId: string) => {
    try {
      const response = await fetch(`/api/backup/${backupId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao excluir backup');
      }

      toast({
        title: "Backup excluído",
        description: "O backup foi removido com sucesso"
      });

      // Atualizar lista de backups
      await refreshBackups();
    } catch (error) {
      console.error('Erro ao excluir backup:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir backup",
        description: error instanceof Error ? error.message : "Erro desconhecido"
      });
    }
  }, [toast, refreshBackups]);

  // Cancelar backup em progresso
  const cancelBackup = useCallback(async () => {
    if (!backupProgress.backupId || backupProgress.status !== 'in_progress') {
      return;
    }

    try {
      // Tentar cancelar via API (se implementado)
      const response = await fetch(`/api/backup/cancel/${backupProgress.backupId}`, {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: "Backup cancelado",
          description: "A operação foi interrompida com sucesso"
        });
      }
    } catch (error) {
      console.error('Erro ao cancelar backup:', error);
      // Continuar com cancelamento local mesmo se API falhar
    } finally {
      // Sempre limpar o progresso localmente
      setBackupProgress({
        progress: 0,
        message: 'Operação cancelada',
        status: 'idle',
        backupId: undefined
      });
      setIsCreatingBackup(false);
    }
  }, [backupProgress.backupId, backupProgress.status, toast]);

  // Atualizar progresso (callback para o componente BackupProgress)
  const updateProgress = useCallback((progress: number, message: string, status: string) => {
    setBackupProgress(prev => ({
      ...prev,
      progress,
      message,
      status: status as BackupProgress['status']
    }));
  }, []);

  return {
    backups,
    isLoading,
    isCreatingBackup,
    backupProgress,
    refreshBackups,
    createBackup,
    downloadBackup,
    deleteBackup,
    cancelBackup,
    updateProgress
  };
}