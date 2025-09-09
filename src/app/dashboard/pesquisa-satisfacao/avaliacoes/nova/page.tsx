"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEvaluations } from "@/hooks/survey";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { EvaluationForm } from "@/components/survey/EvaluationForm";
import { useToast } from "@/hooks/use-toast";

export default function NovaAvaliacaoPage() {
    const { user, isAuthenticated, loading: authLoading, attendants } = useAuth();
    const router = useRouter();
    const { createEvaluation } = useEvaluations({ autoFetch: false });
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

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

    const handleSubmit = async (evaluationData: {
        attendantId: string;
        nota: number;
        comentario: string;
    }) => {
        setIsSubmitting(true);
        try {
            await createEvaluation(evaluationData);
            toast({
                title: "Avaliação criada com sucesso!",
                description: "A avaliação foi registrada e o XP foi atribuído ao atendente.",
            });
            router.push("/dashboard/pesquisa-satisfacao/avaliacoes");
        } catch (error) {
            console.error("Erro ao criar avaliação:", error);
            toast({
                title: "Erro ao criar avaliação",
                description: "Ocorreu um erro ao tentar criar a avaliação. Tente novamente.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push("/dashboard/pesquisa-satisfacao/avaliacoes");
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancel}
                    className="flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Voltar
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Nova Avaliação</h1>
                    <p className="text-muted-foreground mt-2">
                        Registre uma nova avaliação de satisfação
                    </p>
                </div>
            </div>

            <Card className="shadow-lg max-w-2xl">
                <CardHeader>
                    <CardTitle>Formulário de Avaliação</CardTitle>
                    <CardDescription>
                        Preencha os dados da avaliação. O XP será calculado automaticamente com base na nota.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <EvaluationForm
                        attendants={attendants || []}
                        onSubmit={handleSubmit}
                        onCancel={handleCancel}
                        isSubmitting={isSubmitting}
                    />
                </CardContent>
            </Card>
        </div>
    );
}