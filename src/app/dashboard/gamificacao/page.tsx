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
  Star as StarIcon,
  TrendingUp,
  TrendingDown,
  UserCircle,
  Shield,
  ChevronRight,
  BookOpen,
  BarChartHorizontal,
  Settings,
  History,
  Award,
  BarChart,
  BadgeCent,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Rocket,
  StarHalf,
  Users,
  Smile,
  HeartHandshake,
  Gem,
  Medal,
  MessageSquareQuote,
  MessageSquarePlus,
  MessageSquareHeart,
  MessageSquareWarning,
  ShieldCheck,
  Star,
  Component,
  Braces,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Attendant, Achievement } from "@/lib/types";
import { getLevelFromXp } from "@/lib/xp";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ROLES } from "@/lib/types";
import { SeasonStatus } from "@/components/gamification";
import { getScoreFromRating } from "@/lib/gamification";

// Mapeamento de ícones para achievements
const iconMap: Record<string, any> = {
  Award,
  BarChart,
  BadgeCent,
  Crown,
  Sparkles,
  Target,
  Trophy,
  Zap,
  Rocket,
  StarHalf,
  Users,
  Smile,
  HeartHandshake,
  Gem,
  Medal,
  MessageSquareQuote,
  MessageSquarePlus,
  MessageSquareHeart,
  MessageSquareWarning,
  TrendingUp,
  ShieldCheck,
  Star,
  Component,
  Braces,
  UserCheck,
  BookOpen,
};

const getIconComponent = (iconName: string | React.ElementType) => {
  // Se já é um componente React, retorna diretamente
  if (typeof iconName === "function") {
    return iconName;
  }
  // Se é uma string, busca no mapeamento
  if (typeof iconName === "string") {
    return iconMap[iconName] || Trophy;
  }
  // Fallback para Trophy
  return Trophy;
};

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

type AchievementStat = Achievement & {
  unlockedCount: number;
  totalAttendants: number;
  progress: number;
  unlockedBy: Attendant[];
};

export default function GamificacaoPage() {
  const { data: session, status } = useSession();
  const {
    attendants,
    seasonXpEvents,
    gamificationConfig,
    achievements,
    activeSeason,
    nextSeason,
    isAnyLoading,
  } = useApi();
  const router = useRouter();

  const user = session?.user;
  const isAuthenticated = !!session;
  const loading = status === "loading" || isAnyLoading;
  const [isAchievementDialogOpen, setIsAchievementDialogOpen] = useState(false);
  const [selectedAchievement, setSelectedAchievement] =
    useState<AchievementStat | null>(null);
  const [currentSeasonAchievements, setCurrentSeasonAchievements] = useState<
    any[]
  >([]);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, loading, router]);

  // Buscar conquistas da temporada atual
  useEffect(() => {
    const fetchCurrentSeasonAchievements = async () => {
      if (!activeSeason) return;

      try {
        const response = await fetch(
          `/api/gamification/achievements/season/${activeSeason.id}`,
        );
        if (response.ok) {
          const data = await response.json();
          setCurrentSeasonAchievements(data);
        }
      } catch (error) {
        console.error("Erro ao buscar conquistas da temporada:", error);
      }
    };

    fetchCurrentSeasonAchievements();
  }, [activeSeason]);

  const globalMultiplier = gamificationConfig.data?.globalXpMultiplier || 1;
  const seasonMultiplier = activeSeason?.xpMultiplier ?? 1;
  const totalMultiplier = globalMultiplier * seasonMultiplier;

  const leaderboard = useMemo(() => {
    const statsByAttendant = new Map<
      string,
      { score: number; evaluationCount: number }
    >();

    // Verificação de segurança para seasonXpEvents
    if (seasonXpEvents.data && Array.isArray(seasonXpEvents.data)) {
      seasonXpEvents.data.forEach((event) => {
        let currentStats = statsByAttendant.get(event.attendantId);
        if (!currentStats) {
          currentStats = { score: 0, evaluationCount: 0 };
        }

        currentStats.score += event.points;
        if (event.type === "evaluation") {
          currentStats.evaluationCount++;
        }

        statsByAttendant.set(event.attendantId, currentStats);
      });
    }

    // Verificação de segurança para attendants
    if (!attendants.data || !Array.isArray(attendants.data)) {
      return [];
    }

    return attendants.data
      .map((attendant) => {
        const stats = statsByAttendant.get(attendant.id);
        return {
          ...attendant,
          score: Math.round(stats?.score || 0),
          evaluationCount: stats?.evaluationCount || 0,
        };
      })
      .filter((att) => att.score > 0 || att.evaluationCount > 0)
      .sort((a, b) => b.score - a.score);
  }, [attendants.data, seasonXpEvents.data]);

  const achievementStats: AchievementStat[] = useMemo(() => {
    // Verificações de segurança para arrays
    if (!achievements.data || !Array.isArray(achievements.data)) {
      return [];
    }
    if (!attendants.data || !Array.isArray(attendants.data)) {
      return [];
    }

    return achievements.data
      .filter((ach) => ach.active)
      .map((achievement) => {
        // Buscar conquistas desbloqueadas na temporada atual
        const unlockedInCurrentSeason = currentSeasonAchievements.filter(
          (unlock) => unlock.achievementId === achievement.id,
        );

        const unlockedByAttendantIds = new Set(
          unlockedInCurrentSeason.map((unlock) => unlock.attendantId),
        );

        const unlockedBy = attendants.data.filter((att) =>
          unlockedByAttendantIds.has(att.id),
        );

        return {
          ...achievement,
          unlockedCount: unlockedBy.length,
          totalAttendants: attendants.data.length,
          progress:
            attendants.data.length > 0
              ? (unlockedBy.length / attendants.data.length) * 100
              : 0,
          unlockedBy,
        };
      });
  }, [attendants.data, achievements.data, currentSeasonAchievements]);

  const handleAchievementClick = (achievement: AchievementStat) => {
    setSelectedAchievement(achievement);
    setIsAchievementDialogOpen(true);
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Carregando...</p>
      </div>
    );
  }

  const canManageSystem =
    user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;

  const ratingScores = gamificationConfig.data?.ratingScores;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">Gamificação</h1>
          <p className="text-muted-foreground">
            Acompanhe o ranking, o progresso e as recompensas da equipe.
          </p>
        </div>
      </div>

      <SeasonStatus activeSeason={activeSeason} nextSeason={nextSeason} />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChartHorizontal /> Níveis e Progresso
            </CardTitle>
            <CardDescription>
              Visualize a trilha de recompensas completa e a classificação geral
              da equipe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/gamificacao/niveis">
                Ver Progresso dos Níveis
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History /> Histórico de Temporadas
            </CardTitle>
            <CardDescription>
              Veja o "Hall da Fama" com os resultados de temporadas anteriores.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/gamificacao/historico-temporadas">
                Ver Histórico
              </Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen /> Manual da Gamificação
            </CardTitle>
            <CardDescription>
              Entenda como funciona o sistema de pontos, níveis e troféus.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/gamificacao/manual">Ler o Manual</Link>
            </Button>
          </CardContent>
        </Card>
        {canManageSystem && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap /> Conceder XP Avulso
                </CardTitle>
                <CardDescription>
                  Conceda pontos de experiência extras para reconhecer ações
                  específicas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/gamificacao/conceder-xp">
                    Conceder XP
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History /> Histórico de XP Avulso
                </CardTitle>
                <CardDescription>
                  Visualize e audite todas as concessões de XP avulso
                  realizadas.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/gamificacao/historico-xp">
                    Ver Histórico
                  </Link>
                </Button>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings /> Configurações
                </CardTitle>
                <CardDescription>
                  Ajuste as regras e a pontuação do sistema de gamificação.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/dashboard/gamificacao/configuracoes">
                    Ajustar Configurações
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown /> Leaderboard (Temporada Atual)
              </CardTitle>
              <CardDescription>
                Classificação dos atendentes com base na pontuação total (XP) da
                temporada atual.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16 text-center">Posição</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead className="text-center">Nível</TableHead>
                    <TableHead className="text-right">Avaliações</TableHead>
                    <TableHead className="text-right">XP Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaderboard.map((att, index) => (
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
                          {getLevelFromXp(att.score).level}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {att.evaluationCount}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg">
                        {att.score}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <Card className="shadow-lg sticky top-24">
            <CardHeader>
              <CardTitle>Como Ganhar XP?</CardTitle>
              <CardDescription>
                Cada avaliação gera ou remove pontos de experiência.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-2 rounded-md bg-green-50 dark:bg-green-950">
                <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400" />{" "}
                  5 Estrelas
                </div>
                <div className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                  <TrendingUp size={16} /> +
                  {ratingScores
                    ? Math.round(
                        getScoreFromRating(5, ratingScores) * totalMultiplier,
                      )
                    : 0}{" "}
                  XP
                </div>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-lime-50 dark:bg-lime-950">
                <div className="flex items-center gap-2 font-medium text-lime-700 dark:text-lime-300">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400" />{" "}
                  4 Estrelas
                </div>
                <div className="flex items-center gap-1 font-bold text-lime-600 dark:text-lime-400">
                  <TrendingUp size={16} /> +
                  {ratingScores
                    ? Math.round(
                        getScoreFromRating(4, ratingScores) * totalMultiplier,
                      )
                    : 0}{" "}
                  XP
                </div>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-blue-50 dark:bg-blue-950">
                <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400" />{" "}
                  3 Estrelas
                </div>
                <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                  <TrendingUp size={16} /> +
                  {ratingScores
                    ? Math.round(
                        getScoreFromRating(3, ratingScores) * totalMultiplier,
                      )
                    : 0}{" "}
                  XP
                </div>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-orange-50 dark:bg-orange-950">
                <div className="flex items-center gap-2 font-medium text-orange-700 dark:text-orange-300">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400" />{" "}
                  2 Estrelas
                </div>
                <div className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                  <TrendingDown size={16} />{" "}
                  {ratingScores
                    ? Math.round(
                        getScoreFromRating(2, ratingScores) * totalMultiplier,
                      )
                    : 0}{" "}
                  XP
                </div>
              </div>
              <div className="flex justify-between items-center p-2 rounded-md bg-red-50 dark:bg-red-950">
                <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
                  <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400" />{" "}
                  1 Estrela
                </div>
                <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                  <TrendingDown size={16} />{" "}
                  {ratingScores
                    ? Math.round(
                        getScoreFromRating(1, ratingScores) * totalMultiplier,
                      )
                    : 0}{" "}
                  XP
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold font-heading mb-4">
          Galeria de Troféus
        </h2>
        <p className="text-muted-foreground mb-6">
          Desbloqueie troféus para ganhar XP bônus e acelerar sua progressão.
          Clique para ver os detalhes.
        </p>
        <div className="space-y-2">
          {achievementStats.map((ach) => (
            <Card
              key={ach.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAchievementClick(ach)}
            >
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 bg-muted rounded-full ${ach.unlockedCount > 0 ? ach.color : "text-muted-foreground"}`}
                  >
                    {React.createElement(getIconComponent(ach.icon), {
                      className: "h-6 w-6",
                    })}
                  </div>
                  <div>
                    <p className="font-semibold">{ach.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ach.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      +{Math.round(ach.xp * totalMultiplier)} XP
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ach.unlockedCount} / {ach.totalAttendants} Desbloquearam
                    </p>
                  </div>
                  <ChevronRight className="text-muted-foreground" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Dialog
        open={isAchievementDialogOpen}
        onOpenChange={setIsAchievementDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className={`p-2 bg-muted rounded-full ${selectedAchievement?.color}`}
              >
                {selectedAchievement &&
                  React.createElement(
                    getIconComponent(selectedAchievement.icon),
                    { className: "h-5 w-5" },
                  )}
              </div>
              {selectedAchievement?.title}
            </DialogTitle>
            <DialogDescription>
              {selectedAchievement?.description}
            </DialogDescription>
          </DialogHeader>
          <div>
            <h4 className="font-semibold mb-2">Desbloqueada por:</h4>
            {selectedAchievement &&
            selectedAchievement.unlockedBy.length > 0 ? (
              <ScrollArea className="h-72">
                <ul className="space-y-2 pr-4">
                  {selectedAchievement.unlockedBy.map((att) => (
                    <li key={att.id}>
                      <Link
                        href={`/dashboard/rh/atendentes/${att.id}`}
                        className="flex items-center gap-3 p-2 rounded-md border hover:bg-muted"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={att.avatarUrl} alt={att.name} />
                          <AvatarFallback>
                            <UserCircle size={16} />
                          </AvatarFallback>
                        </Avatar>
                        <span>{att.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum atendente desbloqueou esta conquista ainda.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
