

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
import { ArrowLeft, BarChart3, Calendar, FileText, Hash, Mail, Phone, Star, UserCircle, UserCog } from "lucide-react";
import Link from "next/link";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getScoreFromRating } from '@/lib/xp';
import { achievements } from "@/lib/achievements";
import RewardTrack from "@/components/RewardTrack";

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
    const { attendants, evaluations, loading, user, aiAnalysisResults } = useAuth();

    const attendant = useMemo(() => attendants.find(a => a.id === id), [attendants, id]);
    
    const attendantEvaluations = useMemo(() => {
        return evaluations
            .filter(e => e.attendantId === id)
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    }, [evaluations, id]);
    
    const currentScore = useMemo(() => {
        if (!attendant) return 0;
        
        const scoreFromRatings = attendantEvaluations.reduce((acc, ev) => acc + getScoreFromRating(ev.nota), 0);
        
        const unlockedAchievements = achievements.filter(ach => ach.isUnlocked(attendant, attendantEvaluations, evaluations, attendants, aiAnalysisResults));
        const scoreFromAchievements = unlockedAchievements.reduce((acc, ach) => acc + ach.xp, 0);
        
        return scoreFromRatings + scoreFromAchievements;
    }, [attendant, attendantEvaluations, evaluations, attendants, aiAnalysisResults]);

    const stats = useMemo(() => {
        if (attendantEvaluations.length === 0) {
            return { averageRating: 0, totalEvaluations: 0 };
        }
        const totalRating = attendantEvaluations.reduce((sum, ev) => sum + ev.nota, 0);
        return {
            averageRating: totalRating / attendantEvaluations.length,
            totalEvaluations: attendantEvaluations.length
        };
    }, [attendantEvaluations]);
    
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
                    <Link href="/dashboard/pesquisa-satisfacao/atendentes">
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
                    <Link href="/dashboard/pesquisa-satisfacao/atendentes">
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
                            <CardTitle>Estatísticas</CardTitle>
                            <CardDescription>Resumo do desempenho.</CardDescription>
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
                            <TooltipProvider>
                                <RewardTrack currentXp={currentScore} />
                            </TooltipProvider>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Avaliações</CardTitle>
                             <CardDescription>Todas as avaliações recebidas por {attendant.name.split(' ')[0]}.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nota</TableHead>
                                        <TableHead>Comentário</TableHead>
                                        <TableHead className="text-right">Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendantEvaluations.length > 0 ? (
                                        attendantEvaluations.map((ev) => (
                                            <TableRow key={ev.id}>
                                                <TableCell><RatingStars rating={ev.nota} /></TableCell>
                                                <TableCell className="text-muted-foreground">{ev.comentario}</TableCell>
                                                <TableCell className="text-right text-sm text-muted-foreground">
                                                    {format(new Date(ev.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center h-24">
                                                Nenhuma avaliação encontrada para este atendente.
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
