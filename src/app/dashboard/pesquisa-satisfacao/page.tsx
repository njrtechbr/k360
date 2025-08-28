
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { Users, ClipboardList } from "lucide-react";
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
            <div className="grid md:grid-cols-2 gap-8">
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
                        <CardTitle>Ver Avaliações</CardTitle>
                        <CardDescription>Visualize o histórico de avaliações de satisfação recebidas.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Acesse a lista completa de avaliações para monitorar o desempenho.
                        </p>
                         <Button asChild>
                            <Link href="/dashboard/pesquisa-satisfacao/nova">
                                <ClipboardList className="mr-2 h-4 w-4" />
                                Ver Avaliações
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

