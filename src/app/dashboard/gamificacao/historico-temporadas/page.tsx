
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, UserCircle, Shield } from "lucide-react";
import { getLevelFromXp } from '@/lib/xp';
import Link from "next/link";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GamificationSeason } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const getMedal = (rank: number) => {
    if (rank === 1) return <span className="text-2xl" title="1º Lugar">🥇</span>;
    if (rank === 2) return <span className="text-2xl" title="2º Lugar">🥈</span>;
    if (rank === 3) return <span className="text-2xl" title="3º Lugar">🥉</span>;
    return <span className="text-muted-foreground font-semibold">{rank}º</span>
};

export default function HistoricoTemporadasPage() {
    const { user, isAuthenticated, loading, attendants, xpEvents, seasons } = useAuth();
    const router = useRouter();
    
    const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

    const pastSeasons = useMemo(() => {
        const now = new Date();
        return seasons
            .filter(s => new Date(s.endDate) < now)
            .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
    }, [seasons]);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
        // Set the default selected season to the most recent past season
        if (pastSeasons.length > 0 && !selectedSeasonId) {
            setSelectedSeasonId(pastSeasons[0].id);
        }
    }, [isAuthenticated, loading, router, pastSeasons, selectedSeasonId]);

    const selectedSeason = useMemo(() => {
        return seasons.find(s => s.id === selectedSeasonId) || null;
    }, [seasons, selectedSeasonId]);
    
    const leaderboard = useMemo(() => {
        if (!selectedSeason) return [];

        const xpByAttendant = new Map<string, number>();
        const seasonStartDate = new Date(selectedSeason.startDate);
        const seasonEndDate = new Date(selectedSeason.endDate);

        const seasonXpEvents = xpEvents.filter(e => {
            const eventDate = new Date(e.date);
            return eventDate >= seasonStartDate && eventDate <= seasonEndDate;
        });
        
        seasonXpEvents.forEach(event => {
            const currentXp = xpByAttendant.get(event.attendantId) || 0;
            xpByAttendant.set(event.attendantId, currentXp + event.points);
        });

        return attendants
            .map(attendant => {
                const totalScore = xpByAttendant.get(attendant.id) || 0;
                return {
                    ...attendant,
                    score: Math.round(totalScore),
                    level: getLevelFromXp(totalScore).level,
                }
            })
            .filter(att => att.score > 0)
            .sort((a, b) => b.score - a.score);

    }, [attendants, xpEvents, selectedSeason]);


    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Histórico de Temporadas (Hall da Fama)</h1>
                    <p className="text-muted-foreground">Veja os resultados e o ranking final de temporadas anteriores.</p>
                </div>
                 <div>
                    <Select onValueChange={setSelectedSeasonId} value={selectedSeasonId ?? undefined}>
                        <SelectTrigger className="w-[280px]">
                            <SelectValue placeholder="Selecione uma temporada" />
                        </SelectTrigger>
                        <SelectContent>
                            {pastSeasons.map(season => (
                                <SelectItem key={season.id} value={season.id}>
                                    {season.name} ({format(parseISO(season.startDate), 'dd/MM/yy')} - {format(parseISO(season.endDate), 'dd/MM/yy')})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                 </div>
            </div>
            
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Crown /> Leaderboard: {selectedSeason?.name || 'Selecione uma temporada'}</CardTitle>
                    <CardDescription>
                        {selectedSeason 
                            ? `Classificação final da temporada de ${format(parseISO(selectedSeason.startDate), "dd 'de' MMMM", { locale: ptBR })} a ${format(parseISO(selectedSeason.endDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}.`
                            : "Selecione uma temporada acima para ver os resultados."
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-16 text-center">Posição</TableHead>
                                <TableHead>Atendente</TableHead>
                                <TableHead className="text-center">Nível Atingido</TableHead>
                                <TableHead className="text-right">XP Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {leaderboard.length > 0 ? leaderboard.map((att, index) => (
                                <TableRow key={att.id} className={index < 3 ? 'bg-amber-50 dark:bg-amber-950/50' : ''}>
                                    <TableCell className="text-center">{getMedal(index + 1)}</TableCell>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/rh/atendentes/${att.id}`} className="flex items-center gap-3 group">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={att.avatarUrl} alt={att.name}/>
                                                <AvatarFallback><UserCircle /></AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <span className="group-hover:underline">{att.name}</span>
                                                <div className="text-xs text-muted-foreground capitalize">{att.setor}</div>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-1 font-bold">
                                            <Shield size={16} className="text-blue-500" />
                                            {att.level}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-lg">{att.score}</TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        {selectedSeasonId ? "Nenhum dado de XP encontrado para esta temporada." : "Selecione uma temporada para começar."}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
