"use client";

import { useApi } from "@/providers/ApiProvider";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Crown,
  UserCircle,
  Shield,
  Calendar,
  Trophy,
  TrendingUp,
  Users,
  Loader2,
} from "lucide-react";
import { getLevelFromXp } from "@/lib/xp";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { GamificationSeason } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const getMedal = (rank: number) => {
  if (rank === 1)
    return (
      <span className="text-2xl" title="1º Lugar">
        🥇
      </span>
    );
  if (rank === 2)
    return (
      <span className="text-2xl" title="2º Lugar">
        🥈
      </span>
    );
  if (rank === 3)
    return (
      <span className="text-2xl" title="3º Lugar">
        🥉
      </span>
    );
  return <span className="text-muted-foreground font-semibold">{rank}º</span>;
};

export default function HistoricoTemporadasPage() {
  const { data: session, status } = useSession();
  const { attendants, xpEvents, seasons, isAnyLoading } = useApi();
  const router = useRouter();

  const user = session?.user;
  const isAuthenticated = !!session;
  const loading = status === "loading" || isAnyLoading;

  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Incluir apenas temporadas finalizadas para o histórico
  const availableSeasons = useMemo(() => {
    if (!seasons.data || !Array.isArray(seasons.data)) return [];

    const now = new Date();
    return seasons.data
      .filter((s) => new Date(s.endDate) < now) // Apenas temporadas finalizadas
      .sort(
        (a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime(),
      );
  }, [seasons.data]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }

    // Selecionar a temporada finalizada mais recente que tenha dados
    if (
      availableSeasons.length > 0 &&
      !selectedSeasonId &&
      xpEvents.data &&
      Array.isArray(xpEvents.data)
    ) {
      // Encontrar a temporada finalizada com mais eventos
      const seasonWithMostEvents = availableSeasons.find((season) => {
        const seasonEvents = xpEvents.data.filter(
          (e) => e.seasonId === season.id,
        );
        return seasonEvents.length > 0;
      });

      if (seasonWithMostEvents) {
        setSelectedSeasonId(seasonWithMostEvents.id);
      } else if (availableSeasons.length > 0) {
        // Fallback para a temporada mais recente se nenhuma tiver dados
        setSelectedSeasonId(availableSeasons[0].id);
      }
    }
  }, [
    isAuthenticated,
    loading,
    router,
    availableSeasons,
    selectedSeasonId,
    xpEvents.data,
  ]);

  const selectedSeason = useMemo(() => {
    if (!seasons.data || !Array.isArray(seasons.data)) return null;
    return seasons.data.find((s) => s.id === selectedSeasonId) || null;
  }, [seasons.data, selectedSeasonId]);

  const leaderboard = useMemo(() => {
    if (
      !selectedSeason ||
      !xpEvents.data ||
      !Array.isArray(xpEvents.data) ||
      !attendants.data ||
      !Array.isArray(attendants.data)
    ) {
      return [];
    }

    setIsLoadingLeaderboard(true);

    try {
      // Filtrar eventos XP por seasonId (mais confiável que por data)
      const seasonXpEvents = xpEvents.data.filter(
        (e) => e.seasonId === selectedSeason.id,
      );

      console.log(
        `Eventos XP para ${selectedSeason.name}:`,
        seasonXpEvents.length,
      );

      // Se não houver eventos por seasonId, tentar por data como fallback
      let eventsToUse = seasonXpEvents;
      if (seasonXpEvents.length === 0) {
        const seasonStartDate = new Date(selectedSeason.startDate);
        const seasonEndDate = new Date(selectedSeason.endDate);

        eventsToUse = xpEvents.data.filter((e) => {
          const eventDate = new Date(e.date);
          return eventDate >= seasonStartDate && eventDate <= seasonEndDate;
        });

        console.log(
          `Fallback - eventos por data para ${selectedSeason.name}:`,
          eventsToUse.length,
        );
      }

      // Agrupar XP por atendente
      const xpByAttendant = new Map<
        string,
        { totalXp: number; eventCount: number }
      >();

      eventsToUse.forEach((event) => {
        const current = xpByAttendant.get(event.attendantId) || {
          totalXp: 0,
          eventCount: 0,
        };
        xpByAttendant.set(event.attendantId, {
          totalXp: current.totalXp + (event.points || 0),
          eventCount: current.eventCount + 1,
        });
      });

      // Criar leaderboard
      const leaderboardData = attendants.data
        .map((attendant) => {
          const stats = xpByAttendant.get(attendant.id);
          if (!stats || stats.totalXp === 0) return null;

          return {
            ...attendant,
            score: Math.round(stats.totalXp),
            eventCount: stats.eventCount,
            level: getLevelFromXp(stats.totalXp).level,
          };
        })
        .filter(Boolean)
        .sort((a, b) => b!.score - a!.score);

      return leaderboardData;
    } finally {
      setIsLoadingLeaderboard(false);
    }
  }, [attendants, xpEvents, selectedSeason]);

  // Estatísticas da temporada selecionada
  const seasonStats = useMemo(() => {
    if (!selectedSeason || !xpEvents.data || !Array.isArray(xpEvents.data))
      return null;

    const seasonEvents = xpEvents.data.filter(
      (e) => e.seasonId === selectedSeason.id,
    );

    if (seasonEvents.length === 0) return null;

    const totalXp = seasonEvents.reduce((sum, e) => sum + (e.points || 0), 0);
    const averageXp = totalXp / seasonEvents.length;
    const participantCount = new Set(seasonEvents.map((e) => e.attendantId))
      .size;

    return {
      totalEvents: seasonEvents.length,
      totalXp: Math.round(totalXp),
      averageXp: Math.round(averageXp),
      participantCount,
      xpMultiplier: selectedSeason.xpMultiplier,
    };
  }, [selectedSeason, xpEvents.data]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Histórico de Temporadas (Hall da Fama)
          </h1>
          <p className="text-muted-foreground">
            Veja os resultados e o ranking final de temporadas anteriores.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Select
            onValueChange={setSelectedSeasonId}
            value={selectedSeasonId ?? undefined}
          >
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Selecione uma temporada" />
            </SelectTrigger>
            <SelectContent>
              {availableSeasons.length > 0 && (
                <>
                  {availableSeasons.map((season) => (
                    <SelectItem key={season.id} value={season.id}>
                      {season.name} (
                      {format(parseISO(season.startDate), "dd/MM/yy")} -{" "}
                      {format(parseISO(season.endDate), "dd/MM/yy")})
                    </SelectItem>
                  ))}
                </>
              )}
            </SelectContent>
          </Select>
          {selectedSeason && (
            <div className="text-sm text-muted-foreground text-right">
              <Badge variant={selectedSeason.active ? "default" : "secondary"}>
                {selectedSeason.active ? "Ativa" : "Finalizada"}
              </Badge>
            </div>
          )}
        </div>
      </div>

      {/* Estatísticas da temporada */}
      {selectedSeason && seasonStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Participantes</p>
                  <p className="text-2xl font-bold">
                    {seasonStats.participantCount}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">XP Total</p>
                  <p className="text-2xl font-bold">
                    {seasonStats.totalXp.toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">XP Médio</p>
                  <p className="text-2xl font-bold">{seasonStats.averageXp}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Multiplicador</p>
                  <p className="text-2xl font-bold">
                    {seasonStats.xpMultiplier}x
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown />
            Leaderboard: {selectedSeason?.name || "Selecione uma temporada"}
            {isLoadingLeaderboard && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
          </CardTitle>
          <CardDescription>
            {selectedSeason
              ? `Classificação final da temporada de ${format(parseISO(selectedSeason.startDate), "dd 'de' MMMM", { locale: ptBR })} a ${format(parseISO(selectedSeason.endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
              : "Selecione uma temporada acima para ver os resultados."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingLeaderboard ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando leaderboard...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16 text-center">Posição</TableHead>
                  <TableHead>Atendente</TableHead>
                  <TableHead className="text-center">Nível</TableHead>
                  <TableHead className="text-center">Eventos</TableHead>
                  <TableHead className="text-right">XP Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.length > 0 ? (
                  leaderboard.map((att, index) => (
                    <TableRow
                      key={att.id}
                      className={
                        index < 3 ? "bg-amber-50 dark:bg-amber-950/50" : ""
                      }
                    >
                      <TableCell className="text-center">
                        {getMedal(index + 1)}
                      </TableCell>
                      <TableCell className="font-medium">
                        <Link
                          href={`/dashboard/rh/atendentes/${att.id}`}
                          className="flex items-center gap-3 group"
                        >
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={att.avatarUrl} alt={att.name} />
                            <AvatarFallback>
                              <UserCircle />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="group-hover:underline">
                              {att.name}
                            </span>
                            <div className="text-xs text-muted-foreground capitalize">
                              {att.setor}
                            </div>
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 font-bold">
                          <Shield size={16} className="text-blue-500" />
                          {att.level}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{att.eventCount}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {att.score.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Trophy className="h-8 w-8" />
                        <div>
                          <p className="font-medium">
                            {selectedSeasonId
                              ? "Nenhum dado encontrado"
                              : "Selecione uma temporada"}
                          </p>
                          <p className="text-sm">
                            {selectedSeasonId
                              ? "Esta temporada não possui dados de XP ainda."
                              : "Escolha uma temporada para ver o ranking."}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Debug info - remover em produção */}
      {process.env.NODE_ENV === "development" && selectedSeason && (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Debug Info</CardTitle>
          </CardHeader>
          <CardContent className="text-xs space-y-1">
            <p>Season ID: {selectedSeason.id}</p>
            <p>Total XP Events: {xpEvents.data?.length || 0}</p>
            <p>
              Season XP Events:{" "}
              {xpEvents.data?.filter((e) => e.seasonId === selectedSeason.id)
                .length || 0}
            </p>
            <p>Attendants: {attendants.data?.length || 0}</p>
            <p>Leaderboard entries: {leaderboard.length}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
