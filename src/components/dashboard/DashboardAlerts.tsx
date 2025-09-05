"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  TrendingDown,
  TrendingUp,
  Users
} from "lucide-react";
import Link from "next/link";

interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  priority: 'low' | 'medium' | 'high';
  timestamp: Date;
}

interface DashboardAlertsProps {
  alerts: DashboardAlert[];
  stats?: {
    totalEvaluations: number;
    totalAttendants: number;
    averageRating: number;
    recentTrend: 'up' | 'down' | 'stable';
  };
}

const getAlertIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="h-4 w-4" />;
    case 'error':
      return <XCircle className="h-4 w-4" />;
    case 'success':
      return <CheckCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

const getAlertVariant = (type: string) => {
  switch (type) {
    case 'warning':
      return 'default' as const;
    case 'error':
      return 'destructive' as const;
    default:
      return 'default' as const;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
  }
};

export function DashboardAlerts({ alerts, stats }: DashboardAlertsProps) {
  // Gerar alertas automáticos baseados nas estatísticas
  const generateSystemAlerts = (): DashboardAlert[] => {
    const systemAlerts: DashboardAlert[] = [];

    if (stats) {
      // Alerta de nota média baixa
      if (stats.averageRating < 3.0) {
        systemAlerts.push({
          id: 'low-rating',
          type: 'warning',
          title: 'Nota Média Baixa',
          description: `A nota média geral está em ${stats.averageRating.toFixed(1)}/5.0. Considere revisar os processos de atendimento.`,
          action: {
            label: 'Ver Relatórios',
            href: '/dashboard/pesquisa-satisfacao/relatorios'
          },
          priority: 'high',
          timestamp: new Date()
        });
      }

      // Alerta de tendência negativa
      if (stats.recentTrend === 'down') {
        systemAlerts.push({
          id: 'negative-trend',
          type: 'warning',
          title: 'Tendência Negativa',
          description: 'As avaliações recentes mostram uma tendência de queda. Monitore de perto.',
          action: {
            label: 'Analisar Tendência',
            href: '/dashboard/pesquisa-satisfacao/analises'
          },
          priority: 'medium',
          timestamp: new Date()
        });
      }

      // Alerta de poucos atendentes
      if (stats.totalAttendants < 5) {
        systemAlerts.push({
          id: 'few-attendants',
          type: 'info',
          title: 'Poucos Atendentes Cadastrados',
          description: `Apenas ${stats.totalAttendants} atendentes cadastrados. Considere adicionar mais membros da equipe.`,
          action: {
            label: 'Gerenciar Atendentes',
            href: '/dashboard/rh/atendentes'
          },
          priority: 'low',
          timestamp: new Date()
        });
      }

      // Alerta de tendência positiva
      if (stats.recentTrend === 'up' && stats.averageRating >= 4.0) {
        systemAlerts.push({
          id: 'positive-trend',
          type: 'success',
          title: 'Excelente Performance!',
          description: `Nota média de ${stats.averageRating.toFixed(1)}/5.0 com tendência crescente. Parabéns à equipe!`,
          priority: 'low',
          timestamp: new Date()
        });
      }
    }

    return systemAlerts;
  };

  const allAlerts = [...alerts, ...generateSystemAlerts()];
  const sortedAlerts = allAlerts.sort((a, b) => {
    // Ordenar por prioridade e depois por timestamp
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return b.timestamp.getTime() - a.timestamp.getTime();
  });

  if (sortedAlerts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            Sistema Funcionando Normalmente
          </CardTitle>
          <CardDescription>Nenhum alerta ou notificação no momento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Última verificação: {new Date().toLocaleTimeString('pt-BR')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertas e Notificações
          </div>
          <Badge variant="outline">
            {sortedAlerts.length} {sortedAlerts.length === 1 ? 'alerta' : 'alertas'}
          </Badge>
        </CardTitle>
        <CardDescription>Informações importantes sobre o sistema</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedAlerts.slice(0, 5).map((alert) => (
          <Alert key={alert.id} variant={getAlertVariant(alert.type)}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTitle className="text-sm font-medium">
                      {alert.title}
                    </AlertTitle>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getPriorityColor(alert.priority)}`}
                    >
                      {alert.priority === 'high' ? 'Alta' : 
                       alert.priority === 'medium' ? 'Média' : 'Baixa'}
                    </Badge>
                  </div>
                  <AlertDescription className="text-sm">
                    {alert.description}
                  </AlertDescription>
                  {alert.action && (
                    <div className="mt-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={alert.action.href}>
                          {alert.action.label}
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground ml-2">
                {alert.timestamp.toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </div>
            </div>
          </Alert>
        ))}
        
        {sortedAlerts.length > 5 && (
          <div className="text-center pt-2">
            <Button variant="ghost" size="sm">
              Ver todos os alertas ({sortedAlerts.length - 5} restantes)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}