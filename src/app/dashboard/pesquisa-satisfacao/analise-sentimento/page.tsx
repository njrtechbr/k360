
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Bot, MessageSquareText, Hourglass, Check, BarChart3, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { EvaluationAnalysis } from "@/lib/types";
import { ROLES } from "@/lib/types";
import { RatingStars, SentimentBadge, AnalysisProgress } from "@/components/survey";
import SentimentAnalysisPanel from '@/components/survey/SentimentAnalysisPanel';
import SentimentInsights from '@/components/survey/SentimentInsights';
import SentimentFilters, { SentimentFilterOptions, AttendantOption } from '@/components/survey/SentimentFilters';
import { safeReduceArray, safeMapArray, isValidAttendant, isValidEvaluation } from "@/lib/data-validation";

export default function AnaliseSentimentoPage() {
    const { user, isAuthenticated, loading, evaluations, attendants, runAiAnalysis, aiAnalysisResults, lastAiAnalysis, isAiAnalysisRunning, analysisProgress, isProgressModalOpen, setIsProgressModalOpen } = useAuth();
    const router = useRouter();
    const [filters, setFilters] = useState<SentimentFilterOptions>({});
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, loading, router]);

    const attendantMap = useMemo(() => {
        if (!Array.isArray(attendants)) {
            return {};
        }
        return safeReduceArray(
            attendants,
            (acc, attendant) => {
                acc[attendant.id] = attendant.name;
                return acc;
            },
            {} as Record<string, string>,
            isValidAttendant
        );
    }, [attendants]);

    const evaluationMap = useMemo(() => {
        if (!Array.isArray(evaluations)) {
            return {};
        }
        return safeReduceArray(
            evaluations,
            (acc, ev) => {
                acc[ev.id] = ev;
                return acc;
            },
            {} as Record<string, any>,
            isValidEvaluation
        );
    }, [evaluations]);
    
    const allAnalysisWithDetails = useMemo(() => {
        if (!Array.isArray(aiAnalysisResults)) {
            return [];
        }
        return aiAnalysisResults.map(analysis => ({
            ...analysis,
            evaluation: evaluationMap[analysis.evaluationId],
        })).filter(item => item.evaluation);
    }, [aiAnalysisResults, evaluationMap]);

    // Filtrar análises baseado nos filtros aplicados
    const filteredAnalyses = useMemo(() => {
        let filtered = [...allAnalysisWithDetails];

        // Filtro por termo de busca
        if (filters.searchTerm) {
            const searchLower = filters.searchTerm.toLowerCase();
            filtered = filtered.filter(analysis => 
                analysis.evaluation.comentario.toLowerCase().includes(searchLower) ||
                analysis.summary.toLowerCase().includes(searchLower) ||
                (attendantMap[analysis.evaluation.attendantId] || '').toLowerCase().includes(searchLower)
            );
        }

        // Filtro por sentimentos
        if (filters.sentiments?.length) {
            filtered = filtered.filter(analysis => 
                filters.sentiments!.includes(analysis.sentiment)
            );
        }

        // Filtro por confiança
        if (filters.confidenceRange) {
            const [min, max] = filters.confidenceRange;
            filtered = filtered.filter(analysis => 
                analysis.confidence >= min && analysis.confidence <= max
            );
        }

        // Filtro por nota
        if (filters.ratingRange) {
            const [min, max] = filters.ratingRange;
            filtered = filtered.filter(analysis => 
                analysis.evaluation.nota >= min && analysis.evaluation.nota <= max
            );
        }

        // Filtro por atendentes
        if (filters.attendants?.length) {
            filtered = filtered.filter(analysis => 
                filters.attendants!.includes(analysis.evaluation.attendantId)
            );
        }

        // Filtro por análises conflitantes
        if (filters.hasConflicts) {
            filtered = filtered.filter(analysis => 
                (analysis.sentiment === 'Negativo' && analysis.evaluation.nota >= 4) ||
                (analysis.sentiment === 'Positivo' && analysis.evaluation.nota <= 2)
            );
        }

        // Filtro por tamanho mínimo do comentário
        if (filters.minAnalysisLength) {
            filtered = filtered.filter(analysis => 
                analysis.evaluation.comentario.length >= filters.minAnalysisLength!
            );
        }

        // Ordenação
        const sortBy = filters.sortBy || 'date';
        const sortOrder = filters.sortOrder || 'desc';
        
        filtered.sort((a, b) => {
            let comparison = 0;
            
            switch (sortBy) {
                case 'confidence':
                    comparison = a.confidence - b.confidence;
                    break;
                case 'rating':
                    comparison = a.evaluation.nota - b.evaluation.nota;
                    break;
                case 'sentiment':
                    comparison = a.sentiment.localeCompare(b.sentiment);
                    break;
                case 'date':
                default:
                    comparison = new Date(a.evaluation.data).getTime() - new Date(b.evaluation.data).getTime();
                    break;
            }
            
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        return filtered;
    }, [allAnalysisWithDetails, filters, attendantMap]);

    // Preparar opções de atendentes para o filtro
    const attendantOptions: AttendantOption[] = useMemo(() => {
        if (!Array.isArray(attendants)) {
            return [];
        }
        return safeMapArray(
            attendants,
            (attendant) => {
                const totalAnalyses = allAnalysisWithDetails.filter(a => 
                    a.evaluation.attendantId === attendant.id
                ).length;
                
                return {
                    id: attendant.id,
                    name: attendant.name,
                    totalAnalyses
                };
            },
            isValidAttendant
        ).filter(option => option.totalAnalyses > 0);
    }, [attendants, allAnalysisWithDetails]);

    if (loading || !user) {
        return <div className="flex items-center justify-center h-full"><p>Carregando...</p></div>;
    }

    // Validação adicional de dados críticos
    if (!Array.isArray(attendants)) {
        console.warn('AnaliseSentimentoPage: attendants não é um array válido', attendants);
    }

    if (!Array.isArray(evaluations)) {
        console.warn('AnaliseSentimentoPage: evaluations não é um array válido', evaluations);
    }

    if (!Array.isArray(aiAnalysisResults)) {
        console.warn('AnaliseSentimentoPage: aiAnalysisResults não é um array válido', aiAnalysisResults);
    }
    
    const canRunAnalysis = user.role === ROLES.SUPERVISOR || user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN;
    
    const sortedAnalysis = [...filteredAnalyses].sort((a, b) => new Date(b.evaluation.data).getTime() - new Date(a.evaluation.data).getTime());

    const progressPercentage = analysisProgress?.total > 0 ? (analysisProgress.current / analysisProgress.total) * 100 : 0;
    const lastResult = analysisProgress?.lastResult;
    const lastEvaluationAnalyzed = lastResult ? evaluationMap[lastResult.evaluationId] : null;

    return (
        <>
            <div className="space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div>
                        <h1 className="text-3xl font-bold">Análise de Sentimento com IA</h1>
                        <p className="text-muted-foreground">Analise os comentários das avaliações para extrair insights.</p>
                    </div>
                </div>
                
                {/* Componente de progresso da análise */}
                <AnalysisProgress
                    totalEvaluations={Array.isArray(evaluations) ? evaluations.length : 0}
                    analyzedCount={Array.isArray(aiAnalysisResults) ? aiAnalysisResults.length : 0}
                    pendingCount={Array.isArray(evaluations) && Array.isArray(aiAnalysisResults) 
                        ? evaluations.length - aiAnalysisResults.length 
                        : 0
                    }
                    sentimentDistribution={{
                        positive: Array.isArray(filteredAnalyses) ? filteredAnalyses.filter(a => a.sentiment === 'Positivo').length : 0,
                        negative: Array.isArray(filteredAnalyses) ? filteredAnalyses.filter(a => a.sentiment === 'Negativo').length : 0,
                        neutral: Array.isArray(filteredAnalyses) ? filteredAnalyses.filter(a => a.sentiment === 'Neutro').length : 0
                    }}
                    recentAnalyses={Array.isArray(sortedAnalysis) ? sortedAnalysis.slice(0, 3) : []}
                    onStartAnalysis={canRunAnalysis ? runAiAnalysis : undefined}
                    isRunning={isAiAnalysisRunning}
                    lastAnalysis={lastAiAnalysis}
                />

                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview" className="flex items-center gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Visão Geral
                        </TabsTrigger>
                        <TabsTrigger value="analysis" className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Análises Detalhadas
                        </TabsTrigger>
                        <TabsTrigger value="insights" className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4" />
                            Insights
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-6">
                        <SentimentAnalysisPanel 
                            analyses={Array.isArray(filteredAnalyses) ? filteredAnalyses : []}
                            attendantMap={attendantMap || {}}
                        />
                    </TabsContent>

                    <TabsContent value="analysis" className="space-y-6">
                        <div className="flex flex-col lg:flex-row gap-6">
                            <div className="lg:w-80 flex-shrink-0">
                                <SentimentFilters
                                    filters={filters}
                                    onFiltersChange={setFilters}
                                    attendantOptions={attendantOptions}
                                    totalResults={filteredAnalyses.length}
                                />
                            </div>
                            
                            <div className="flex-1">
                                <Card className="shadow-lg">
                                    <CardHeader>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <CardTitle className="flex items-center gap-2">
                                                    <Filter className="h-5 w-5" />
                                                    Resultados da Análise
                                                </CardTitle>
                                                <CardDescription>
                                                    {filteredAnalyses.length} de {allAnalysisWithDetails.length} análises encontradas
                                                </CardDescription>
                                            </div>
                                        </div>
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
                                                            {allAnalysisWithDetails.length === 0 
                                                                ? "Nenhuma análise de IA foi executada ainda."
                                                                : "Nenhuma análise encontrada com os filtros aplicados."
                                                            }
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="insights" className="space-y-6">
                        <SentimentInsights 
                            analyses={filteredAnalyses}
                            attendantMap={attendantMap}
                        />
                    </TabsContent>
                </Tabs>
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
                            <p className="text-lg font-bold">{analysisProgress?.current || 0} / {analysisProgress?.total || 0}</p>
                        </div>
                        <Progress value={progressPercentage} className="w-full" />
                        
                        {analysisProgress?.status === 'processing' && analysisProgress?.evaluation && (
                            <Card className="bg-muted/50 animate-in fade-in">
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Hourglass className="animate-spin text-amber-500" /> Analisando agora...
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold">Atendente:</span>
                                        <Badge variant="outline">{attendantMap[analysisProgress?.evaluation?.attendantId] || 'Desconhecido'}</Badge>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <MessageSquareText className="h-5 w-5 mt-1 text-muted-foreground flex-shrink-0" />
                                        <p className="text-sm text-muted-foreground italic border-l-2 pl-3">
                                           "{analysisProgress?.evaluation?.comentario || ''}"
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                         {analysisProgress?.status === 'waiting' && lastResult && lastEvaluationAnalyzed && (
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
                                        Próxima análise em {analysisProgress?.countdown || 0} segundos...
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
