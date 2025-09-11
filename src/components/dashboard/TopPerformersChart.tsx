"use client";

import { Bar, BarChart, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface TopPerformerData {
  attendantId: string;
  attendantName: string;
  totalXp: number;
  evaluationCount: number;
  averageRating: number;
  position: number;
}

interface TopPerformersChartProps {
  data: TopPerformerData[];
  isLoading?: boolean;
}

const chartConfig = {
  totalXp: {
    label: "XP Total",
    color: "hsl(var(--chart-4))",
  },
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
};

const getPositionIcon = (position: number) => {
  switch (position) {
    case 1:
      return <Trophy className="h-4 w-4 text-yellow-500" />;
    case 2:
      return <Medal className="h-4 w-4 text-gray-400" />;
    case 3:
      return <Award className="h-4 w-4 text-amber-600" />;
    default:
      return (
        <span className="text-sm font-bold text-muted-foreground">
          #{position}
        </span>
      );
  }
};

export function TopPerformersChart({
  data,
  isLoading,
}: TopPerformersChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Top Performers
          </CardTitle>
          <CardDescription>Ranking por XP acumulado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center">
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.slice(0, 5).map((item) => ({
    name: item.attendantName.split(" ")[0], // Primeiro nome para o gráfico
    totalXp: item.totalXp,
    fullName: item.attendantName,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Top Performers
        </CardTitle>
        <CardDescription>Ranking por XP acumulado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico de barras */}
        <ChartContainer config={chartConfig} className="h-[200px]">
          <BarChart data={chartData} layout="horizontal">
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              width={60}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, _name, props) => [
                    `${value} XP`,
                    props.payload?.fullName || "XP Total",
                  ]}
                />
              }
            />
            <Bar
              dataKey="totalXp"
              fill="var(--color-totalXp)"
              radius={[0, 4, 4, 0]}
            />
          </BarChart>
        </ChartContainer>

        {/* Lista detalhada */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-muted-foreground">
            Ranking Completo
          </h4>
          {data.slice(0, 10).map((performer) => (
            <div
              key={performer.attendantId}
              className="flex items-center justify-between p-3 rounded-lg border"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8">
                  {getPositionIcon(performer.position)}
                </div>
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {getInitials(performer.attendantName)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{performer.attendantName}</p>
                  <p className="text-sm text-muted-foreground">
                    {performer.evaluationCount} avaliações •{" "}
                    {performer.averageRating.toFixed(1)} ⭐
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="font-mono">
                {performer.totalXp.toLocaleString()} XP
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
