
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RatingStars = ({ rating }: { rating: number }) => {
    const totalStars = 5;
    return (
        <div className="flex items-center">
            {[...Array(totalStars)].map((_, index) => (
                <Star
                    key={index}
                    className={`h-4 w-4 ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );
};


export default function AvaliacoesPage() {
    const { user, isAuthenticated, loading, evaluations, attendants } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    const attendantMap = useMemo(() => {
        return attendants.reduce((acc, attendant) => {
            acc[attendant.id] = attendant.name;
            return acc;
        }, {} as Record<string, string>);
    }, [attendants]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    const sortedEvaluations = [...evaluations].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold">Todas as Avaliações</h1>

            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Histórico Completo</CardTitle>
                    <CardDescription>Lista de todas as avaliações de satisfação registradas no sistema.</CardDescription>
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
                            {sortedEvaluations.map((evaluation) => (
                                <TableRow key={evaluation.id}>
                                    <TableCell className="font-medium">
                                        <Badge variant="outline">{attendantMap[evaluation.attendantId] || "Desconhecido"}</Badge>
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

    