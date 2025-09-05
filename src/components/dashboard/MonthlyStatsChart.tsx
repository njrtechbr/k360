"use client";

import { Line, LineChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

interface MonthlyStatsData {
  month: string;
  evaluations: number;
  averageRating: number;
  xpGenerated: number;
}

interface MonthlyStatsChartProps {
  data: MonthlyStatsData[];
  isLoading?: boolean;
}

const chartConfig = {
  evaluations: {
    label: "Avaliações",
    color: "hsl(var(--chart-1))",
  },
  averageRating: {
    label: "Nota Média",
    color: "hsl(var(--chart-2))",
  },
  xpGenerated: {
    label: "XP Gerado",
    color: "hsl(var(--chart-3))",
  },
};

export function MonthlyStatsChart({ data, isLoading }: MonthlyStatsChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Estatísticas Mensais
          </CardTitle>
          <CardDescription>Últimos 6 meses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
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
          <Calendar className="h-5 w-5" />
          Estatísticas Mensais
        </CardTitle>
        <CardDescription>Últimos 6 meses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[350px]">
          <LineChart data={data}>
            <XAxis 
              dataKey="month" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              yAxisId="left"
              orientation="left"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              yAxisId="right"
              orientation="right"
              domain={[0, 5]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value, name) => {
                    switch (name) {
                      case 'evaluations':
                        return [`${value} avaliações`, 'Avaliações'];
                      case 'averageRating':
                        return [`${Number(value).toFixed(1)} ⭐`, 'Nota Média'];
                      case 'xpGenerated':
                        return [`${value} XP`, 'XP Gerado'];
                      default:
                        return [value, name];
                    }
                  }}
                />
              }
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="evaluations"
              stroke="var(--color-evaluations)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="averageRating"
              stroke="var(--color-averageRating)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="xpGenerated"
              stroke="var(--color-xpGenerated)"
              strokeWidth={2}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}