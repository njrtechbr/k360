"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileText,
  Users,
  BarChart3,
  Settings,
  Download,
  Upload,
  Zap,
  Trophy,
  Calendar,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { ROLES } from "@/lib/types";

interface QuickActionsProps {
  userRole: string;
  stats?: {
    pendingEvaluations?: number;
    newAchievements?: number;
    activeSeasons?: number;
  };
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  variant: "default" | "outline" | "secondary";
  color: string;
  badge?: {
    text: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  };
  requiredRoles?: string[];
}

export function QuickActions({ userRole, stats }: QuickActionsProps) {
  const quickActions: QuickAction[] = [
    {
      id: "add-attendant",
      title: "Novo Atendente",
      description: "Cadastrar novo membro da equipe",
      icon: Users,
      href: "/dashboard/rh/atendentes/novo",
      variant: "default",
      color: "text-blue-500",
      requiredRoles: [ROLES.ADMIN, ROLES.SUPERADMIN],
    },
    {
      id: "new-evaluation",
      title: "Nova Avaliação",
      description: "Registrar avaliação de atendimento",
      icon: MessageSquare,
      href: "/dashboard/pesquisa-satisfacao/avaliacoes/nova",
      variant: "default",
      color: "text-green-500",
    },
    {
      id: "view-reports",
      title: "Relatórios",
      description: "Visualizar relatórios e análises",
      icon: BarChart3,
      href: "/dashboard/pesquisa-satisfacao/relatorios",
      variant: "outline",
      color: "text-purple-500",
    },
    {
      id: "gamification",
      title: "Gamificação",
      description: "Gerenciar conquistas e temporadas",
      icon: Trophy,
      href: "/dashboard/gamificacao",
      variant: "outline",
      color: "text-amber-500",
      badge: stats?.newAchievements
        ? {
            text: `${stats.newAchievements} novas`,
            variant: "secondary",
          }
        : undefined,
    },
    {
      id: "import-data",
      title: "Importar Dados",
      description: "Importar avaliações via CSV",
      icon: Upload,
      href: "/dashboard/pesquisa-satisfacao/importar",
      variant: "outline",
      color: "text-indigo-500",
      requiredRoles: [ROLES.ADMIN, ROLES.SUPERADMIN],
    },
    {
      id: "export-data",
      title: "Exportar Dados",
      description: "Baixar relatórios em Excel/PDF",
      icon: Download,
      href: "/dashboard/pesquisa-satisfacao/exportar",
      variant: "outline",
      color: "text-teal-500",
    },
    {
      id: "manage-seasons",
      title: "Temporadas",
      description: "Gerenciar temporadas de gamificação",
      icon: Calendar,
      href: "/dashboard/gamificacao/temporadas",
      variant: "secondary",
      color: "text-orange-500",
      badge: stats?.activeSeasons
        ? {
            text: `${stats.activeSeasons} ativas`,
            variant: "outline",
          }
        : undefined,
      requiredRoles: [ROLES.ADMIN, ROLES.SUPERADMIN],
    },
    {
      id: "system-settings",
      title: "Configurações",
      description: "Configurar sistema e permissões",
      icon: Settings,
      href: "/dashboard/configuracoes",
      variant: "secondary",
      color: "text-gray-500",
      requiredRoles: [ROLES.ADMIN, ROLES.SUPERADMIN],
    },
    {
      id: "xp-management",
      title: "XP Avulso",
      description: "Conceder XP manual aos atendentes",
      icon: Zap,
      href: "/dashboard/gamificacao/xp-avulso",
      variant: "outline",
      color: "text-yellow-500",
      requiredRoles: [ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.SUPERVISOR],
    },
  ];

  // Filtrar ações baseadas no role do usuário
  const availableActions = quickActions.filter((action) => {
    if (!action.requiredRoles) return true;
    return action.requiredRoles.includes(userRole);
  });

  // Organizar ações por categoria
  const primaryActions = availableActions.filter(
    (action) => action.variant === "default",
  );
  const secondaryActions = availableActions.filter(
    (action) => action.variant === "outline",
  );
  const utilityActions = availableActions.filter(
    (action) => action.variant === "secondary",
  );

  const renderActionButton = (action: QuickAction) => (
    <Button
      key={action.id}
      asChild
      variant={action.variant}
      className="h-auto p-4 flex flex-col items-start gap-2 relative"
    >
      <Link href={action.href}>
        <div className="flex items-center justify-between w-full">
          <action.icon className={`h-5 w-5 ${action.color}`} />
          {action.badge && (
            <Badge variant={action.badge.variant} className="text-xs">
              {action.badge.text}
            </Badge>
          )}
        </div>
        <div className="text-left">
          <div className="font-medium text-sm">{action.title}</div>
          <div className="text-xs text-muted-foreground">
            {action.description}
          </div>
        </div>
      </Link>
    </Button>
  );

  return (
    <div className="space-y-6">
      {/* Ações Principais */}
      {primaryActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>Tarefas mais comuns do dia a dia</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {primaryActions.map(renderActionButton)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Secundárias */}
      {secondaryActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatórios e Análises
            </CardTitle>
            <CardDescription>Visualizar dados e métricas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {secondaryActions.map(renderActionButton)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ações Utilitárias */}
      {utilityActions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Administração
            </CardTitle>
            <CardDescription>Configurações e gerenciamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {utilityActions.map(renderActionButton)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem para usuários com acesso limitado */}
      {availableActions.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ações Disponíveis</CardTitle>
            <CardDescription>Baseado no seu nível de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma ação rápida disponível para seu nível de acesso atual.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Entre em contato com um administrador para solicitar permissões
                adicionais.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
