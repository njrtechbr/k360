"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface RatingDistributionChartProps {
  distribution: Record<number, number>;
  loading?: boolean;
}

export function RatingDistributionChart({
  distribution,
  loading = false,
}: RatingDistributionChartProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Notas</CardTitle>
          <CardDescription>Frequência de cada nota atribuída</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const data = Object.entries(distribution).map(([rating, count]) => ({
    rating: `${rating} estrela${rating === "1" ? "" : "s"}`,
    count,
    percentage: distribution
      ? (
          (count / Object.values(distribution).reduce((a, b) => a + b, 0)) *
          100
        ).toFixed(1)
      : 0,
  }));

  // Colors for each rating (1-5 stars)
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#16a34a"];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].value} avaliações ({payload[0].payload.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const totalEvaluations = Object.values(distribution).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Distribuição de Notas</CardTitle>
        <CardDescription>
          Frequência de cada nota atribuída ({totalEvaluations} avaliações)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="rating" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Mais frequente:</span>
              <span className="font-medium">
                {
                  Object.entries(distribution).reduce((a, b) =>
                    distribution[a[0] as any] > distribution[b[0] as any]
                      ? a
                      : b,
                  )[0]
                }{" "}
                estrelas
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Satisfação (4-5):</span>
              <span className="font-medium text-green-600">
                {(
                  (((distribution[4] || 0) + (distribution[5] || 0)) /
                    totalEvaluations) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Insatisfação (1-2):</span>
              <span className="font-medium text-red-600">
                {(
                  (((distribution[1] || 0) + (distribution[2] || 0)) /
                    totalEvaluations) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Neutro (3):</span>
              <span className="font-medium text-yellow-600">
                {(((distribution[3] || 0) / totalEvaluations) * 100).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
