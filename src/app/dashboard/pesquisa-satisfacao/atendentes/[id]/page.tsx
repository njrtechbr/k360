"use client";

import { useAuth } from "@/hooks/useAuth";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  History,
  Sparkles,
  Star,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { XpEvent } from "@/lib/types";
import { AttendantProfile } from "@/components/survey";

// Componentes removidos - agora usando AttendantProfile

export default function AttendantProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const { attendants, evaluations, loading, user, xpEvents, activeSeason } =
    useAuth();

  const attendant = useMemo(
    () => attendants.find((a) => a.id === id),
    [attendants, id],
  );

  const attendantXpEvents = useMemo(() => {
    const events = xpEvents.filter((e) => e.attendantId === id);
    if (activeSeason) {
      const startDate = new Date(activeSeason.startDate);
      const endDate = new Date(activeSeason.endDate);
      return events.filter((e) => {
        const eventDate = new Date(e.date);
        return eventDate >= startDate && eventDate <= endDate;
      });
    }
    return []; // No active season, no points.
  }, [xpEvents, id, activeSeason]);

  const currentScore = useMemo(() => {
    return attendantXpEvents.reduce((acc, event) => acc + event.points, 0);
  }, [attendantXpEvents]);

  const xpHistorySorted = useMemo(() => {
    if (!Array.isArray(attendantXpEvents)) {
      return [];
    }
    return [...attendantXpEvents]
      .map((e) => ({ ...e, icon: e.type === "evaluation" ? Star : Trophy }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [attendantXpEvents]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!attendant) {
    return (
      <div className="text-center">
        <h1 className="text-2xl font-bold">Atendente não encontrado</h1>
        <p className="text-muted-foreground">
          O atendente que você está procurando não existe ou foi removido.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/pesquisa-satisfacao/atendentes">
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
          </Link>
        </Button>
      </div>
    );
  }

  const handleEdit = () => {
    // TODO: Implementar edição do atendente
    console.log("Editar atendente:", attendant.id);
  };

  const handleViewEvaluations = () => {
    // TODO: Implementar visualização de avaliações
    console.log("Ver avaliações do atendente:", attendant.id);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/pesquisa-satisfacao/atendentes">
            <ArrowLeft />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Perfil do Atendente</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-3 items-start">
        <div className="lg:col-span-1">
          <AttendantProfile
            attendant={attendant}
            onEdit={handleEdit}
            onViewEvaluations={handleViewEvaluations}
          />
        </div>

        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Gamificação e Níveis</CardTitle>
              <CardDescription>
                Acompanhe o progresso e as recompensas.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles size={18} />
                  <span className="text-sm">
                    Pontos de Experiência{" "}
                    {activeSeason && `(${activeSeason.name})`}
                  </span>
                </div>
                <span className="font-bold text-lg">
                  {Math.round(currentScore)} XP
                </span>
              </div>
              <Button asChild>
                <Link
                  href={`/dashboard/gamificacao/niveis?attendantId=${attendant.id}`}
                >
                  Ver Progresso Detalhado
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History /> Histórico de XP
              </CardTitle>
              <CardDescription>
                Eventos que concederam ou removeram pontos de experiência.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Razão</TableHead>
                    <TableHead>Pontos</TableHead>
                    <TableHead className="text-right">Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {xpHistorySorted.length > 0 ? (
                    xpHistorySorted.map((ev, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium flex items-center gap-2">
                          <ev.icon
                            className={cn(
                              "h-4 w-4",
                              ev.type === "achievement"
                                ? "text-amber-500"
                                : "text-muted-foreground",
                            )}
                          />
                          {ev.reason}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              ev.points >= 0 ? "secondary" : "destructive"
                            }
                            className="flex items-center gap-1 w-fit"
                          >
                            {ev.points >= 0 ? (
                              <TrendingUp size={14} />
                            ) : (
                              <TrendingDown size={14} />
                            )}
                            {ev.points >= 0
                              ? `+${Math.round(ev.points)}`
                              : Math.round(ev.points)}{" "}
                            XP
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {format(new Date(ev.date), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        Nenhum histórico de XP encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
