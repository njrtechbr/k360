
"use client";

import { useAuth } from "@/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Star, Sparkles, AlertTriangle, CheckCircle, MinusCircle, Bot, MessageSquareText, Hourglass, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import type { Evaluation, EvaluationAnalysis } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";

const RatingStars = ({ rating, className = 'h-4 w-4' }: { rating: number, className?: string }) => {
    const totalStars = 5;
    return (
        <div className="flex items-center">
            {[...Array(totalStars)].map((_, index) => (
                <Star
                    key={index}
                    className={`${className} ${index < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                />
            ))}
        </div>
    );
};

const SentimentBadge = ({ sentiment }: { sentiment: EvaluationAnalysis['sentiment'] }) => {
    switch (sentiment) {
        case "Positivo":
            return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle className="mr-1 h-3 w-3"/>Positivo</Badge>;
        case "Negativo":
            return <Badge variant="destructive"><AlertTriangle className="mr-1 h-3 w-3"/>Negativo</Badge>;
        case "Neutro":
            return <Badge variant="outline"><MinusCircle className="mr-1 h-3 w-3"/>Neutro</Badge>;
        default:
            return <Badge variant="outline">N/A</Badge>;
    }
};

export default function AnaliseSentimentoPage() {
    const { user, isAuthenticated, loading, evaluations, attendants, runAiAnalysis, aiAnalysisResults, lastAiAnalysis, isAiAnalysisRunning, analysisProgress, isProgressModalOpen, setIsProgressModalOpen } = useAuth();
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

    const evaluationMap = useMemo(() => {
        return evaluations.reduce((acc, ev) => {
            acc[ev.id] = ev;
            return acc;
        }, {} as Record<string, typeof evaluations[0]>);
    }, [evaluations]);
    
    const analysisWithDetails = useMemo(() => {
        return aiAnalysisResults.map(analysis => ({
            ...analysis,
            evaluation: evaluationMap[analysis.evaluationId],
        })).filter(item => item.evaluation);
    }, [aiAnalysisResults, evaluationMap]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }
    
    const canRunAnalysis = user.role === ROLES.SUPERVISOR || user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
    
    const sortedAnalysis = [...analysisWithDetails].sort((a, b) => new Date(b.evaluation.data).getTime() - new Date(a.evaluation.data).getTime());

    const progressPercentage = analysisProgress.total > 0 ? (analysisProgress.current / analysisProgress.total) * 100 : 0;
    const lastResult = analysisProgress.lastResult;
    const lastEvaluationAnalyzed = lastResult ? evaluationMap[lastResult.evaluationId] : null;

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Análise de Sentimento com IA</h1>
                        <p className="text-muted-foreground">Analise os comentários das avaliações para extrair insights.</p>
                    </div>
                    {canRunAnalysis && (
                        <Card className="p-4 flex flex-col items-start gap-2">
                            <Button onClick={runAiAnalysis} disabled={isAiAnalysisRunning}>
                                {isAiAnalysisRunning ? (
                                    <>
                                        <Bot className="mr-2 h-4 w-4 animate-spin" /> Análise em Andamento...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" /> Executar Análise de IA Agora
                                    </>
                                )}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                                Última análise: {lastAiAnalysis ? format(new Date(lastAiAnalysis), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR }) : 'Nunca'}
                            </p>
                        </Card>
                    )}
                </div>

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle>Resultados da Análise</CardTitle>
                        <CardDescription>Lista de todas as avaliações analisadas pela inteligência artificial.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Atendente</TableHead>
                                    <TableHead>Nota</TableHead>
                                    <TableHead>Comentário Original</TableHead>
                                    <TableHead>Sentimento (IA)</TableHead>
                                    <TableHead>Resumo (IA)</TableHead>
                                    <TableHead className="text-right">Data</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAnalysis.map((item) => (
                                    <TableRow key={item.evaluationId}>
                                        <TableCell className="font-medium">
                                            <Badge variant="outline">{attendantMap[item.evaluation.attendantId] || "Desconhecido"}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <RatingStars rating={item.evaluation.nota} />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate">
                                            {item.evaluation.comentario}
                                        </TableCell>
                                        <TableCell>
                                            <SentimentBadge sentiment={item.sentiment} />
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {item.summary}
                                        </TableCell>
                                        <TableCell className="text-right text-muted-foreground">
                                            {format(new Date(item.evaluation.data), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {sortedAnalysis.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                            Nenhuma análise de IA foi executada ainda.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Analysis Progress Modal */}
            <Dialog open={isProgressModalOpen} onOpenChange={setIsProgressModalOpen}>
                <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2"><Bot className="animate-pulse" />Analisando Comentários com IA</DialogTitle>
                        <DialogDescription>
                            O processo está rodando em tempo real. Por favor, aguarde a conclusão.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="flex justify-between items-baseline">
                            <p className="font-medium">Progresso:</p>
                            <p className="text-lg font-bold">{analysisProgress.current} / {analysisProgress.total}</p>
                        </div>
                        <Progress value={progressPercentage} className="w-full" />
                        
                        {analysisProgress.status === 'processing' && analysisProgress.evaluation && (
                            <Card className="bg-muted/50 animate-in fade-in">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Hourglass className="animate-spin text-amber-500" /> Analisando agora...
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Atendente:</span>
                                        <Badge variant="outline">{attendantMap[analysisProgress.evaluation.attendantId] || 'Desconhecido'}</Badge>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MessageSquareText className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                        <p className="text-sm text-muted-foreground italic border-l-2 pl-3">
                                           "{analysisProgress.evaluation.comentario}"
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                         {analysisProgress.status === 'waiting' && lastResult && lastEvaluationAnalyzed && (
                            <Card className="bg-muted/50 animate-in fade-in">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2 text-green-600">
                                       <Check /> Análise Concluída
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                     <div className="flex items-center gap-2">
                                        <span className="font-semibold">Atendente:</span>
                                        <Badge variant="outline">{attendantMap[lastEvaluationAnalyzed.attendantId] || 'Desconhecido'}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Sentimento:</span>
                                        <SentimentBadge sentiment={lastResult.sentiment} />
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <Bot className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                        <p className="text-sm text-muted-foreground italic border-l-2 pl-3">
                                           "{lastResult.summary}"
                                        </p>
                                    </div>
                                     <div className="pt-2 text-center text-sm text-muted-foreground">
                                        Próxima análise em {analysisProgress.countdown} segundos...
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
