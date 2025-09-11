"use client";

import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/providers/ApiProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { EvaluationsList } from "@/components/survey";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";

export default function AvaliacoesPage() {
  const { user, isAuthenticated, authLoading } = useAuth();
  const { evaluations, attendants, deleteEvaluations } = useApi();
  const router = useRouter();

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

  const handleEditEvaluation = async (evaluation: any) => {
    // TODO: Implementar modal de edição
    console.log("Editar avaliação:", evaluation);
  };

  const handleDeleteEvaluation = async (evaluation: any) => {
    if (confirm("Tem certeza que deseja excluir esta avaliação?")) {
      await deleteEvaluations.mutate({
        evaluationIds: [evaluation.id],
        title: "Excluindo Avaliação",
      });
    }
  };

  const handleViewEvaluation = (evaluation: any) => {
    // TODO: Implementar modal de visualização detalhada
    console.log("Visualizar avaliação:", evaluation);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Todas as Avaliações</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie e visualize todas as avaliações de satisfação
          </p>
        </div>
        <Button
          onClick={() =>
            router.push("/dashboard/pesquisa-satisfacao/avaliacoes/nova")
          }
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Avaliação
        </Button>
      </div>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Histórico Completo</CardTitle>
          <CardDescription>
            Lista de todas as avaliações de satisfação registradas no sistema.
            Total: {evaluations.data?.length || 0} avaliações
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EvaluationsList
            evaluations={evaluations.data || []}
            attendants={attendants.data || []}
            loading={evaluations.loading}
            onEdit={handleEditEvaluation}
            onDelete={handleDeleteEvaluation}
            onView={handleViewEvaluation}
            showActions={true}
            showFilters={true}
            pageSize={20}
          />
        </CardContent>
      </Card>
    </div>
  );
}
