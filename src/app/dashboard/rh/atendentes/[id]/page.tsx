

"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, BarChart3, Calendar, FileText, Hash, History, Mail, Phone, Sparkles, Star, TrendingDown, TrendingUp, Trophy, UserCircle, UserCog } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { XpEvent } from "@/lib/types";

const RatingStars = ({ rating, className }: { rating: number, className?: string }) => {
    const totalStars = 5;
    return (
        <div className="flex items-center">
            {[...Array(totalStars)].map((_, index) => (
                <Star
                    key={index}
                    className={`h-4 w-4 ${className} ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );
};

const DetailItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: React.ReactNode }) => (
    <div className="flex items-start gap-3">
        <div className="text-muted-foreground mt-1">{icon}</div>
        <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-medium">{value}</p>
        </div>
    </div>
);


export default function AttendantProfilePage() {
    const { id } = useParams();
    const router = useRouter();
    const { attendants, evaluations, loading, user, xpEvents, activeSeason } = useAuth();

    const attendant = useMemo(() => attendants.find(a => a.id === id), [attendants, id]);
    
    const { seasonEvaluations, attendantXpEvents, currentScore } = useMemo(() => {
        const seasonXpEvents = activeSeason 
            ? xpEvents.filter(e => e.attendantId === id && new Date(e.date) >= new Date(activeSeason.startDate) && new Date(e.date) <= new Date(activeSeason.endDate))
            : [];
        
        const currentScore = seasonXpEvents.reduce((acc, event) => acc + event.points, 0);

        const seasonEvaluations = activeSeason
            ? evaluations.filter(e => e.attendantId === id && new Date(e.data) >= new Date(activeSeason.startDate) && new Date(e.data) <= new Date(activeSeason.endDate))
            : [];

        return { seasonEvaluations, attendantXpEvents, currentScore };
    }, [evaluations, xpEvents, id, activeSeason]);
    
    const xpHistorySorted = useMemo(() => {
        return [...attendantXpEvents]
            .map(e => ({...e, icon: e.type === 'evaluation' ? Star : Trophy}))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [attendantXpEvents]);


    const stats = useMemo(() => {
        if (seasonEvaluations.length === 0) {
            return { averageRating: 0, totalEvaluations: 0 };
        }
        const totalRating = seasonEvaluations.reduce((sum, ev) => sum + ev.nota, 0);
        return {
            averageRating: totalRating / seasonEvaluations.length,
            totalEvaluations: seasonEvaluations.length
        };
    }, [seasonEvaluations]);
    
    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
        }
    }, [loading, user, router]);

    if (loading) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    if (!attendant) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Atendente não encontrado</h1>
                <p className="text-muted-foreground">O atendente que você está procurando não existe ou foi removido.</p>
                <Button asChild className="mt-4">
                    <Link href="/dashboard/rh/atendentes">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para a lista
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
                 <Button variant="outline" size="icon" asChild>
                    <Link href="/dashboard/rh/atendentes">
                        <ArrowLeft />
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Perfil do Atendente</h1>
            </div>

            <div className="grid gap-8 lg:grid-cols-3 items-start">
                <div className="lg:col-span-1 space-y-8">
                    <Card>
                        <CardHeader className="items-center text-center">
                             <Avatar className="h-24 w-24 mb-4">
                                <AvatarImage src={attendant.avatarUrl} alt={attendant.name} />
                                <AvatarFallback><UserCircle className="h-12 w-12" /></AvatarFallback>
                            </Avatar>
                            <CardTitle>{attendant.name}</CardTitle>
                            <CardDescription>
                                <Badge variant="secondary">{attendant.funcao}</Badge>
                            </CardDescription>
                             <Badge variant={attendant.status === 'Ativo' ? "default" : "destructive"}>
                                {attendant.status}
                            </Badge>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <DetailItem icon={<Mail size={16} />} label="Email" value={attendant.email} />
                            <DetailItem icon={<Phone size={16} />} label="Telefone" value={attendant.telefone} />
                            <DetailItem icon={<UserCog size={16} />} label="Setor" value={<span className="capitalize">{attendant.setor}</span>} />
                            <DetailItem icon={<FileText size={16} />} label="RG" value={attendant.rg} />
                            <DetailItem icon={<FileText size={16} />} label="CPF" value={attendant.cpf} />
                             <DetailItem icon={<Calendar size={16} />} label="Data de Nascimento" value={format(new Date(attendant.dataNascimento), 'dd/MM/yyyy')} />
                            <DetailItem icon={<Calendar size={16} />} label="Data de Admissão" value={format(new Date(attendant.dataAdmissao), 'dd/MM/yyyy')} />
                             <DetailItem icon={<Hash size={16} />} label="Portaria" value={attendant.portaria} />
                            <DetailItem icon={<Hash size={16} />} label="Situação" value={attendant.situacao} />
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Estatísticas {activeSeason && `(${activeSeason.name})`}</CardTitle>
                            <CardDescription>Resumo do desempenho na temporada atual.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 text-muted-foreground">
                                   <BarChart3 size={18}/>
                                   <span className="text-sm">Total de Avaliações</span>
                               </div>
                               <span className="font-bold text-lg">{stats.totalEvaluations}</span>
                           </div>
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 text-muted-foreground">
                                   <Star size={18}/>
                                   <span className="text-sm">Nota Média</span>
                               </div>
                               <div className="flex items-center gap-2">
                                <span className="font-bold text-lg">{stats.averageRating.toFixed(2)}</span>
                                <RatingStars rating={stats.averageRating} />
                               </div>
                           </div>
                           <div className="flex items-center justify-between">
                               <div className="flex items-center gap-2 text-muted-foreground">
                                   <Sparkles size={18}/>
                                   <span className="text-sm">Pontos de Experiência</span>
                               </div>
                               <span className="font-bold text-lg">{Math.round(currentScore)} XP</span>
                           </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Gamificação e Níveis</CardTitle>
                            <CardDescription>Acompanhe o progresso e as recompensas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                           <Button asChild>
                                <Link href={`/dashboard/gamificacao/niveis?attendantId=${attendant.id}`}>Ver Progresso Detalhado</Link>
                           </Button>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><History /> Histórico de XP</CardTitle>
                             <CardDescription>Eventos que concederam ou removeram pontos de experiência.</CardDescription>
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
                                                    <ev.icon className={cn("h-4 w-4", ev.type === 'achievement' ? 'text-amber-500' : 'text-muted-foreground')} />
                                                    {ev.reason}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={ev.points >= 0 ? 'secondary' : 'destructive'} className="flex items-center gap-1 w-fit">
                                                        {ev.points >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                                        {ev.points >= 0 ? `+${Math.round(ev.points)}` : Math.round(ev.points)} XP
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right text-sm text-muted-foreground">
                                                    {format(new Date(ev.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
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
