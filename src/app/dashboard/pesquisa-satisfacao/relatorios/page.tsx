"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useEvaluations } from "@/hooks/survey";
import { useEvaluationAnalytics } from "@/hooks/survey/useEvaluationAnalytics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-picker";
import { Loader2, Download, Filter, TrendingUp, Users, Star, MessageSquare } from "lucide-react";
import { DateRange } from "react-day-picker";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Import report components
import { OverviewCards } from "@/components/reports/OverviewCards";
import { RatingDistributionChart } from "@/components/reports/RatingDistributionChart";
import { TrendChart } from "@/components/reports/TrendChart";
import { AttendantPerformanceTable } from "@/components/reports/AttendantPerformanceTable";
import { SentimentAnalysisChart } from "@/components/reports/SentimentAnalysisChart";
import { ExportReportDialog } from "@/components/reports/ExportReportDialog";

export default function RelatoriosPage() {
    const { user, isAuthenticated, loading: authLoading, attendants } = useAuth();
    const router = useRouter();
    const { evaluations, loading: evaluationsLoading } = useEvaluations();
    
    // State for filters
    const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year' | 'all'>('month');
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: addDays(new Date(), -30),
        to: new Date(),
    });
    const [selectedAttendants, setSelectedAttendants] = useState<string[]>([]);
    const [showExportDialog, setShowExportDialog] = useState(false);

    // Analytics hook
    const analytics = useEvaluationAnalytics({
        evaluations: evaluations || [],
        attendants: attendants || [],
        timeRange
    });

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push("/login");
        }
    }, [isAuthenticated, authLoading, router]);

    if (authLoading || !user) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="ml-2">Carregando...</p>
            </div>
        );
    }

    const handleExportReport = (format: 'pdf' | 'excel' | 'csv') => {
        // TODO: Implement export functionality
        console.log('Exportar relatório:', format);
        setShowExportDialog(false);
    };

    const filteredEvaluations = evaluations?.filter(evaluation => {
        // Filter by date range if set
        if (dateRange?.from && dateRange?.to) {
            const evalDate = new Date(evaluation.data);
            return evalDate >= dateRange.from && evalDate <= dateRange.to;
        }
        
        // Filter by selected attendants if any
        if (selectedAttendants.length > 0 && !selectedAttendants.includes('all')) {
            return selectedAttendants.includes(evaluation.attendantId);
        }
        
        return true;
    }) || [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Relatórios de Satisfação</h1>
                    <p className="text-muted-foreground mt-2">
                        Análise completa das avaliações de satisfação e performance dos atendentes
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowExportDialog(true)}
                        className="flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Exportar
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filtros
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Período:</label>
                            <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                                <SelectTrigger className="w-32">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="week">Última semana</SelectItem>
                                    <SelectItem value="month">Último mês</SelectItem>
                                    <SelectItem value="quarter">Último trimestre</SelectItem>
                                    <SelectItem value="year">Último ano</SelectItem>
                                    <SelectItem value="all">Todo período</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Data específica:</label>
                            <DatePickerWithRange
                                date={dateRange}
                                onDateChange={setDateRange}
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">Atendentes:</label>
                            <Select value={selectedAttendants.length === 0 ? 'all' : selectedAttendants[0]} onValueChange={(value) => setSelectedAttendants(value === 'all' ? [] : [value])}>
                                <SelectTrigger className="w-48">
                                    <SelectValue placeholder="Todos os atendentes" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todos os atendentes</SelectItem>
                                    {attendants?.map(attendant => (
                                        <SelectItem key={attendant.id} value={attendant.id}>
                                            {attendant.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Overview Cards */}
            <OverviewCards
                totalEvaluations={analytics.totalEvaluations}
                averageRating={analytics.averageRating}
                satisfactionRate={analytics.satisfactionRate}
                evaluatedAttendants={analytics.evaluatedAttendants}
                loading={evaluationsLoading}
            />

            {/* Main Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="trends">Tendências</TabsTrigger>
                    <TabsTrigger value="sentiment">Sentimentos</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <RatingDistributionChart
                            distribution={analytics.ratingDistribution}
                            loading={evaluationsLoading}
                        />
                        <Card>
                            <CardHeader>
                                <CardTitle>Resumo do Período</CardTitle>
                                <CardDescription>
                                    Estatísticas principais para o período selecionado
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Total de Avaliações</span>
                                    <span className="font-semibold">{analytics.totalEvaluations}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Nota Média</span>
                                    <span className="font-semibold">{analytics.averageRating.toFixed(2)}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Taxa de Satisfação</span>
                                    <span className="font-semibold">{analytics.satisfactionRate.toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Atendentes Avaliados</span>
                                    <span className="font-semibold">{analytics.evaluatedAttendants}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Comentários</span>
                                    <span className="font-semibold">{analytics.commentsCount}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-6">
                    <AttendantPerformanceTable
                        topRated={analytics.topRatedAttendants}
                        lowestRated={analytics.lowestRatedAttendants}
                        loading={evaluationsLoading}
                    />
                </TabsContent>

                <TabsContent value="trends" className="space-y-6">
                    <TrendChart
                        trends={analytics.recentTrends}
                        loading={evaluationsLoading}
                    />
                </TabsContent>

                <TabsContent value="sentiment" className="space-y-6">
                    <SentimentAnalysisChart
                        sentimentData={analytics.sentimentByAttendant}
                        loading={evaluationsLoading}
                    />
                </TabsContent>
            </Tabs>

            {/* Export Dialog */}
            <ExportReportDialog
                open={showExportDialog}
                onOpenChange={setShowExportDialog}
                onExport={handleExportReport}
                reportData={{
                    analytics,
                    evaluations: filteredEvaluations,
                    attendants: attendants || [],
                    filters: {
                        timeRange,
                        dateRange,
                        selectedAttendants
                    }
                }}
            />
        </div>
    );
}