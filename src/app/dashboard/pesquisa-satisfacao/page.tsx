
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { Users, LayoutDashboard, ListChecks, Star, Sparkles, Upload, History, Trash2 } from "lucide-react";
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
                        <CardTitle>Análise de Sentimento (IA)</CardTitle>
                        <CardDescription>Use IA para analisar os comentários e extrair insights.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Execute análises sob demanda e veja os resultados.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/analise-sentimento">
                                <Sparkles className="mr-2 h-4 w-4" />
                                Analisar Comentários
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Importar (WhatsApp)</CardTitle>
                        <CardDescription>Importe avaliações de um arquivo CSV do WhatsApp.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Faça o upload de dados e mapeie os agentes manualmente.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/importar">
                                <Upload className="mr-2 h-4 w-4" />
                                Importar do WhatsApp
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Importar (Sistema Antigo)</CardTitle>
                        <CardDescription>Importe o histórico de avaliações do sistema legado.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Faça o upload de dados que já contêm o ID do atendente.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/importar-antigo">
                                <Upload className="mr-2 h-4 w-4" />
                                Importar do Sistema Antigo
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Importações</CardTitle>
                        <CardDescription>Veja e reverta importações de dados de avaliações.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Gerencie todos os lotes de avaliações importados para o sistema.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/historico-importacoes">
                                <History className="mr-2 h-4 w-4" />
                                Ver Histórico
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Avaliações</CardTitle>
                        <CardDescription>Exclua avaliações específicas ou todas de uma vez.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Ferramenta para limpeza de dados e gerenciamento de registros.
                        </p>
                        <Button asChild variant="destructive">
                            <Link href="/dashboard/pesquisa-satisfacao/gerenciar">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Gerenciar Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
