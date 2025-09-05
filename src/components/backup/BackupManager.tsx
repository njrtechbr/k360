"use client";

import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/providers/NotificationProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Database, History, Settings, Activity } from "lucide-react";
import { ROLES } from "@/lib/types";
import { CreateBackupForm } from "./CreateBackupForm";
import { BackupList } from "./BackupList";
import { BackupProgress } from "./BackupProgress";
import { BackupMonitoring } from "./BackupMonitoring";
import { useBackupManager } from "@/hooks/useBackupManager";

interface BackupManagerProps {
  // Props opcionais para flexibilidade futura
}

export function BackupManager({}: BackupManagerProps) {
  const { user, isAuthenticated } = useAuth();
  const { addNotification } = useNotifications();
  const {
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
  } = useBackupManager();

  // Controle de acesso baseado em roles
  const canCreateBackup = user?.role === ROLES.SUPERADMIN || user?.role === ROLES.ADMIN;
  const canViewBackups = user?.role === ROLES.SUPERADMIN || user?.role === ROLES.ADMIN || user?.role === ROLES.SUPERVISOR;
  const canDeleteBackup = user?.role === ROLES.SUPERADMIN || user?.role === ROLES.ADMIN;

  useEffect(() => {
    if (isAuthenticated && canViewBackups) {
      refreshBackups();
    }
  }, [isAuthenticated, canViewBackups, refreshBackups]);

  // Handlers com notificações integradas
  const handleCreateBackup = async (options: any) => {
    try {
      await createBackup(options);
      addNotification({
        type: 'success',
        title: 'Backup Iniciado',
        message: 'O processo de backup foi iniciado com sucesso. Você será notificado quando concluído.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro ao Criar Backup',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao criar backup'
      });
    }
  };

  const handleDownloadBackup = async (backupId: string) => {
    try {
      await downloadBackup(backupId);
      addNotification({
        type: 'success',
        title: 'Download Iniciado',
        message: 'O download do backup foi iniciado com sucesso.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro no Download',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao fazer download'
      });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    try {
      await deleteBackup(backupId);
      addNotification({
        type: 'success',
        title: 'Backup Excluído',
        message: 'O backup foi excluído com sucesso.'
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Erro ao Excluir',
        message: error instanceof Error ? error.message : 'Erro desconhecido ao excluir backup'
      });
    }
  };

  if (!isAuthenticated) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Você precisa estar autenticado para acessar o sistema de backup.
        </AlertDescription>
      </Alert>
    );
  }

  if (!canViewBackups) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para acessar o sistema de backup. Apenas administradores e supervisores podem visualizar backups.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-heading flex items-center gap-2">
            <Database className="h-8 w-8" />
            Sistema de Backup
          </h1>
          <p className="text-muted-foreground">
            Gerencie backups do banco de dados do sistema de gamificação
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          Nível de acesso: {user?.role}
        </div>
      </div>

      {/* Progress indicator - sempre visível quando há operação em andamento */}
      {isCreatingBackup && (
        <BackupProgress
          isActive={isCreatingBackup}
          progress={backupProgress.progress}
          message={backupProgress.message}
          backupId={backupProgress.backupId}
          onCancel={cancelBackup}
          onProgressUpdate={updateProgress}
        />
      )}

      {/* Main content */}
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Lista de Backups
          </TabsTrigger>
          {canCreateBackup && (
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              Criar Backup
            </TabsTrigger>
          )}
          <TabsTrigger value="monitoring" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Monitoramento
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <BackupList
            backups={backups}
            isLoading={isLoading}
            canDelete={canDeleteBackup}
            onDownload={handleDownloadBackup}
            onDelete={handleDeleteBackup}
            onRefresh={refreshBackups}
          />
        </TabsContent>

        {canCreateBackup && (
          <TabsContent value="create" className="space-y-4">
            <CreateBackupForm
              onBackupCreated={refreshBackups}
              isCreating={isCreatingBackup}
              onCreateBackup={handleCreateBackup}
            />
          </TabsContent>
        )}

        <TabsContent value="monitoring" className="space-y-4">
          <BackupMonitoring />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configurações gerais do sistema de backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Diretório de Backup:</strong>
                    <p className="text-muted-foreground">/app/backups</p>
                  </div>
                  <div>
                    <strong>Retenção:</strong>
                    <p className="text-muted-foreground">30 dias</p>
                  </div>
                  <div>
                    <strong>Tamanho Máximo:</strong>
                    <p className="text-muted-foreground">10 GB</p>
                  </div>
                  <div>
                    <strong>Compressão:</strong>
                    <p className="text-muted-foreground">Habilitada</p>
                  </div>
                </div>
                <Alert>
                  <AlertDescription>
                    As configurações do sistema são gerenciadas através de variáveis de ambiente.
                    Entre em contato com o administrador do sistema para alterações.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}