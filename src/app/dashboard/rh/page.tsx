
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/providers/AuthProvider";
import { Users, Upload, Settings, History, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RHPage() {
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
            <h1 className="text-3xl font-bold">Módulo de Recursos Humanos</h1>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Atendentes</CardTitle>
                        <CardDescription>Adicione, edite ou remova os atendentes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Mantenha a lista de atendentes e funcionários sempre atualizada.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/rh/atendentes">
                                <Users className="mr-2 h-4 w-4" />
                                Gerenciar Atendentes
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Importar Atendentes</CardTitle>
                        <CardDescription>Importe múltiplos atendentes de um arquivo CSV.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Faça o upload de dados de outras plataformas para um cadastro em massa.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/rh/importar">
                                <Upload className="mr-2 h-4 w-4" />
                                Importar Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Histórico de Importações</CardTitle>
                        <CardDescription>Veja e reverta importações de dados de atendentes.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Gerencie todos os lotes de atendentes importados para o sistema.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/rh/historico-importacoes">
                                <History className="mr-2 h-4 w-4" />
                                Ver Histórico
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Gerenciar Atendentes</CardTitle>
                        <CardDescription>Exclua atendentes específicos ou todos de uma vez.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Ferramenta para limpeza de dados e gerenciamento de registros de atendentes.
                        </p>
                        <Button asChild variant="destructive">
                            <Link href="/dashboard/rh/gerenciar">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Gerenciar Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Configurações de RH</CardTitle>
                        <CardDescription>Gerencie as Funções e Setores disponíveis.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                           Personalize as listas de funções e setores para o cadastro de atendentes.
                        </p>
                        <Button asChild>
                            <Link href="/dashboard/rh/configuracoes">
                                <Settings className="mr-2 h-4 w-4" />
                                Ajustar Configurações
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
