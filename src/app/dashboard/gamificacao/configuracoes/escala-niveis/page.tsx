"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { UserCircle, Shield, TrendingUp, Users, Award, BarChart3 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLevelFromXp, MAX_LEVEL, getXpForLevel } from '@/lib/xp';
import { RewardTrack, SeasonStatus } from "@/components/gamification";
import { Progress } from "@/components/ui/progress";
import LevelScale from "@/components/gamification/LevelScale";
import Link from "next/link";

const getMedal = (rank: number) => {
    if (rank === 1) return <span className="text-2xl" title="1º Lugar">🥇</span>;
    if (rank === 2) return <span className="text-2xl" title="2º Lugar">🥈</span>;
    if (rank === 3) return <span className="text-2xl" title="3º Lugar">🥉</span>;
    return <span className="text-muted-foreground font-semibold">{rank}º</span>
};

export default function EscalaNiveisPage() {
    const { user, isAuthenticated, loading, attendants, seasonXpEvents, activeSeason, nextSeason } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("overview");

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const leaderboard = useMemo(() => {
        const xpByAttendant = new Map<string, number>();

        seasonXpEvents.forEach(event => {
            const currentXp = xpByAttendant.get(event.attendantId) || 0;
            xpByAttendant.set(event.attendantId, currentXp + event.points);
        });

        return attendants
            .map(attendant => {
                const totalScore = xpByAttendant.get(attendant.id) || 0;
                const levelData = getLevelFromXp(totalScore);

                return {
                    ...attendant,
                    score: totalScore,
                    level: levelData.level,
                    progress: levelData.progress,
                    xpForNextLevel: levelData.xpForNextLevel,
                }
            })
            .sort((a, b) => b.score - a.score);

    }, [attendants, seasonXpEvents]);

    // Estatísticas do sistema
    const systemStats = useMemo(() => {
        const totalXp = leaderboard.reduce((sum, att) => sum + att.score, 0);
        const averageXp = totalXp / (leaderboard.length || 1);
        const highestLevel = Math.max(...leaderboard.map(att => att.level));
        const levelDistribution = new Map<number, number>();
        
        leaderboard.forEach(att => {
            levelDistribution.set(att.level, (levelDistribution.get(att.level) || 0) + 1);
        });

        const topLevel = leaderboard[0];
        const progressToMax = topLevel ? (topLevel.score / getXpForLevel(MAX_LEVEL)) * 100 : 0;

        return {
            totalAttendants: leaderboard.length,
            totalXp: Math.round(totalXp),
            averageXp: Math.round(averageXp),
            highestLevel,
            levelDistribution,
            progressToMax: Math.round(progressToMax * 100) / 100
        };
    }, [leaderboard]);


    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const topAttendant = leaderboard[0];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Sistema de Níveis e Progressão</h1>
                <p className="text-muted-foreground">
                    Gerencie e acompanhe o sistema de níveis, escalas de XP e progresso da equipe.
                </p>
            </div>
            
            <SeasonStatus activeSeason={activeSeason || undefined} nextSeason={nextSeason || undefined} />

            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Total de Atendentes</p>
                                <p className="text-2xl font-bold">{systemStats.totalAttendants}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-green-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">XP Total do Sistema</p>
                                <p className="text-2xl font-bold">{systemStats.totalXp.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-purple-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">XP Médio</p>
                                <p className="text-2xl font-bold">{systemStats.averageXp.toLocaleString()}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-2">
                            <Award className="h-5 w-5 text-amber-500" />
                            <div>
                                <p className="text-sm text-muted-foreground">Nível Mais Alto</p>
                                <p className="text-2xl font-bold flex items-center gap-1">
                                    <Shield className="h-5 w-5" />
                                    {systemStats.highestLevel}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="scale">Escala de Níveis</TabsTrigger>
                    <TabsTrigger value="leaderboard">Ranking</TabsTrigger>
                    <TabsTrigger value="rewards">Recompensas</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Distribuição por Níveis</CardTitle>
                                <CardDescription>
                                    Quantidade de atendentes em cada nível
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {Array.from(systemStats.levelDistribution.entries())
                                        .sort(([a], [b]) => b - a)
                                        .slice(0, 10)
                                        .map(([level, count]) => (
                                        <div key={level} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Shield className="h-4 w-4 text-blue-500" />
                                                <span className="font-medium">Nível {level}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="secondary">{count} atendente{count !== 1 ? 's' : ''}</Badge>
                                                <div className="w-20 bg-muted rounded-full h-2">
                                                    <div 
                                                        className="bg-blue-500 h-2 rounded-full" 
                                                        style={{ width: `${(count / systemStats.totalAttendants) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Líder Atual</CardTitle>
                                <CardDescription>
                                    Atendente com maior pontuação na temporada
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                {topAttendant ? (
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-4">
                                            <Avatar className="h-16 w-16">
                                                <AvatarImage src={topAttendant.avatarUrl || undefined} alt={topAttendant.name} />
                                                <AvatarFallback><UserCircle /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <h3 className="text-xl font-bold">{topAttendant.name}</h3>
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <Shield className="h-4 w-4" />
                                                    <span>Nível {topAttendant.level}</span>
                                                </div>
                                            </div>
                                            <div className="ml-auto text-right">
                                                <p className="text-2xl font-bold text-amber-500">🥇</p>
                                                <p className="text-sm text-muted-foreground">1º Lugar</p>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span>XP Total</span>
                                                <span className="font-bold">{Math.round(topAttendant.score).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span>Progresso para Nível {topAttendant.level + 1}</span>
                                                <span className="font-bold">{Math.round(topAttendant.progress)}%</span>
                                            </div>
                                            <Progress value={topAttendant.progress} className="h-2" />
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">Nenhum atendente encontrado</p>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="scale">
                    <LevelScale 
                        currentLevel={topAttendant?.level || 1}
                        currentXp={topAttendant?.score || 0}
                    />
                </TabsContent>

                <TabsContent value="leaderboard">
                    <Card>
                        <CardHeader>
                            <CardTitle>Ranking da Equipe</CardTitle>
                            <CardDescription>
                                Classificação dos atendentes por XP e nível atual
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-16 text-center">Posição</TableHead>
                                        <TableHead>Atendente</TableHead>
                                        <TableHead className="text-center">Nível</TableHead>
                                        <TableHead className="w-[200px]">Progresso para o Próximo Nível</TableHead>
                                        <TableHead className="text-right">XP Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {leaderboard.map((att, index) => (
                                        <TableRow key={att.id}>
                                            <TableCell className="text-center">{getMedal(index + 1)}</TableCell>
                                            <TableCell className="font-medium">
                                                <Link href={`/dashboard/rh/atendentes/${att.id}`} className="flex items-center gap-3 group">
                                                    <Avatar className="h-9 w-9">
                                                        <AvatarImage src={att.avatarUrl || undefined} alt={att.name}/>
                                                        <AvatarFallback><UserCircle /></AvatarFallback>
                                                    </Avatar>
                                                    <span className="group-hover:underline">{att.name}</span>
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-1 font-bold">
                                                    <Shield size={16} className="text-blue-500" />
                                                    {att.level}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <Progress value={att.progress} className="h-2" />
                                                    <span className="text-xs text-muted-foreground mt-1 text-center">
                                                        {Math.round(att.score)} / {att.xpForNextLevel} XP
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-lg">{Math.round(att.score)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="rewards">
                    <Card>
                        <CardHeader>
                            <CardTitle>Trilha de Recompensas (Nível 1 a {MAX_LEVEL})</CardTitle>
                            <CardDescription>
                                Jornada de progressão completa com recompensas desbloqueáveis
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <TooltipProvider>
                                <RewardTrack showAttendantProgress={false} />
                            </TooltipProvider>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}