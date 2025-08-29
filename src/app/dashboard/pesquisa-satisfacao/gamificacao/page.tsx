
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, BarChart, BadgeCent, Star as StarIcon, TrendingUp, Crown, Sparkles, Target, Trophy, Zap, Rocket, StarHalf, Users, Smile, HeartHandshake, Gem, Medal, TrendingDown, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Attendant, Evaluation } from "@/lib/types";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";


const getScoreFromRating = (rating: number): number => {
    switch (rating) {
        case 5: return 5;
        case 4: return 3;
        case 3: return 1;
        case 2: return -2;
        case 1: return -5;
        default: return 0;
    }
};

const getMedal = (rank: number) => {
    if (rank === 1) return <span className="text-2xl" title="1º Lugar">🥇</span>;
    if (rank === 2) return <span className="text-2xl" title="2º Lugar">🥈</span>;
    if (rank === 3) return <span className="text-2xl" title="3º Lugar">🥉</span>;
    return <span className="text-muted-foreground font-semibold">{rank}º</span>
};

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  isUnlocked: (attendant: Attendant, evaluations: Evaluation[], allEvaluations: Evaluation[], allAttendants: Attendant[]) => boolean;
};

const achievements: Achievement[] = [
  {
    id: "primeira-impressao",
    title: "Primeira Impressão",
    description: "Receba sua primeira avaliação",
    icon: Sparkles,
    color: "text-orange-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 1,
  },
  {
    id: "ganhando-ritmo",
    title: "Ganhando Ritmo",
    description: "Receba 10 avaliações",
    icon: Target,
    color: "text-cyan-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 10,
  },
  {
    id: "veterano",
    title: "Veterano",
    description: "Receba 50 avaliações",
    icon: BadgeCent,
    color: "text-gray-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 50,
  },
  {
    id: "centuriao",
    title: "Centurião",
    description: "Receba 100 avaliações",
    icon: Trophy,
    color: "text-yellow-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 100,
  },
  {
    id: "imparavel",
    title: "Imparável",
    description: "Receba 250 avaliações",
    icon: Zap,
    color: "text-blue-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 250,
  },
  {
    id: "lenda",
    title: "Lenda do Atendimento",
    description: "Receba 500 avaliações",
    icon: Rocket,
    color: "text-red-500",
    isUnlocked: (attendant, evaluations) => evaluations.length >= 500,
  },
    {
    id: "perfeicao",
    title: "Perfeição",
    description: "Mantenha nota média 5.0 com pelo menos 10 avaliações",
    icon: Crown,
    color: "text-purple-500",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 10) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg === 5;
    },
  },
  {
    id: "excelencia",
    title: "Excelência",
    description: "Mantenha nota média acima de 4.5",
    icon: Award,
    color: "text-yellow-600",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length === 0) return false;
      const avg = evaluations.reduce((sum, ev) => sum + ev.nota, 0) / evaluations.length;
      return avg > 4.5;
    },
  },
  {
    id: "satisfacao-garantida",
    title: "Satisfação Garantida",
    description: "90% de avaliações positivas (4-5 estrelas)",
    icon: TrendingUp,
    color: "text-green-500",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length === 0) return false;
      const positiveCount = evaluations.filter(ev => ev.nota >= 4).length;
      return (positiveCount / evaluations.length) * 100 >= 90;
    },
  },
  {
    id: 'trinca-perfeita',
    title: 'Trinca Perfeita',
    description: 'Receba 3 avaliações de 5 estrelas consecutivas',
    icon: Smile,
    color: 'text-pink-400',
    isUnlocked: (attendant, evaluations) => {
      const sortedEvals = [...evaluations].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());
      let consecutiveFives = 0;
      for (const ev of sortedEvals) {
        if (ev.nota === 5) {
          consecutiveFives++;
          if (consecutiveFives >= 3) return true;
        } else {
          consecutiveFives = 0;
        }
      }
      return false;
    },
  },
  {
    id: 'cliente-satisfeito',
    title: 'Cliente Satisfeito',
    description: 'Receba 10 avaliações de 5 estrelas',
    icon: HeartHandshake,
    color: 'text-rose-500',
    isUnlocked: (attendant, evaluations) => {
      return evaluations.filter(ev => ev.nota === 5).length >= 10;
    },
  },
  {
    id: 'mestre-qualidade',
    title: 'Mestre da Qualidade',
    description: 'Receba 50 avaliações de 5 estrelas',
    icon: Gem,
    color: 'text-sky-400',
    isUnlocked: (attendant, evaluations) => {
      return evaluations.filter(ev => ev.nota === 5).length >= 50;
    },
  },
  {
    id: "favorito-da-galera",
    title: "Favorito da Galera",
    description: "Seja o atendente com o maior número de avaliações",
    icon: Users,
    color: "text-pink-500",
    isUnlocked: (attendant, evaluations, allEvaluations) => {
      if (evaluations.length === 0) return false;
      const evaluationCounts = allEvaluations.reduce((acc, ev) => {
        acc[ev.attendantId] = (acc[ev.attendantId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const maxEvaluations = Math.max(...Object.values(evaluationCounts));
      
      return evaluationCounts[attendant.id] === maxEvaluations;
    }
  },
  {
    id: 'astro-em-ascensao',
    title: 'Astro em Ascensão',
    description: 'Tenha a melhor nota média (mínimo 20 avaliações)',
    icon: StarHalf,
    color: 'text-teal-500',
    isUnlocked: (attendant, evaluations, allEvaluations, allAttendants) => {
      if (evaluations.length < 20) return false;

      const attendantStats = allAttendants.map(att => {
        const attEvals = allEvaluations.filter(e => e.attendantId === att.id);
        if (attEvals.length === 0) return { id: att.id, avgRating: 0, count: 0 };
        const totalRating = attEvals.reduce((sum, ev) => sum + ev.nota, 0);
        return { id: att.id, avgRating: totalRating / attEvals.length, count: attEvals.length };
      });

      const eligibleAttendants = attendantStats.filter(s => s.count >= 20);
      if (eligibleAttendants.length === 0) return false;

      const maxAvgRating = Math.max(...eligibleAttendants.map(a => a.avgRating));
      const currentAttendantAvg = attendantStats.find(a => a.id === attendant.id)?.avgRating;

      return currentAttendantAvg === maxAvgRating;
    },
  },
  {
    id: "consistente",
    title: "Consistente",
    description: "Receba avaliações por 7 dias consecutivos",
    icon: BarChart,
    color: "text-indigo-500",
    isUnlocked: (attendant, evaluations) => {
      if (evaluations.length < 7) return false;
        
      const dates = evaluations.map(e => new Date(e.data).toDateString()).sort();
      const uniqueDates = [...new Set(dates)];
      
      if (uniqueDates.length < 7) return false;

      for (let i = 0; i < uniqueDates.length - 6; i++) {
        let consecutiveDays = 1;
        let lastDate = new Date(uniqueDates[i]);

        for (let j = i + 1; j < uniqueDates.length; j++) {
            const currentDate = new Date(uniqueDates[j]);
            const diffTime = lastDate.getTime() - currentDate.getTime();
            const diffDays = diffTime / (1000 * 3600 * 24);

            if (diffDays === 1) {
                consecutiveDays++;
                lastDate = currentDate;
            } else if (diffDays > 1) {
                consecutiveDays = 1;
                lastDate = currentDate;
            }
            if (consecutiveDays >= 7) return true;
        }
      }

      return false;
    },
  },
];


type AchievementStat = Achievement & {
  unlockedCount: number;
  totalAttendants: number;
  progress: number;
  unlockedBy: Attendant[];
};

export default function GamificacaoPage() {
    const { user, isAuthenticated, loading, evaluations, attendants } = useAuth();
    const router = useRouter();
    const [isAchievementDialogOpen, setIsAchievementDialogOpen] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<AchievementStat | null>(null);


    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const leaderboard = useMemo(() => {
        const attendantScores: Record<string, { totalScore: number, evaluationCount: number }> = {};

        evaluations.forEach(ev => {
            if (!attendantScores[ev.attendantId]) {
                attendantScores[ev.attendantId] = { totalScore: 0, evaluationCount: 0 };
            }
            attendantScores[ev.attendantId].totalScore += getScoreFromRating(ev.nota);
            attendantScores[ev.attendantId].evaluationCount++;
        });

        const rankedAttendants = attendants
            .map(attendant => {
                const attendantEvaluations = evaluations.filter(ev => ev.attendantId === attendant.id);
                const unlockedAchievements = achievements.filter(ach => ach.isUnlocked(attendant, attendantEvaluations, evaluations, attendants));
                return {
                    ...attendant,
                    score: attendantScores[attendant.id]?.totalScore ?? 0,
                    evaluationCount: attendantScores[attendant.id]?.evaluationCount ?? 0,
                    unlockedAchievements
                }
            })
            .filter(att => att.evaluationCount > 0) // Only rank attendants with at least one evaluation
            .sort((a, b) => b.score - a.score);

        return rankedAttendants;

    }, [evaluations, attendants]);

     const achievementStats: AchievementStat[] = useMemo(() => {
        return achievements.map(achievement => {
            const unlockedBy: Attendant[] = [];
            attendants.forEach(attendant => {
                const attendantEvaluations = evaluations.filter(ev => ev.attendantId === attendant.id);
                if (achievement.isUnlocked(attendant, attendantEvaluations, evaluations, attendants)) {
                    unlockedBy.push(attendant);
                }
            });
            return {
                ...achievement,
                unlockedCount: unlockedBy.length,
                totalAttendants: attendants.length,
                progress: attendants.length > 0 ? (unlockedBy.length / attendants.length) * 100 : 0,
                unlockedBy,
            };
        });
    }, [attendants, evaluations]);

    const handleAchievementClick = (achievement: AchievementStat) => {
        setSelectedAchievement(achievement);
        setIsAchievementDialogOpen(true);
    };

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Gamificação e Conquistas</h1>
                    <p className="text-muted-foreground">Competição saudável baseada no desempenho e conquistas.</p>
                </div>
            </div>
            
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Crown /> Leaderboard</CardTitle>
                            <CardDescription>Classificação dos atendentes com base na pontuação total.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Atendente</TableHead>
                                        <TableHead>Conquistas</TableHead>
                                        <TableHead className="text-right">Avaliações</TableHead>
                                        <TableHead className="text-right">Pontuação</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaderboard.map((att, index) => (
                                         <TableRow key={att.id} className={index < 3 ? 'bg-amber-50 dark:bg-amber-950/50' : ''}>
                                            <TableCell className="text-center">{getMedal(index + 1)}</TableCell>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={att.avatarUrl} alt={att.name}/>
                                                        <AvatarFallback><UserCircle /></AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <span>{att.name}</span>
                                                        <div className="text-xs text-muted-foreground capitalize">{att.setor}</div>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <TooltipProvider>
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {att.unlockedAchievements.slice(0, 5).map(ach => (
                                                            <Tooltip key={ach.id}>
                                                                <TooltipTrigger>
                                                                    <div className={`p-1 rounded-full ${ach.color}`}>
                                                                        <ach.icon className="h-4 w-4" />
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p className="font-bold">{ach.title}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        ))}
                                                        {att.unlockedAchievements.length > 5 && (
                                                            <Tooltip>
                                                                <TooltipTrigger>
                                                                    <div className="p-1 text-muted-foreground">
                                                                        +{att.unlockedAchievements.length - 5}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>{att.unlockedAchievements.length - 5} outras conquistas</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                    </div>
                                                </TooltipProvider>
                                            </TableCell>
                                            <TableCell className="text-right">{att.evaluationCount}</TableCell>
                                            <TableCell className="text-right font-bold text-lg">{att.score}</TableCell>
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
                            <CardTitle>Como Funciona a Pontuação?</CardTitle>
                            <CardDescription>Cada avaliação gera pontos para o atendente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <div className="flex justify-between items-center p-2 rounded-md bg-green-50 dark:bg-green-950">
                                <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 5 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                                    <TrendingUp size={16}/> +5 Pontos
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-lime-50 dark:bg-lime-950">
                                <div className="flex items-center gap-2 font-medium text-lime-700 dark:text-lime-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 4 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-lime-600 dark:text-lime-400">
                                     <TrendingUp size={16}/> +3 Pontos
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-blue-50 dark:bg-blue-950">
                                <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 3 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                                    <TrendingUp size={16}/> +1 Ponto
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-orange-50 dark:bg-orange-950">
                                <div className="flex items-center gap-2 font-medium text-orange-700 dark:text-orange-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 2 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                                    <TrendingDown size={16}/> -2 Pontos
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-red-50 dark:bg-red-950">
                                <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 1 Estrela
                                </div>
                                <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                    <TrendingDown size={16}/> -5 Pontos
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

             <div>
                <h2 className="text-2xl font-bold font-heading mb-4">Conquistas Disponíveis</h2>
                <p className="text-muted-foreground mb-6">Objetivos que os atendentes podem alcançar para ganhar reconhecimento. Clique em uma conquista para ver quem já a desbloqueou.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {achievementStats.map(ach => (
                    <Card key={ach.id} className="flex flex-col hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleAchievementClick(ach)}>
                        <CardHeader>
                        <div className="flex items-center gap-4">
                            <div className={`p-2 bg-muted rounded-full ${ach.unlockedCount > 0 ? ach.color : 'text-muted-foreground'}`}>
                            <ach.icon className="h-6 w-6" />
                            </div>
                            <div>
                            <CardTitle className="text-base">{ach.title}</CardTitle>
                            <CardDescription className="text-xs">{ach.description}</CardDescription>
                            </div>
                        </div>
                        </CardHeader>
                        <CardContent className="flex-grow">
                        <div className="space-y-2">
                            <p className="text-sm text-muted-foreground">
                            {ach.unlockedCount} de {ach.totalAttendants} atendentes desbloquearam
                            </p>
                            <Progress value={ach.progress} />
                        </div>
                        </CardContent>
                    </Card>
                    ))}
                </div>
            </div>

            <Dialog open={isAchievementDialogOpen} onOpenChange={setIsAchievementDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                             <div className={`p-2 bg-muted rounded-full ${selectedAchievement?.color}`}>
                                {selectedAchievement && <selectedAchievement.icon className="h-5 w-5" />}
                            </div>
                            {selectedAchievement?.title}
                        </DialogTitle>
                        <DialogDescription>{selectedAchievement?.description}</DialogDescription>
                    </DialogHeader>
                    <div>
                        <h4 className="font-semibold mb-2">Desbloqueada por:</h4>
                        {selectedAchievement && selectedAchievement.unlockedBy.length > 0 ? (
                            <ScrollArea className="h-72">
                                <ul className="space-y-2 pr-4">
                                {selectedAchievement.unlockedBy.map(att => (
                                    <li key={att.id} className="flex items-center gap-3 p-2 rounded-md border">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={att.avatarUrl} alt={att.name}/>
                                            <AvatarFallback><UserCircle size={16} /></AvatarFallback>
                                        </Avatar>
                                        <span>{att.name}</span>
                                    </li>
                                ))}
                                </ul>
                            </ScrollArea>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">Nenhum atendente desbloqueou esta conquista ainda.</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

        </div>
    );
}
