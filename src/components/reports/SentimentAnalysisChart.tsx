"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Smile, Frown, Meh, MessageCircle } from "lucide-react";

interface SentimentByAttendant {
    attendantId: string;
    attendantName: string;
    positive: number;
    negative: number;
    neutral: number;
    totalAnalyzed: number;
}

interface SentimentAnalysisChartProps {
    sentimentData: SentimentByAttendant[];
    loading?: boolean;
}

export function SentimentAnalysisChart({ sentimentData, loading = false }: SentimentAnalysisChartProps) {
    if (loading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-80 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Calculate overall sentiment totals
    const overallSentiment = sentimentData.reduce(
        (acc, curr) => ({
            positive: acc.positive + curr.positive,
            negative: acc.negative + curr.negative,
            neutral: acc.neutral + curr.neutral,
            total: acc.total + curr.totalAnalyzed
        }),
        { positive: 0, negative: 0, neutral: 0, total: 0 }
    );

    const sentimentPieData = [
        { name: 'Positivo', value: overallSentiment.positive, color: '#22c55e' },
        { name: 'Neutro', value: overallSentiment.neutral, color: '#eab308' },
        { name: 'Negativo', value: overallSentiment.negative, color: '#ef4444' }
    ].filter(item => item.value > 0);

    // Prepare data for attendant sentiment chart (top 10 most analyzed)
    const topAttendants = sentimentData
        .filter(attendant => attendant.totalAnalyzed > 0)
        .sort((a, b) => b.totalAnalyzed - a.totalAnalyzed)
        .slice(0, 10)
        .map(attendant => ({
            name: attendant.attendantName.length > 15 
                ? attendant.attendantName.substring(0, 15) + '...' 
                : attendant.attendantName,
            fullName: attendant.attendantName,
            positive: attendant.positive,
            neutral: attendant.neutral,
            negative: attendant.negative,
            total: attendant.totalAnalyzed,
            positiveRate: (attendant.positive / attendant.totalAnalyzed * 100).toFixed(1)
        }));

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-2">{data.fullName || label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.dataKey === 'positive' ? 'Positivo' :
                             entry.dataKey === 'neutral' ? 'Neutro' :
                             entry.dataKey === 'negative' ? 'Negativo' : entry.dataKey}: {entry.value}
                        </p>
                    ))}
                    {data.total && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Total analisado: {data.total}
                        </p>
                    )}
                </div>
            );
        }
        return null;
    };

    const PieTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            const percentage = ((data.value / overallSentiment.total) * 100).toFixed(1);
            return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-medium">{data.name}</p>
                    <p className="text-sm text-muted-foreground">
                        {data.value} comentários ({percentage}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Overall Sentiment Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageCircle className="h-5 w-5" />
                            Análise Geral de Sentimentos
                        </CardTitle>
                        <CardDescription>
                            Distribuição dos sentimentos nos comentários analisados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {overallSentiment.total === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-2">Nenhum comentário analisado</p>
                                <p className="text-sm">
                                    Comentários com análise de sentimento aparecerão aqui
                                </p>
                            </div>
                        ) : (
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={sentimentPieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={120}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {sentimentPieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<PieTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Resumo</CardTitle>
                        <CardDescription>
                            Estatísticas dos sentimentos
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Smile className="h-4 w-4 text-green-600" />
                                <span className="text-sm">Positivo</span>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-green-600">
                                    {overallSentiment.positive}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {overallSentiment.total > 0 
                                        ? ((overallSentiment.positive / overallSentiment.total) * 100).toFixed(1)
                                        : 0}%
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Meh className="h-4 w-4 text-yellow-600" />
                                <span className="text-sm">Neutro</span>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-yellow-600">
                                    {overallSentiment.neutral}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {overallSentiment.total > 0 
                                        ? ((overallSentiment.neutral / overallSentiment.total) * 100).toFixed(1)
                                        : 0}%
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Frown className="h-4 w-4 text-red-600" />
                                <span className="text-sm">Negativo</span>
                            </div>
                            <div className="text-right">
                                <div className="font-semibold text-red-600">
                                    {overallSentiment.negative}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {overallSentiment.total > 0 
                                        ? ((overallSentiment.negative / overallSentiment.total) * 100).toFixed(1)
                                        : 0}%
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Total Analisado</span>
                                <span className="font-semibold">{overallSentiment.total}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Sentiment by Attendant */}
            {topAttendants.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Sentimentos por Atendente</CardTitle>
                        <CardDescription>
                            Análise de sentimentos dos comentários por atendente (top 10 mais analisados)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={topAttendants} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Bar dataKey="positive" stackId="sentiment" fill="#22c55e" name="Positivo" />
                                <Bar dataKey="neutral" stackId="sentiment" fill="#eab308" name="Neutro" />
                                <Bar dataKey="negative" stackId="sentiment" fill="#ef4444" name="Negativo" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}