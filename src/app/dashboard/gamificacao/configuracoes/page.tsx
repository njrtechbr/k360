
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, Star, Trophy, GitBranch, Hourglass, Percent } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ROLES } from "@/lib/types";

export default function GamificacaoConfiguracoesPage() {
    const { user, isAuthenticated, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, loading, router, user]);
    
    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Configurações da Gamificação</h1>
        <p className="text-muted-foreground">
          Ajuste as regras, a pontuação, os troféus e as recompensas do sistema de gamificação.
        </p>
      </div>

      <div className="space-y-4">
        <Link href="/dashboard/gamificacao/configuracoes/pontos">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Star className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Pontos por Avaliação</CardTitle>
                  <CardDescription>Defina o XP base ganho ou perdido para cada nota de avaliação.</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
         <Link href="/dashboard/gamificacao/configuracoes/multiplicadores">
          <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-teal-100 dark:bg-teal-900 rounded-lg">
                    <Percent className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <CardTitle>Multiplicadores de XP</CardTitle>
                  <CardDescription>Ajuste o multiplicador global e os bônus por temporada.</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
        <Link href="/dashboard/gamificacao/configuracoes/trofeus">
           <Card className="hover:border-primary transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between">
               <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <Trophy className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Troféus (Conquistas)</CardTitle>
                  <CardDescription>Edite o nome, a descrição, o XP e ative ou desative os troféus.</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
         <Link href="/dashboard/gamificacao/configuracoes/niveis">
           <Card className="hover:border-primary transition-colors cursor-pointer">
             <CardHeader className="flex flex-row items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                    <GitBranch className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Trilha de Níveis</CardTitle>
                  <CardDescription>Personalize as recompensas desbloqueadas a cada nível.</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
         <Link href="/dashboard/gamificacao/configuracoes/sessoes">
           <Card className="hover:border-primary transition-colors cursor-pointer">
             <CardHeader className="flex flex-row items-center justify-between">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Hourglass className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <CardTitle>Sessões (Temporadas)</CardTitle>
                  <CardDescription>Crie e gerencie os períodos de validade dos passes de batalha.</CardDescription>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-muted-foreground" />
            </CardHeader>
          </Card>
        </Link>
      </div>
    </div>
  );
}
