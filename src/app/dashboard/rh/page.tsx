
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Users, Upload, Settings, History, Database, BarChart3 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RHPage() {
    const { user, isAuthenticated, loading, attendants } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const activeAttendants = attendants?.filter(a => a.status === 'Ativo').length || 0;
    const totalAttendants = attendants?.length || 0;

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4">
                <h1 className="text-3xl font-bold">Recursos Humanos</h1>
                <div className="flex gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {totalAttendants} atendentes cadastrados
                    </span>
                    <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {activeAttendants} ativos
                    </span>
                </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-600" />
                            Atendentes
                        </CardTitle>
                        <CardDescription>Gerencie o cadastro de atendentes e funcionários</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Adicione, edite ou visualize informações dos atendentes cadastrados no sistema.
                        </p>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/rh/atendentes">
                                Gerenciar Atendentes
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Upload className="h-5 w-5 text-green-600" />
                            Importação
                        </CardTitle>
                        <CardDescription>Importe dados em lote via arquivo CSV</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Faça upload de múltiplos atendentes de uma só vez usando arquivos CSV.
                        </p>
                        <Button asChild className="w-full">
                            <Link href="/dashboard/rh/importar">
                                Importar Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <History className="h-5 w-5 text-orange-600" />
                            Histórico
                        </CardTitle>
                        <CardDescription>Acompanhe importações realizadas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Visualize e gerencie todas as importações de dados já realizadas.
                        </p>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard/rh/historico-importacoes">
                                Ver Histórico
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="h-5 w-5 text-red-600" />
                            Gerenciar Dados
                        </CardTitle>
                        <CardDescription>Ferramentas de limpeza e manutenção</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Exclua registros específicos ou realize limpeza em massa dos dados.
                        </p>
                        <Button asChild variant="destructive" className="w-full">
                            <Link href="/dashboard/rh/gerenciar">
                                Gerenciar Dados
                            </Link>
                        </Button>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-md transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-purple-600" />
                            Configurações
                        </CardTitle>
                        <CardDescription>Funções, setores e parâmetros</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                            Configure as listas de funções e setores disponíveis no sistema.
                        </p>
                        <Button asChild variant="outline" className="w-full">
                            <Link href="/dashboard/rh/configuracoes">
                                Configurar
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
