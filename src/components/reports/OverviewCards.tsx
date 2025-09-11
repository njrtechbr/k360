"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  Users,
  Star,
  MessageSquare,
  TrendingDown,
  Minus,
} from "lucide-react";

interface OverviewCardsProps {
  totalEvaluations: number;
  averageRating: number;
  satisfactionRate: number;
  evaluatedAttendants: number;
  loading?: boolean;
}

export function OverviewCards({
  totalEvaluations,
  averageRating,
  satisfactionRate,
  evaluatedAttendants,
  loading = false,
}: OverviewCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const getTrendIcon = (value: number, threshold: number) => {
    if (value > threshold)
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < threshold * 0.8)
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-yellow-600" />;
  };

  const cards = [
    {
      title: "Total de Avaliações",
      value: totalEvaluations.toLocaleString(),
      description: "Avaliações registradas",
      icon: MessageSquare,
      trend: getTrendIcon(totalEvaluations, 100),
    },
    {
      title: "Nota Média",
      value: averageRating.toFixed(2),
      description: `de 5.00 estrelas`,
      icon: Star,
      trend: getTrendIcon(averageRating, 4.0),
    },
    {
      title: "Taxa de Satisfação",
      value: `${satisfactionRate.toFixed(1)}%`,
      description: "Notas 4 e 5",
      icon: TrendingUp,
      trend: getTrendIcon(satisfactionRate, 80),
    },
    {
      title: "Atendentes Avaliados",
      value: evaluatedAttendants.toString(),
      description: "Funcionários com avaliações",
      icon: Users,
      trend: getTrendIcon(evaluatedAttendants, 10),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className="flex items-center gap-1">
                {card.trend}
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.description}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
