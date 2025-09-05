"use client";

import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface EvaluationTrendData {
  date: string;
  count: number;
  averageRating: number;
}

interface EvaluationTrendChartProps {
  data: EvaluationTrendData[];
  isLoading?: boolean;
}

const chartConfig = {
  count: {
    label: "Avaliações",
    color: "hsl(var(--chart-1))",
  },
  averageRating: {
    label: "Nota Média",
    color: "hsl(var(--chart-2))",
  },
};

export function EvaluationTrendChart({ data, isLoading }: EvaluationTrendChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Tendência de Avaliações
          </CardTitle>
          <CardDescription>Últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Tendência de Avaliações
        </CardTitle>
        <CardDescription>Últimos 30 dias</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <AreaChart data={data}>
            <XAxis 
              dataKey="date" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              yAxisId="count"
              orientation="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              yAxisId="rating"
              orientation="right"
              domain={[0, 5]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => [
                    name === 'count' ? `${value} avaliações` : `${Number(value).toFixed(1)} ⭐`,
                    name === 'count' ? 'Avaliações' : 'Nota Média'
                  ]}
                />
              }
            />
            <Area
              yAxisId="count"
              type="monotone"
              dataKey="count"
              stroke="var(--color-count)"
              fill="var(--color-count)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
            <Area
              yAxisId="rating"
              type="monotone"
              dataKey="averageRating"
              stroke="var(--color-averageRating)"
              fill="var(--color-averageRating)"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}