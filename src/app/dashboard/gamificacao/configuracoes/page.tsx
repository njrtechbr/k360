
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ChevronRight, Star, Trophy, GitBranch, Hourglass, Percent, AlertCircle, Shield, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ROLES } from "@/lib/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function GamificacaoConfiguracoesPage() {
    const { user, isAuthenticated, loading, resetXpEvents } = useAuth();
    const router = useRouter();
    const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);

    useEffect(() => {
        if (!loading && (!isAuthenticated || (user?.role !== ROLES.ADMIN && user?.role !== ROLES.SUPERADMIN))) {
            router.push("/dashboard");
        }
    }, [isAuthenticated, loading, router, user]);
    
    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const handleResetConfirm = async () => {
      await resetXpEvents();
      setIsResetDialogOpen(false);
    }

  return (
    <>
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
          <Link href="/dashboard/gamificacao/configuracoes/tipos-xp">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                      <Zap className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Tipos de XP Avulso</CardTitle>
                    <CardDescription>Configure tipos de XP que podem ser concedidos manualmente aos atendentes.</CardDescription>
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
          <Link href="/dashboard/gamificacao/configuracoes/conquistas">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                      <AlertCircle className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Gerenciar Conquistas</CardTitle>
                    <CardDescription>Verificar e desbloquear conquistas que deveriam ter sido obtidas na temporada atual.</CardDescription>
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
          <Link href="/dashboard/gamificacao/configuracoes/escala-niveis">
            <Card className="hover:border-primary transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                      <Shield className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle>Escala de Níveis e Progressão</CardTitle>
                    <CardDescription>Visualize a tabela completa de XP, estatísticas e progresso da equipe.</CardDescription>
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

        <Card className="border-destructive mt-8">
           <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2"><AlertCircle /> Zona de Perigo</CardTitle>
              <CardDescription>
                Ações nesta área são perigosas e irreversíveis. Tenha certeza absoluta antes de continuar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center p-4 border border-dashed border-destructive/50 rounded-lg">
                  <div>
                    <h3 className="font-bold">Resetar Dados da Gamificação</h3>
                    <p className="text-sm text-muted-foreground">Esta ação apagará TODOS os eventos de XP (pontos e troféus) de TODOS os atendentes.</p>
                  </div>
                  <Button variant="destructive" onClick={() => setIsResetDialogOpen(true)}>Resetar Dados de XP</Button>
              </div>
            </CardContent>
        </Card>
      </div>

       <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                      Esta ação não pode ser desfeita. Isso excluirá permanentemente todos os registros de XP (de avaliações e troféus)
                      do sistema. Isso é útil para reiniciar a gamificação ou antes de uma reimportação total. Os dados de avaliações
                      não serão afetados, apenas os pontos.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetConfirm} className="bg-destructive hover:bg-destructive/90">
                    Sim, eu entendo, resetar tudo
                  </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
