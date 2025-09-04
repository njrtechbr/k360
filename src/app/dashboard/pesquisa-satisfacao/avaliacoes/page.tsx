
"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useEvaluations } from "@/hooks/survey";
import { EvaluationsList } from "@/components/survey";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AvaliacoesPage() {
    const { user, isAuthenticated, loading: authLoading, attendants } = useAuth();
    const router = useRouter();
    const { 
        evaluations, 
        loading, 
        updateEvaluation, 
        deleteEvaluation 
    } = useEvaluations();

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
        console.log('Editar avaliação:', evaluation);
    };

    const handleDeleteEvaluation = async (evaluation: any) => {
        if (confirm('Tem certeza que deseja excluir esta avaliação?')) {
            await deleteEvaluation(evaluation.id);
        }
    };

    const handleViewEvaluation = (evaluation: any) => {
        // TODO: Implementar modal de visualização detalhada
        console.log('Visualizar avaliação:', evaluation);
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
            </div>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Histórico Completo</CardTitle>
                    <CardDescription>
                        Lista de todas as avaliações de satisfação registradas no sistema.
                        Total: {evaluations.length} avaliações
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EvaluationsList
                        evaluations={evaluations}
                        attendants={attendants}
                        loading={loading}
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

    