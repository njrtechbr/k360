"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { XpGrantHistory } from "@/components/gamification/xp/XpGrantHistory";
import {
  History,
  TrendingUp,
  Users,
  Star,
  Award,
  BarChart3,
  Calendar,
} from "lucide-react";
import { ROLES } from "@/lib/types";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

interface GrantStatistics {
  success: boolean;
  data: {
    period: {
      value: string;
      days: number;
      label: string;
    };
    overview: {
      totalGrants: number;
      totalPoints: number;
      averagePoints: number;
      dailyAverageGrants: number;
      dailyAveragePoints: number;
    };
    grantsByType: Array<{
      typeId: string;
      typeName: string;
      count: number;
      totalPoints: number;
      averagePoints: number;
      percentage: number;
    }>;
    grantsByGranter: Array<{
      granterId: string;
      granterName: string;
      count: number;
      totalPoints: number;
      averagePoints: number;
      percentage: number;
    }>;
    trends: {
      mostUsedType: string | null;
      mostActiveGranter: string | null;
      averageGrantsPerGranter: number;
    };
  };
}

export default function HistoricoXpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [statistics, setStatistics] = useState<GrantStatistics["data"] | null>(
    null,
  );
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("30d");

  const user = session?.user;
  const isAuthenticated = !!session;
  const loading = status === "loading";

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  useEffect(() => {
    if (user && (user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN)) {
      fetchStatistics();
    }
  }, [user, selectedPeriod]);

  const fetchStatistics = async () => {
    try {
      setIsLoadingStats(true);
      const response = await fetch(
        `/api/gamification/xp-grants/statistics?period=${selectedPeriod}`,
      );

      if (response.ok) {
        const result: GrantStatistics = await response.json();
        if (result.success) {
          setStatistics(result.data);
        } else {
          throw new Error("Falha ao obter estatísticas");
        }
      } else {
        toast({
          title: "Erro",
          description: "Erro ao carregar estatísticas",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas",
        variant: "destructive",
      });
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  // Verificar permissões
  const canViewHistory =
    user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;

  if (!canViewHistory) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-muted-foreground">
            Acesso Restrito
          </h1>
          <p className="text-muted-foreground">
            Você não tem permissão para visualizar o histórico de XP avulso.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/gamificacao">Voltar para Gamificação</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Histórico de XP Avulso</h1>
          <p className="text-muted-foreground">
            Visualize e audite todas as concessões de XP avulso realizadas no
            sistema
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/gamificacao/conceder-xp">
              <Star className="h-4 w-4 mr-2" />
              Conceder XP
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard/gamificacao">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </Link>
          </Button>
        </div>
      </div>

      {/* Estatísticas Resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                <History size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Total de Concessões
                </p>
                {isLoadingStats ? (
                  <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold">
                    {statistics?.overview.totalGrants || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 text-green-600">
                <Star size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de Pontos</p>
                {isLoadingStats ? (
                  <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold">
                    {statistics?.overview.totalPoints.toLocaleString() || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-100 text-yellow-600">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Média de Pontos</p>
                {isLoadingStats ? (
                  <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold">
                    {statistics?.overview.averagePoints || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Administradores Ativos
                </p>
                {isLoadingStats ? (
                  <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                ) : (
                  <p className="text-2xl font-bold">
                    {statistics?.grantsByGranter.length || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tipos de XP mais utilizados */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Tipos de XP Mais Utilizados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoadingStats ? (
                // Skeleton loading
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))
              ) : statistics && statistics.grantsByType.length > 0 ? (
                statistics.grantsByType
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((type, index) => (
                    <div
                      key={type.typeId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{type.typeName}</p>
                          <p className="text-sm text-muted-foreground">
                            {type.count} concessões ({type.percentage}%)
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {type.totalPoints.toLocaleString()} XP
                      </Badge>
                    </div>
                  ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma concessão encontrada no período
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Administradores mais ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Administradores Mais Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoadingStats ? (
                // Skeleton loading
                Array.from({ length: 3 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-muted animate-pulse rounded-full" />
                      <div className="space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                    <div className="h-6 w-16 bg-muted animate-pulse rounded" />
                  </div>
                ))
              ) : statistics && statistics.grantsByGranter.length > 0 ? (
                statistics.grantsByGranter
                  .sort((a, b) => b.count - a.count)
                  .slice(0, 5)
                  .map((granter, index) => (
                    <div
                      key={granter.granterId}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 text-primary rounded-full text-sm font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{granter.granterName}</p>
                          <p className="text-sm text-muted-foreground">
                            {granter.count} concessões ({granter.percentage}%)
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {granter.totalPoints.toLocaleString()} XP
                      </Badge>
                    </div>
                  ))
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma concessão encontrada no período
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Métricas de Tendências */}
      {statistics && statistics.trends && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendências e Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-700">
                  Tipo Mais Popular
                </p>
                <p className="text-lg font-bold text-blue-900">
                  {statistics.trends.mostUsedType || "Nenhum"}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm font-medium text-green-700">
                  Admin Mais Ativo
                </p>
                <p className="text-lg font-bold text-green-900">
                  {statistics.trends.mostActiveGranter || "Nenhum"}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-700">
                  Média por Admin
                </p>
                <p className="text-lg font-bold text-purple-900">
                  {statistics.trends.averageGrantsPerGranter} concessões
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-yellow-700">
                  Média Diária
                </p>
                <p className="text-lg font-bold text-yellow-900">
                  {statistics.overview.dailyAverageGrants} concessões/dia
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm font-medium text-orange-700">XP Diário</p>
                <p className="text-lg font-bold text-orange-900">
                  {statistics.overview.dailyAveragePoints.toLocaleString()}{" "}
                  XP/dia
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtro de período para estatísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Período das Estatísticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={selectedPeriod === "7d" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("7d")}
                disabled={isLoadingStats}
              >
                Últimos 7 dias
              </Button>
              <Button
                variant={selectedPeriod === "30d" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("30d")}
                disabled={isLoadingStats}
              >
                Últimos 30 dias
              </Button>
              <Button
                variant={selectedPeriod === "90d" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod("90d")}
                disabled={isLoadingStats}
              >
                Últimos 90 dias
              </Button>
            </div>
            {isLoadingStats && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Carregando estatísticas...
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Componente de histórico */}
      <XpGrantHistory
        showFilters={true}
        showStatistics={false} // Já mostramos as estatísticas acima
      />
    </div>
  );
}
