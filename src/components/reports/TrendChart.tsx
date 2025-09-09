"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Calendar } from "lucide-react";

interface TrendData {
    date: string;
    averageRating: number;
    totalEvaluations: number;
    satisfactionRate: number;
}

interface TrendChartProps {
    trends: TrendData[];
    loading?: boolean;
}

export function TrendChart({ trends, loading = false }: TrendChartProps) {
    if (loading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Tendências Temporais</CardTitle>
                    <CardDescription>Evolução das métricas ao longo do tempo</CardDescription>
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-80 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Generate mock trend data if none provided
    const mockTrends = trends.length === 0 ? generateMockTrends() : trends;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-background border rounded-lg p-3 shadow-lg">
                    <p className="font-medium mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: {
                                entry.dataKey === 'averageRating' ? entry.value.toFixed(2) :
                                entry.dataKey === 'satisfactionRate' ? `${entry.value.toFixed(1)}%` :
                                entry.value
                            }
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-6">
            {/* Rating Trend */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Evolução da Nota Média
                    </CardTitle>
                    <CardDescription>
                        Tendência da satisfação ao longo do tempo
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={mockTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                            <defs>
                                <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                            />
                            <YAxis 
                                domain={[0, 5]}
                                tick={{ fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="averageRating"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                fill="url(#ratingGradient)"
                                name="Nota Média"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            {/* Volume and Satisfaction Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5" />
                            Volume de Avaliações
                        </CardTitle>
                        <CardDescription>
                            Quantidade de avaliações por período
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <AreaChart data={mockTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                />
                                <YAxis 
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Area
                                    type="monotone"
                                    dataKey="totalEvaluations"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    fill="url(#volumeGradient)"
                                    name="Total de Avaliações"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Taxa de Satisfação</CardTitle>
                        <CardDescription>
                            Percentual de avaliações positivas (4-5 estrelas)
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={mockTrends} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                                <XAxis 
                                    dataKey="date" 
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                />
                                <YAxis 
                                    domain={[0, 100]}
                                    tick={{ fontSize: 12 }}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                <Line
                                    type="monotone"
                                    dataKey="satisfactionRate"
                                    stroke="#f59e0b"
                                    strokeWidth={3}
                                    dot={{ fill: '#f59e0b', strokeWidth: 2, r: 4 }}
                                    name="Taxa de Satisfação"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

// Generate mock trend data for demonstration
function generateMockTrends(): TrendData[] {
    const trends: TrendData[] = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        trends.push({
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            averageRating: 3.5 + Math.random() * 1.5, // Random between 3.5 and 5.0
            totalEvaluations: Math.floor(Math.random() * 50) + 10, // Random between 10 and 60
            satisfactionRate: 60 + Math.random() * 35 // Random between 60% and 95%
        });
    }
    
    return trends;
}