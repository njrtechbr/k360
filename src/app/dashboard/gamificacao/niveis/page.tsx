"use client";

import { useSession } from "next-auth/react";
import { usePrisma } from "@/providers/PrismaProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Shield } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getLevelFromXp, MAX_LEVEL } from '@/lib/xp';
import { RewardTrack } from "@/components/gamification";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";

const getMedal = (rank: number) => {
    if (rank === 1) return <span className="text-2xl" title="1º Lugar">🥇</span>;
    if (rank === 2) return <span className="text-2xl" title="2º Lugar">🥈</span>;
    if (rank === 3) return <span className="text-2xl" title="3º Lugar">🥉</span>;
    return <span className="text-muted-foreground font-semibold">{rank}º</span>
};

export default function NiveisPage() {
    const { data: session, status } = useSession();
    const { attendants, seasonXpEvents, appLoading } = usePrisma();
    const router = useRouter();

    const user = session?.user;
    const isAuthenticated = !!session;
    const loading = status === "loading" || appLoading;

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const leaderboard = useMemo(() => {
        const xpByAttendant = new Map<string, number>();

        // Verificação de segurança para seasonXpEvents
        if (seasonXpEvents.data && Array.isArray(seasonXpEvents.data)) {
            seasonXpEvents.data.forEach(event => {
                const currentXp = xpByAttendant.get(event.attendantId) || 0;
                xpByAttendant.set(event.attendantId, currentXp + event.points);
            });
        }
        
        // Verificação de segurança para attendants
        if (!attendants.data || !Array.isArray(attendants.data)) {
            return [];
        }
        
        return attendants.data
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

    }, [attendants.data, seasonXpEvents.data]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Níveis e Progresso</h1>
                <p className="text-muted-foreground">Acompanhe a trilha de recompensas e o progresso de cada atendente.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Trilha de Recompensas (Nível 1 a {MAX_LEVEL})</CardTitle>
                    <CardDescription>Esta é a jornada de progressão completa. Desbloqueie recompensas ao atingir novos níveis.</CardDescription>
                </CardHeader>
                <CardContent>
                    <TooltipProvider>
                        <RewardTrack showAttendantProgress={false} />
                    </TooltipProvider>
                </CardContent>
            </Card>

            <Card>
                 <CardHeader>
                    <CardTitle>Progresso da Equipe</CardTitle>
                    <CardDescription>Veja o nível e o progresso de cada atendente no sistema.</CardDescription>
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
                                        <Link href={`/perfil/${att.id}`} className="flex items-center gap-3 group">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={att.avatarUrl} alt={att.name}/>
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
                                                {att.score} / {att.xpForNextLevel} XP
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">{att.score}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                   </Table>
                </CardContent>
            </Card>
        </div>
    );
}