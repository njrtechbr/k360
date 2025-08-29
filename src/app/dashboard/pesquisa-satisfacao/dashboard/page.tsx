
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, UserCheck, BarChart3, List, Users } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import Link from "next/link";
import { Button } from "@/components/ui/button";

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

const chartConfig = {
    ratings: {
      label: "Avaliações",
    },
    '5': { label: '5 Estrelas', color: 'hsl(var(--chart-5))' },
    '4': { label: '4 Estrelas', color: 'hsl(var(--chart-4))' },
    '3': { label: '3 Estrelas', color: 'hsl(var(--chart-3))' },
    '2': { label: '2 Estrelas', color: 'hsl(var(--chart-2))' },
    '1': { label: '1 Estrela', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig


export default function DashboardAvaliacoesPage() {
    const { user, isAuthenticated, loading, evaluations, attendants } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);
    
    const attendantMap = useMemo(() => {
        return attendants.reduce((acc, attendant) => {
            acc[attendant.id] = { name: attendant.name, avatarUrl: attendant.avatarUrl };
            return acc;
        }, {} as Record<string, {name: string, avatarUrl: string}>);
    }, [attendants]);

    const dashboardData = useMemo(() => {
        const totalEvaluations = evaluations.length;
        if (totalEvaluations === 0) {
            return {
                totalEvaluations: 0,
                averageRating: 0,
                ratingsDistribution: [],
                bestAttendant: { id: '', name: 'N/A', avgRating: 0, count: 0 },
                mostEvaluatedAttendant: { id: '', name: 'N/A', count: 0 },
                recentEvaluations: [],
                topRatedAttendants: [],
            };
        }

        const totalRatingSum = evaluations.reduce((sum, ev) => sum + ev.nota, 0);
        const averageRating = totalRatingSum / totalEvaluations;

        const ratingsDistribution = [
            { rating: '5 Estrelas', count: evaluations.filter(e => e.nota === 5).length, fill: 'var(--color-5)' },
            { rating: '4 Estrelas', count: evaluations.filter(e => e.nota === 4).length, fill: 'var(--color-4)' },
            { rating: '3 Estrelas', count: evaluations.filter(e => e.nota === 3).length, fill: 'var(--color-3)' },
            { rating: '2 Estrelas', count: evaluations.filter(e => e.nota === 2).length, fill: 'var(--color-2)' },
            { rating: '1 Estrela', count: evaluations.filter(e => e.nota === 1).length, fill: 'var(--color-1)' },
        ];


        const attendantStats: Record<string, { sum: number; count: number, name: string }> = {};
        evaluations.forEach(ev => {
            if (!attendantStats[ev.attendantId]) {
                attendantStats[ev.attendantId] = { sum: 0, count: 0, name: attendantMap[ev.attendantId]?.name || 'Desconhecido' };
            }
            attendantStats[ev.attendantId].sum += ev.nota;
            attendantStats[ev.attendantId].count++;
        });

        const attendantRanking = Object.entries(attendantStats).map(([id, stats]) => ({
            id,
            name: stats.name,
            avgRating: stats.sum / stats.count,
            count: stats.count
        }));
        
        const bestAttendant = [...attendantRanking].sort((a,b) => b.avgRating - a.avgRating)[0] ?? { id: '', name: 'N/A', avgRating: 0, count: 0 };
        const mostEvaluatedAttendant = [...attendantRanking].sort((a,b) => b.count - a.count)[0] ?? { id: '', name: 'N/A', count: 0 };
        const topRatedAttendants = [...attendantRanking].sort((a,b) => b.avgRating - a.avgRating).slice(0, 5);

        const recentEvaluations = [...evaluations]
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
            .slice(0, 5);

        return {
            totalEvaluations,
            averageRating,
            ratingsDistribution,
            bestAttendant,
            mostEvaluatedAttendant,
            recentEvaluations,
            topRatedAttendants
        };

    }, [evaluations, attendantMap]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Dashboard de Avaliações</h1>
                    <p className="text-muted-foreground">Métricas e insights sobre a satisfação dos clientes.</p>
                </div>
                 <Button asChild variant="outline">
                    <Link href="/dashboard/pesquisa-satisfacao/avaliacoes">
                        <List className="mr-2 h-4 w-4" />
                        Ver todas as avaliações
                    </Link>
                </Button>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Avaliações</CardTitle>
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardData.totalEvaluations}</div>
                        <p className="text-xs text-muted-foreground">avaliações recebidas no total</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Nota Média Geral</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dashboardData.averageRating.toFixed(2)}</div>
                         <RatingStars rating={dashboardData.averageRating} />
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Melhor Avaliado</CardTitle>
                        <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold truncate">
                            <Link href={`/dashboard/rh/atendentes/${dashboardData.bestAttendant.id}`} className="hover:underline">
                                {dashboardData.bestAttendant.name}
                            </Link>
                        </div>
                        <p className="text-xs text-muted-foreground">Nota média de {dashboardData.bestAttendant.avgRating.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mais Avaliado</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                         <div className="text-2xl font-bold truncate">
                            <Link href={`/dashboard/rh/atendentes/${dashboardData.mostEvaluatedAttendant.id}`} className="hover:underline">
                                {dashboardData.mostEvaluatedAttendant.name}
                            </Link>
                        </div>
                        <p className="text-xs text-muted-foreground">{dashboardData.mostEvaluatedAttendant.count} avaliações recebidas</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Distribuição de Notas</CardTitle>
                        <CardDescription>Contagem de avaliações para cada nota.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
                            <BarChart accessibilityLayer data={dashboardData.ratingsDistribution} layout="vertical" margin={{ left: 10 }}>
                                <YAxis dataKey="rating" type="category" tickLine={false} tickMargin={10} axisLine={false} />
                                <XAxis dataKey="count" type="number" hide />
                                <ChartTooltip 
                                    cursor={false} 
                                    content={<ChartTooltipContent labelKey="rating" hideIndicator />}
                                />
                                <Bar dataKey="count" radius={5} />
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Top 5 Atendentes</CardTitle>
                        <CardDescription>Ranking dos atendentes com as melhores notas médias.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Atendente</TableHead>
                                    <TableHead className="text-right">Nota / Avaliações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dashboardData.topRatedAttendants.map(att => (
                                    <TableRow key={att.id}>
                                        <TableCell className="font-medium">
                                            <Link href={`/dashboard/rh/atendentes/${att.id}`} className="hover:underline">
                                                {att.name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">
                                           <div className="flex justify-end items-center gap-2">
                                                <span className="font-semibold">{att.avgRating.toFixed(2)}</span>
                                                <Star className="h-4 w-4 text-yellow-400" />
                                                <span className="text-xs text-muted-foreground">({att.count})</span>
                                           </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Avaliações Recentes</CardTitle>
                    <CardDescription>As últimas 5 avaliações recebidas.</CardDescription>
                </CardHeader>
                 <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Atendente</TableHead>
                                <TableHead>Nota</TableHead>
                                <TableHead>Comentário</TableHead>
                                <TableHead className="text-right">Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {dashboardData.recentEvaluations.map((evaluation) => (
                                <TableRow key={evaluation.id}>
                                    <TableCell className="font-medium">
                                        <Link href={`/dashboard/rh/atendentes/${evaluation.attendantId}`} className="hover:underline">
                                            <Badge variant="outline">{attendantMap[evaluation.attendantId]?.name || "Desconhecido"}</Badge>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <RatingStars rating={evaluation.nota} />
                                    </TableCell>
                                    <TableCell className="text-muted-foreground max-w-sm truncate">
                                        {evaluation.comentario}
                                    </TableCell>
                                    <TableCell className="text-right text-muted-foreground">
                                        {format(new Date(evaluation.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </div>
    );
}
