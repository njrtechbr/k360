"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/providers/ApiProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import React from "react";
import { useEvaluationAnalytics } from "@/hooks/survey";
import { SurveyStats, EvaluationsList } from "@/components/survey";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, List } from "lucide-react";
import Link from "next/link";

export default function DashboardAvaliacoesPage() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const { evaluations, attendants } = useApi();
  const router = useRouter();
  const analytics = useEvaluationAnalytics({
    evaluations: evaluations.data || [],
    attendants: attendants.data || [],
  });

  // Obter as 5 avaliações mais recentes
  const recentEvaluations = React.useMemo(() => {
    if (!evaluations.data) return [];
    return [...evaluations.data]
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.data).getTime() -
          new Date(a.createdAt || a.data).getTime(),
      )
      .slice(0, 5);
  }, [evaluations.data]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Avaliações</h1>
          <p className="text-muted-foreground">
            Métricas e insights sobre a satisfação dos clientes.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/dashboard/pesquisa-satisfacao/avaliacoes">
            <List className="mr-2 h-4 w-4" />
            Ver todas as avaliações
          </Link>
        </Button>
      </div>

      {/* Componente de estatísticas principais */}
      <SurveyStats
        analytics={analytics}
        loading={evaluations.loading}
        showCharts={true}
        className="mb-8"
      />

      {/* Lista de avaliações recentes */}
      <Card>
        <CardHeader>
          <CardTitle>Avaliações Recentes</CardTitle>
          <CardDescription>
            As últimas 5 avaliações recebidas no sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvaluationsList
            evaluations={recentEvaluations}
            attendants={attendants.data || []}
            loading={evaluations.loading}
            showActions={false}
            showFilters={false}
            pageSize={5}
          />
        </CardContent>
      </Card>
    </div>
  );
}
