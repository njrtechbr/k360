"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, TrendingUp, TrendingDown, Award, AlertTriangle } from "lucide-react";

interface AttendantRating {
    attendantId: string;
    attendantName: string;
    averageRating: number;
    totalEvaluations: number;
    satisfactionRate: number;
}

interface AttendantPerformanceTableProps {
    topRated: AttendantRating[];
    lowestRated: AttendantRating[];
    loading?: boolean;
}

export function AttendantPerformanceTable({ 
    topRated, 
    lowestRated, 
    loading = false 
}: AttendantPerformanceTableProps) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-48" />
                            <Skeleton className="h-4 w-64" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <div key={j} className="flex items-center justify-between">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-4 w-16" />
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    const getRatingBadge = (rating: number) => {
        if (rating >= 4.5) return <Badge className="bg-green-100 text-green-800">Excelente</Badge>;
        if (rating >= 4.0) return <Badge className="bg-blue-100 text-blue-800">Muito Bom</Badge>;
        if (rating >= 3.5) return <Badge className="bg-yellow-100 text-yellow-800">Bom</Badge>;
        if (rating >= 3.0) return <Badge className="bg-orange-100 text-orange-800">Regular</Badge>;
        return <Badge className="bg-red-100 text-red-800">Precisa Melhorar</Badge>;
    };

    const renderStars = (rating: number) => {
        return (
            <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                        key={i}
                        className={`h-4 w-4 ${
                            i < Math.floor(rating) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : i < rating 
                                    ? 'fill-yellow-200 text-yellow-400' 
                                    : 'text-gray-300'
                        }`}
                    />
                ))}
                <span className="ml-2 text-sm font-medium">{rating.toFixed(2)}</span>
            </div>
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Rated Attendants */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-green-600" />
                        Melhores Avaliados
                    </CardTitle>
                    <CardDescription>
                        Atendentes com as melhores notas médias
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {topRated.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Nenhum atendente avaliado no período</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Posição</TableHead>
                                    <TableHead>Atendente</TableHead>
                                    <TableHead>Nota Média</TableHead>
                                    <TableHead>Avaliações</TableHead>
                                    <TableHead>Satisfação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {topRated.slice(0, 10).map((attendant, index) => (
                                    <TableRow key={attendant.attendantId}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                                    index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                    index === 1 ? 'bg-gray-100 text-gray-800' :
                                                    index === 2 ? 'bg-orange-100 text-orange-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {index + 1}
                                                </div>
                                                {index < 3 && (
                                                    <TrendingUp className="h-4 w-4 text-green-600" />
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {attendant.attendantName}
                                        </TableCell>
                                        <TableCell>
                                            {renderStars(attendant.averageRating)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {attendant.totalEvaluations}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-green-600">
                                                    {attendant.satisfactionRate.toFixed(1)}%
                                                </span>
                                                {getRatingBadge(attendant.averageRating)}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Lowest Rated Attendants */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        Precisam de Atenção
                    </CardTitle>
                    <CardDescription>
                        Atendentes com notas abaixo da média que precisam de suporte
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {lowestRated.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>Todos os atendentes estão com bom desempenho!</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Atendente</TableHead>
                                    <TableHead>Nota Média</TableHead>
                                    <TableHead>Avaliações</TableHead>
                                    <TableHead>Satisfação</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowestRated.slice(0, 10).map((attendant) => (
                                    <TableRow key={attendant.attendantId}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-600" />
                                                {attendant.attendantName}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {renderStars(attendant.averageRating)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {attendant.totalEvaluations}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-red-600">
                                                {attendant.satisfactionRate.toFixed(1)}%
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {getRatingBadge(attendant.averageRating)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}