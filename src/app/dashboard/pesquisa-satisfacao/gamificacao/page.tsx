
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star as StarIcon, TrendingUp, TrendingDown, UserCircle, Shield, ChevronRight, BookOpen, BarChartHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Attendant, Achievement } from "@/lib/types";
import { getScoreFromRating, getLevelFromXp } from '@/lib/xp';
import { achievements } from "@/lib/achievements";
import RewardTrack from "@/components/RewardTrack";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const getMedal = (rank: number) => {
    if (rank === 1) return <span className="text-2xl" title="1º Lugar">🥇</span>;
    if (rank === 2) return <span className="text-2xl" title="2º Lugar">🥈</span>;
    if (rank === 3) return <span className="text-2xl" title="3º Lugar">🥉</span>;
    return <span className="text-muted-foreground font-semibold">{rank}º</span>
};

type AchievementStat = Achievement & {
  unlockedCount: number;
  totalAttendants: number;
  progress: number;
  unlockedBy: Attendant[];
};

export default function GamificacaoPage() {
    const { user, isAuthenticated, loading, evaluations, attendants, aiAnalysisResults } = useAuth();
    const router = useRouter();
    const [isAchievementDialogOpen, setIsAchievementDialogOpen] = useState(false);
    const [selectedAchievement, setSelectedAchievement] = useState<AchievementStat | null>(null);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const leaderboard = useMemo(() => {
        return attendants
            .map(attendant => {
                const attendantEvaluations = evaluations.filter(ev => ev.attendantId === attendant.id);
                
                const scoreFromRatings = attendantEvaluations.reduce((acc, ev) => acc + getScoreFromRating(ev.nota), 0);
                
                const unlockedAchievements = achievements.filter(ach => ach.isUnlocked(attendant, attendantEvaluations, evaluations, attendants, aiAnalysisResults));
                const scoreFromAchievements = unlockedAchievements.reduce((acc, ach) => acc + ach.xp, 0);

                return {
                    ...attendant,
                    score: scoreFromRatings + scoreFromAchievements,
                    evaluationCount: attendantEvaluations.length,
                    unlockedAchievements
                }
            })
            .filter(att => att.evaluationCount > 0)
            .sort((a, b) => b.score - a.score);

    }, [evaluations, attendants, aiAnalysisResults]);

     const achievementStats: AchievementStat[] = useMemo(() => {
        return achievements.map(achievement => {
            const unlockedBy: Attendant[] = [];
            attendants.forEach(attendant => {
                const attendantEvaluations = evaluations.filter(ev => ev.attendantId === attendant.id);
                if (achievement.isUnlocked(attendant, attendantEvaluations, evaluations, attendants, aiAnalysisResults)) {
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
    }, [attendants, evaluations, aiAnalysisResults]);

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
                    <h1 className="text-3xl font-bold">Gamificação</h1>
                    <p className="text-muted-foreground">Acompanhe o ranking, o progresso e as recompensas da equipe.</p>
                </div>
            </div>

             <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BarChartHorizontal /> Níveis e Progresso</CardTitle>
                        <CardDescription>Visualize a trilha de recompensas completa e a classificação geral da equipe.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Button asChild>
                           <Link href="/dashboard/pesquisa-satisfacao/niveis">Ver Progresso dos Níveis</Link>
                       </Button>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><BookOpen /> Manual da Gamificação</CardTitle>
                        <CardDescription>Entenda como funciona o sistema de pontos, níveis e troféus.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <Button asChild>
                           <Link href="/dashboard/pesquisa-satisfacao/manual">Ler o Manual</Link>
                       </Button>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-8 lg:grid-cols-3">
                <div className="lg:col-span-2">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Crown /> Leaderboard</CardTitle>
                            <CardDescription>Classificação dos atendentes com base na pontuação total (XP).</CardDescription>
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
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 font-bold">
                                                  <Shield size={16} className="text-blue-500" />
                                                  {getLevelFromXp(att.score).level}
                                                </div>
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
                            <CardTitle>Como Ganhar XP?</CardTitle>
                            <CardDescription>Cada avaliação gera ou remove pontos de experiência.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <div className="flex justify-between items-center p-2 rounded-md bg-green-50 dark:bg-green-950">
                                <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 5 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                                    <TrendingUp size={16}/> +5 XP
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-lime-50 dark:bg-lime-950">
                                <div className="flex items-center gap-2 font-medium text-lime-700 dark:text-lime-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 4 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-lime-600 dark:text-lime-400">
                                     <TrendingUp size={16}/> +3 XP
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-blue-50 dark:bg-blue-950">
                                <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 3 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                                    <TrendingUp size={16}/> +1 XP
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-orange-50 dark:bg-orange-950">
                                <div className="flex items-center gap-2 font-medium text-orange-700 dark:text-orange-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 2 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                                    <TrendingDown size={16}/> -2 XP
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-red-50 dark:bg-red-950">
                                <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
                                    <StarIcon className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 1 Estrela
                                </div>
                                <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                    <TrendingDown size={16}/> -5 XP
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

             <div>
                <h2 className="text-2xl font-bold font-heading mb-4">Galeria de Troféus</h2>
                <p className="text-muted-foreground mb-6">Desbloqueie troféus para ganhar XP bônus e acelerar sua progressão. Clique para ver os detalhes.</p>
                <div className="space-y-2">
                    {achievementStats.map(ach => (
                    <Card key={ach.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleAchievementClick(ach)}>
                        <div className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 bg-muted rounded-full ${ach.unlockedCount > 0 ? ach.color : 'text-muted-foreground'}`}>
                                <ach.icon className="h-6 w-6" />
                                </div>
                                <div>
                                <p className="font-semibold">{ach.title}</p>
                                <p className="text-xs text-muted-foreground">{ach.description}</p>
                                </div>
                            </div>
                             <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="font-semibold text-green-600">+{ach.xp} XP</p>
                                    <p className="text-xs text-muted-foreground">{ach.unlockedCount} / {ach.totalAttendants} Desbloquearam</p>
                                </div>
                                <ChevronRight className="text-muted-foreground"/>
                             </div>
                        </div>
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

    