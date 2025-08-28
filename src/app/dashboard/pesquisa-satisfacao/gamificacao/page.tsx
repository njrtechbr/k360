
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Star, TrendingDown, TrendingUp, UserCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function GamificacaoPage() {
    const { user, isAuthenticated, loading, evaluations, attendants } = useAuth();
    const router = useRouter();

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
            .map(attendant => ({
                ...attendant,
                score: attendantScores[attendant.id]?.totalScore ?? 0,
                evaluationCount: attendantScores[attendant.id]?.evaluationCount ?? 0,
            }))
            .filter(att => att.evaluationCount > 0) // Only rank attendants with at least one evaluation
            .sort((a, b) => b.score - a.score);

        return rankedAttendants;

    }, [evaluations, attendants]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Ranking de Atendentes</h1>
                    <p className="text-muted-foreground">Competição saudável baseada no desempenho.</p>
                </div>
            </div>
            
            <div className="grid gap-8 md:grid-cols-3">
                <div className="md:col-span-2">
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
                                        <TableHead>Setor</TableHead>
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
                                                    <span>{att.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge variant="outline" className="capitalize">{att.setor}</Badge></TableCell>
                                            <TableCell className="text-right">{att.evaluationCount}</TableCell>
                                            <TableCell className="text-right font-bold text-lg">{att.score}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className="md:col-span-1">
                    <Card className="shadow-lg sticky top-24">
                         <CardHeader>
                            <CardTitle>Como Funciona a Pontuação?</CardTitle>
                            <CardDescription>Cada avaliação gera pontos para o atendente.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                             <div className="flex justify-between items-center p-2 rounded-md bg-green-50 dark:bg-green-950">
                                <div className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 5 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-green-600 dark:text-green-400">
                                    <TrendingUp size={16}/> +5 Pontos
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-lime-50 dark:bg-lime-950">
                                <div className="flex items-center gap-2 font-medium text-lime-700 dark:text-lime-300">
                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 4 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-lime-600 dark:text-lime-400">
                                     <TrendingUp size={16}/> +3 Pontos
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-blue-50 dark:bg-blue-950">
                                <div className="flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 3 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                                    <TrendingUp size={16}/> +1 Ponto
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-orange-50 dark:bg-orange-950">
                                <div className="flex items-center gap-2 font-medium text-orange-700 dark:text-orange-300">
                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 2 Estrelas
                                </div>
                                <div className="flex items-center gap-1 font-bold text-orange-600 dark:text-orange-400">
                                    <TrendingDown size={16}/> -2 Pontos
                                </div>
                            </div>
                             <div className="flex justify-between items-center p-2 rounded-md bg-red-50 dark:bg-red-950">
                                <div className="flex items-center gap-2 font-medium text-red-700 dark:text-red-300">
                                    <Star className="h-4 w-4 text-yellow-400 fill-yellow-400"/> 1 Estrela
                                </div>
                                <div className="flex items-center gap-1 font-bold text-red-600 dark:text-red-400">
                                    <TrendingDown size={16}/> -5 Pontos
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

            </div>

        </div>
    );
}
