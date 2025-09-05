"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { 
  Database, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  X, 
  Clock,
  Activity,
  AlertTriangle,
  Info,
  Wifi,
  WifiOff,
  Pause,
  Play
} from "lucide-react";

interface BackupProgressProps {
  isActive: boolean;
  progress: number;
  message: string;
  backupId?: string;
  onCancel?: () => void;
  onProgressUpdate?: (progress: number, message: string, status: string) => void;
}

interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: string;
}

interface BackupStatus {
  status: 'in_progress' | 'completed' | 'failed';
  progress: number;
  message: string;
  elapsedTime?: {
    total: number;
    formatted: string;
  };
  lastUpdate?: string;
}

export function BackupProgress({ 
  isActive, 
  progress, 
  message, 
  backupId,
  onCancel,
  onProgressUpdate
}: BackupProgressProps) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [isPaused, setIsPaused] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<BackupStatus | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const pollingInterval = 2000; // 2 segundos

  // Adicionar log com detalhes
  const addLog = useCallback((level: LogEntry['level'], message: string, details?: string) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      details
    };
    
    setLogs(prev => {
      const updated = [...prev, newLog];
      // Manter apenas os últimos 50 logs para performance
      return updated.slice(-50);
    });
  }, []);

  // Função para fazer polling do status
  const pollBackupStatus = useCallback(async () => {
    if (!backupId || isPaused) return;

    try {
      setConnectionStatus('connected');
      const response = await fetch(`/api/backup/status/${backupId}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        const status: BackupStatus = {
          status: data.status,
          progress: data.progress,
          message: data.message,
          elapsedTime: data.elapsedTime,
          lastUpdate: data.lastUpdate
        };

        setCurrentStatus(status);
        
        // Atualizar progresso via callback
        if (onProgressUpdate) {
          onProgressUpdate(status.progress, status.message, status.status);
        }

        // Adicionar log se houve mudança significativa
        const progressChanged = Math.abs(status.progress - progress) >= 5;
        const messageChanged = status.message !== message;
        
        if (progressChanged || messageChanged) {
          addLog('info', status.message, `Progresso: ${status.progress}%`);
        }

        // Parar polling se completou ou falhou
        if (status.status === 'completed' || status.status === 'failed') {
          setIsPolling(false);
          addLog(
            status.status === 'completed' ? 'success' : 'error',
            status.status === 'completed' 
              ? 'Backup concluído com sucesso!' 
              : 'Backup falhou durante a execução',
            status.elapsedTime?.formatted ? `Tempo total: ${status.elapsedTime.formatted}` : undefined
          );
        }

        retryCountRef.current = 0; // Reset retry count on success
      } else {
        throw new Error(data.error || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('Erro no polling:', error);
      setConnectionStatus('error');
      
      retryCountRef.current++;
      
      if (retryCountRef.current <= maxRetries) {
        addLog('warning', `Erro de conexão (tentativa ${retryCountRef.current}/${maxRetries})`, 
              error instanceof Error ? error.message : 'Erro desconhecido');
        
        // Aumentar intervalo de retry exponencialmente
        setTimeout(() => {
          if (isPolling && !isPaused) {
            pollBackupStatus();
          }
        }, Math.min(1000 * Math.pow(2, retryCountRef.current), 10000));
      } else {
        addLog('error', 'Falha na conexão após múltiplas tentativas', 
              'Verifique sua conexão de rede');
        setIsPolling(false);
        toast({
          variant: "destructive",
          title: "Erro de conexão",
          description: "Não foi possível obter atualizações de progresso"
        });
      }
    }
  }, [backupId, isPaused, progress, message, onProgressUpdate, addLog, toast]);

  // Iniciar/parar polling
  useEffect(() => {
    if (isActive && backupId && isPolling && !isPaused) {
      pollingIntervalRef.current = setInterval(pollBackupStatus, pollingInterval);
      addLog('info', 'Monitoramento de progresso iniciado', `Atualizações a cada ${pollingInterval/1000}s`);
    } else if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [isActive, backupId, isPolling, isPaused, pollBackupStatus, addLog]);

  // Inicializar logs e polling quando backup inicia
  useEffect(() => {
    if (isActive && !startTime) {
      setStartTime(new Date());
      setLogs([{
        timestamp: new Date(),
        level: 'info',
        message: 'Iniciando processo de backup...',
        details: backupId ? `ID: ${backupId}` : undefined
      }]);
      
      if (backupId) {
        setIsPolling(true);
        addLog('info', 'Sistema de monitoramento ativado', 'Polling em tempo real iniciado');
      }
    }

    if (!isActive && startTime) {
      setStartTime(null);
      setElapsedTime(0);
      setIsPolling(false);
      setConnectionStatus('disconnected');
      setCurrentStatus(null);
      retryCountRef.current = 0;
    }
  }, [isActive, startTime, backupId, addLog]);

  // Atualizar tempo decorrido
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isActive && startTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, startTime]);

  // Função para cancelar operação
  const handleCancel = useCallback(async () => {
    if (!backupId) {
      if (onCancel) onCancel();
      return;
    }

    try {
      addLog('warning', 'Solicitando cancelamento da operação...', 'Aguarde a confirmação');
      
      // Aqui você implementaria a chamada para cancelar o backup
      // Por enquanto, vamos simular o cancelamento
      const response = await fetch(`/api/backup/cancel/${backupId}`, {
        method: 'POST',
      });

      if (response.ok) {
        addLog('info', 'Operação cancelada com sucesso', 'O backup foi interrompido');
        setIsPolling(false);
        if (onCancel) onCancel();
      } else {
        throw new Error('Falha ao cancelar operação');
      }
    } catch (error) {
      addLog('error', 'Erro ao cancelar operação', 
            error instanceof Error ? error.message : 'Erro desconhecido');
      
      // Fallback: chamar onCancel mesmo se a API falhar
      if (onCancel) onCancel();
    }
  }, [backupId, onCancel, addLog]);

  // Pausar/retomar polling
  const togglePolling = useCallback(() => {
    setIsPaused(prev => {
      const newPaused = !prev;
      addLog('info', newPaused ? 'Monitoramento pausado' : 'Monitoramento retomado', 
            newPaused ? 'Atualizações suspensas' : 'Atualizações reativadas');
      return newPaused;
    });
  }, [addLog]);

  const getLogLevel = (progress: number): LogEntry['level'] => {
    if (progress === 100) return 'success';
    if (progress > 80) return 'info';
    if (progress > 50) return 'info';
    return 'info';
  };



  const getStatusIcon = () => {
    if (progress === 100) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (isActive) {
      return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
    }
    return <Database className="h-5 w-5 text-gray-500" />;
  };

  const getStatusBadge = () => {
    if (progress === 100) {
      return <Badge className="bg-green-100 text-green-800">Concluído</Badge>;
    }
    if (isActive) {
      return <Badge variant="secondary">Em Progresso</Badge>;
    }
    return <Badge variant="outline">Aguardando</Badge>;
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getLogIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  if (!isActive && progress === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <CardTitle className="text-lg">
                {progress === 100 ? 'Backup Concluído' : 'Criando Backup'}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                {getStatusBadge()}
                {isActive && (
                  <span className="flex items-center gap-1 text-sm">
                    <Clock className="h-3 w-3" />
                    {formatTime(elapsedTime)}
                  </span>
                )}
                {/* Indicador de conexão */}
                {isActive && backupId && (
                  <span className="flex items-center gap-1 text-xs">
                    {connectionStatus === 'connected' && !isPaused && (
                      <><Wifi className="h-3 w-3 text-green-500" /> Online</>
                    )}
                    {connectionStatus === 'disconnected' && (
                      <><WifiOff className="h-3 w-3 text-gray-500" /> Offline</>
                    )}
                    {connectionStatus === 'error' && (
                      <><WifiOff className="h-3 w-3 text-red-500" /> Erro</>
                    )}
                    {isPaused && (
                      <><Pause className="h-3 w-3 text-yellow-500" /> Pausado</>
                    )}
                  </span>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Controles de monitoramento */}
            {isActive && backupId && progress < 100 && (
              <Button
                variant="outline"
                size="sm"
                onClick={togglePolling}
                className="text-blue-600 hover:text-blue-700"
              >
                {isPaused ? (
                  <><Play className="h-4 w-4 mr-1" /> Retomar</>
                ) : (
                  <><Pause className="h-4 w-4 mr-1" /> Pausar</>
                )}
              </Button>
            )}
            {/* Botão de cancelar */}
            {onCancel && isActive && progress < 100 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barra de progresso */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-2"
          />
        </div>

        {/* Mensagem atual */}
        {message && (
          <Alert>
            <Activity className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Logs detalhados */}
        {logs.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Log de Operações ({logs.length})
              </h4>
              <div className="flex items-center gap-2">
                {isActive && backupId && (
                  <Badge variant="outline" className="text-xs">
                    {isPolling && !isPaused ? 'Monitorando' : 'Pausado'}
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLogs([])}
                  className="text-xs h-6 px-2"
                >
                  Limpar
                </Button>
              </div>
            </div>
            <Card className="bg-background">
              <CardContent className="p-3">
                <ScrollArea className="h-40">
                  <div className="space-y-2">
                    {logs.map((log, index) => (
                      <div key={index} className="flex items-start gap-2 text-xs border-b border-border/50 pb-2 last:border-0">
                        {getLogIcon(log.level)}
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground font-mono">
                              {log.timestamp.toLocaleTimeString('pt-BR')}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                log.level === 'success' ? 'text-green-600 border-green-200' :
                                log.level === 'error' ? 'text-red-600 border-red-200' :
                                log.level === 'warning' ? 'text-yellow-600 border-yellow-200' :
                                'text-blue-600 border-blue-200'
                              }`}
                            >
                              {log.level.toUpperCase()}
                            </Badge>
                          </div>
                          <p className="text-foreground">{log.message}</p>
                          {log.details && (
                            <p className="text-muted-foreground text-xs italic">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estatísticas da operação */}
        {isActive && (
          <div className="grid grid-cols-4 gap-4 text-sm">
            <div className="text-center p-2 bg-background rounded">
              <p className="text-muted-foreground">Tempo Decorrido</p>
              <p className="font-medium">{formatTime(elapsedTime)}</p>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <p className="text-muted-foreground">Progresso</p>
              <p className="font-medium">{progress}%</p>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <p className="text-muted-foreground">Status</p>
              <p className="font-medium">
                {progress === 100 ? 'Concluído' : 'Processando'}
              </p>
            </div>
            <div className="text-center p-2 bg-background rounded">
              <p className="text-muted-foreground">Conexão</p>
              <p className={`font-medium ${
                connectionStatus === 'connected' ? 'text-green-600' :
                connectionStatus === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {connectionStatus === 'connected' && !isPaused ? 'Online' :
                 connectionStatus === 'error' ? 'Erro' :
                 isPaused ? 'Pausado' : 'Offline'}
              </p>
            </div>
          </div>
        )}

        {/* Informações detalhadas do status atual */}
        {currentStatus && currentStatus.elapsedTime && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-1">
                <p><strong>Status do servidor:</strong> {currentStatus.message}</p>
                <p><strong>Tempo no servidor:</strong> {currentStatus.elapsedTime.formatted}</p>
                {currentStatus.lastUpdate && (
                  <p><strong>Última atualização:</strong> {new Date(currentStatus.lastUpdate).toLocaleTimeString('pt-BR')}</p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Informações adicionais quando concluído */}
        {progress === 100 && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Backup criado com sucesso! O arquivo está disponível para download na lista de backups.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}