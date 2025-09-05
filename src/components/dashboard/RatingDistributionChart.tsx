"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

interface RatingDistributionData {
  rating: number;
  count: number;
  percentage: number;
}

interface RatingDistributionChartProps {
  data: RatingDistributionData[];
  isLoading?: boolean;
}

const chartConfig = {
  count: {
    label: "Quantidade",
    color: "hsl(var(--chart-3))",
  },
};

export function RatingDistributionChart({ data, isLoading }: RatingDistributionChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Distribuição de Notas
          </CardTitle>
          <CardDescription>Frequência de cada nota</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    ratingLabel: `${item.rating} ⭐`
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Distribuição de Notas
        </CardTitle>
        <CardDescription>Frequência de cada nota</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <BarChart data={formattedData}>
            <XAxis 
              dataKey="ratingLabel" 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickMargin={8}
            />
            <ChartTooltip 
              content={
                <ChartTooltipContent 
                  formatter={(value) => [
                    `${value} avaliações (${formattedData.find(d => d.count === value)?.percentage.toFixed(1)}%)`,
                    'Quantidade'
                  ]}
                />
              }
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}