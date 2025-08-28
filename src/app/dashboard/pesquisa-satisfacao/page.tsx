

"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { Users, LayoutDashboard, ListChecks, Trophy, Star } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PesquisaSatisfacaoPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Módulo de Pesquisa de Satisfação</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                 <Card>
                    <CardHeader>
                        <CardTitle>Dashboard de Avaliações</CardTitle>
                        <CardDescription>Visualize gráficos e métricas sobre o desempenho dos atendentes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Acesse o dashboard completo para monitorar a satisfação.
                        </p>
                         <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/dashboard">
                                <LayoutDashboard className="mr-2 h-4 w-4" />
                                Ver Dashboard
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Todas as Avaliações</CardTitle>
                        <CardDescription>Veja a lista completa com todas as avaliações recebidas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          Navegue e filtre por todo o histórico de avaliações.
                        </p>
                         <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/avaliacoes">
                                <ListChecks className="mr-2 h-4 w-4" />
                                Ver Histórico
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Atendentes</CardTitle>
                        <CardDescription>Adicione, edite ou remova os atendentes que serão avaliados.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Mantenha a lista de atendentes sempre atualizada para pesquisas precisas.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/atendentes">
                                <Users className="mr-2 h-4 w-4" />
                                Gerenciar Atendentes
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Ranking</CardTitle>
                        <CardDescription>Acompanhe a pontuação e a classificação dos atendentes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Incentive a equipe com um sistema de pontos baseado nas avaliações.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/ranking">
                                <Trophy className="mr-2 h-4 w-4" />
                                Ver Ranking
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Conquistas</CardTitle>
                        <CardDescription>Veja os objetivos e marcos alcançados pelos atendentes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Acompanhe o progresso da equipe em direção às metas estabelecidas.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/conquistas">
                                <Star className="mr-2 h-4 w-4" />
                                Ver Conquistas
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
