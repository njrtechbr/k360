"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  MessageSquare,
  Target,
  Lightbulb,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import SentimentBadge from "./SentimentBadge";
import { format, subDays, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface SentimentTrend {
  period: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  avgConfidence: number;
}

export interface AttendantSentiment {
  attendantId: string;
  attendantName: string;
  positive: number;
  negative: number;
  neutral: number;
  total: number;
  avgRating: number;
  avgConfidence: number;
  conflictingAnalyses: number;
}

export interface SentimentInsight {
  type: "success" | "warning" | "info" | "error";
  title: string;
  description: string;
  icon: React.ElementType;
  priority: "high" | "medium" | "low";
  actionable?: boolean;
}

export interface SentimentInsightsProps {
  analyses: Array<{
    id: string;
    sentiment: "Positivo" | "Negativo" | "Neutro";
    confidence: number;
    analyzedAt: string;
    evaluation: {
      nota: number;
      attendantId: string;
      attendantName: string;
      data: string;
    };
  }>;
  className?: string;
}

const SentimentInsights: React.FC<SentimentInsightsProps> = ({
  analyses,
  className,
}) => {
  // Calcular tendências por período
  const trends = useMemo(() => {
    const now = new Date();
    const periods = [
      { name: "Últimos 7 dias", days: 7 },
      { name: "Últimos 30 dias", days: 30 },
      { name: "Últimos 90 dias", days: 90 },
    ];

    return periods.map((period) => {
      const cutoffDate = subDays(now, period.days);
      const periodAnalyses = analyses.filter((a) =>
        isAfter(new Date(a.analyzedAt), cutoffDate),
      );

      const positive = periodAnalyses.filter(
        (a) => a.sentiment === "Positivo",
      ).length;
      const negative = periodAnalyses.filter(
        (a) => a.sentiment === "Negativo",
      ).length;
      const neutral = periodAnalyses.filter(
        (a) => a.sentiment === "Neutro",
      ).length;
      const total = periodAnalyses.length;
      const avgConfidence =
        total > 0
          ? periodAnalyses.reduce((sum, a) => sum + a.confidence, 0) / total
          : 0;

      return {
        period: period.name,
        positive,
        negative,
        neutral,
        total,
        avgConfidence,
        positivePercentage: total > 0 ? (positive / total) * 100 : 0,
        negativePercentage: total > 0 ? (negative / total) * 100 : 0,
      };
    });
  }, [analyses]);

  // Calcular sentimentos por atendente
  const attendantSentiments = useMemo(() => {
    const attendantMap = new Map<string, AttendantSentiment>();

    analyses.forEach((analysis) => {
      const { attendantId, attendantName } = analysis.evaluation;

      if (!attendantMap.has(attendantId)) {
        attendantMap.set(attendantId, {
          attendantId,
          attendantName,
          positive: 0,
          negative: 0,
          neutral: 0,
          total: 0,
          avgRating: 0,
          avgConfidence: 0,
          conflictingAnalyses: 0,
        });
      }

      const attendant = attendantMap.get(attendantId)!;
      attendant.total++;
      attendant.avgConfidence += analysis.confidence;
      attendant.avgRating += analysis.evaluation.nota;

      switch (analysis.sentiment) {
        case "Positivo":
          attendant.positive++;
          break;
        case "Negativo":
          attendant.negative++;
          break;
        case "Neutro":
          attendant.neutral++;
          break;
      }

      // Detectar análises conflitantes
      if (
        (analysis.sentiment === "Negativo" && analysis.evaluation.nota >= 4) ||
        (analysis.sentiment === "Positivo" && analysis.evaluation.nota <= 2)
      ) {
        attendant.conflictingAnalyses++;
      }
    });

    // Calcular médias
    attendantMap.forEach((attendant) => {
      if (attendant.total > 0) {
        attendant.avgConfidence /= attendant.total;
        attendant.avgRating /= attendant.total;
      }
    });

    return Array.from(attendantMap.values()).sort((a, b) => b.total - a.total);
  }, [analyses]);

  // Gerar insights automáticos
  const insights = useMemo(() => {
    const insights: SentimentInsight[] = [];

    if (analyses.length === 0) {
      insights.push({
        type: "info",
        title: "Nenhuma análise disponível",
        description:
          "Execute análises de sentimento para ver insights automáticos.",
        icon: MessageSquare,
        priority: "low",
      });
      return insights;
    }

    const recentTrend = trends[0]; // Últimos 7 dias
    const monthlyTrend = trends[1]; // Últimos 30 dias

    // Insights sobre tendências recentes
    if (recentTrend.total > 0) {
      if (recentTrend.positivePercentage > 70) {
        insights.push({
          type: "success",
          title: "Tendência Positiva",
          description: `${recentTrend.positivePercentage.toFixed(1)}% dos comentários recentes são positivos.`,
          icon: TrendingUp,
          priority: "medium",
        });
      } else if (recentTrend.negativePercentage > 30) {
        insights.push({
          type: "warning",
          title: "Atenção: Sentimentos Negativos",
          description: `${recentTrend.negativePercentage.toFixed(1)}% dos comentários recentes são negativos.`,
          icon: TrendingDown,
          priority: "high",
          actionable: true,
        });
      }
    }

    // Insights sobre confiança
    const avgConfidence =
      analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    if (avgConfidence > 0.8) {
      insights.push({
        type: "success",
        title: "Alta Confiança nas Análises",
        description: `Confiança média de ${(avgConfidence * 100).toFixed(1)}% nas análises de IA.`,
        icon: Target,
        priority: "low",
      });
    } else if (avgConfidence < 0.6) {
      insights.push({
        type: "warning",
        title: "Baixa Confiança nas Análises",
        description:
          "Considere revisar as análises manualmente ou melhorar os prompts de IA.",
        icon: AlertTriangle,
        priority: "high",
        actionable: true,
      });
    }

    // Insights sobre atendentes
    const topPerformer = attendantSentiments.find(
      (a) => a.positive / a.total > 0.8,
    );
    if (topPerformer) {
      insights.push({
        type: "success",
        title: "Destaque Positivo",
        description: `${topPerformer.attendantName} tem ${((topPerformer.positive / topPerformer.total) * 100).toFixed(1)}% de comentários positivos.`,
        icon: CheckCircle,
        priority: "medium",
      });
    }

    const needsAttention = attendantSentiments.find(
      (a) => a.negative / a.total > 0.4 || a.conflictingAnalyses > 2,
    );
    if (needsAttention) {
      insights.push({
        type: "warning",
        title: "Atendente Precisa de Atenção",
        description: `${needsAttention.attendantName} tem muitos comentários negativos ou análises conflitantes.`,
        icon: Users,
        priority: "high",
        actionable: true,
      });
    }

    // Insights sobre análises conflitantes
    const totalConflicting = attendantSentiments.reduce(
      (sum, a) => sum + a.conflictingAnalyses,
      0,
    );
    if (totalConflicting > analyses.length * 0.1) {
      insights.push({
        type: "warning",
        title: "Muitas Análises Conflitantes",
        description: `${totalConflicting} análises têm sentimento inconsistente com a nota dada.`,
        icon: AlertTriangle,
        priority: "medium",
        actionable: true,
      });
    }

    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [analyses, trends, attendantSentiments]);

  const getInsightVariant = (type: SentimentInsight["type"]) => {
    switch (type) {
      case "success":
        return "default";
      case "warning":
        return "destructive";
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Insights principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Insights Automáticos
          </CardTitle>
          <CardDescription>
            Análises e recomendações baseadas nos dados de sentimento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum insight disponível no momento.
            </p>
          ) : (
            <div className="space-y-3">
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                return (
                  <Alert key={index} variant={getInsightVariant(insight.type)}>
                    <Icon className="h-4 w-4" />
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{insight.title}</h4>
                        <AlertDescription className="mt-1">
                          {insight.description}
                        </AlertDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            insight.priority === "high"
                              ? "destructive"
                              : insight.priority === "medium"
                                ? "default"
                                : "secondary"
                          }
                          className="text-xs"
                        >
                          {insight.priority === "high"
                            ? "Alta"
                            : insight.priority === "medium"
                              ? "Média"
                              : "Baixa"}
                        </Badge>
                        {insight.actionable && (
                          <Badge variant="outline" className="text-xs">
                            Ação Requerida
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Alert>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tendências por período */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tendências por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {trends.map((trend, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">{trend.period}</h4>
                  <Badge variant="outline">{trend.total} análises</Badge>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-green-600">Positivo</span>
                      <span>
                        {trend.positive} ({trend.positivePercentage.toFixed(1)}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={trend.positivePercentage}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Neutro</span>
                      <span>
                        {trend.neutral} (
                        {((trend.neutral / trend.total) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <Progress
                      value={(trend.neutral / trend.total) * 100}
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-red-600">Negativo</span>
                      <span>
                        {trend.negative} ({trend.negativePercentage.toFixed(1)}
                        %)
                      </span>
                    </div>
                    <Progress
                      value={trend.negativePercentage}
                      className="h-2"
                    />
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Confiança média: {(trend.avgConfidence * 100).toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance por atendente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sentimento por Atendente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {attendantSentiments.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Nenhum dado de atendente disponível.
            </p>
          ) : (
            <div className="space-y-4">
              {attendantSentiments.slice(0, 10).map((attendant) => {
                const positivePercentage =
                  (attendant.positive / attendant.total) * 100;
                const negativePercentage =
                  (attendant.negative / attendant.total) * 100;

                return (
                  <div
                    key={attendant.attendantId}
                    className="space-y-3 p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">
                          {attendant.attendantName}
                        </h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span>{attendant.total} análises</span>
                          <span>•</span>
                          <span>
                            Nota média: {attendant.avgRating.toFixed(1)}
                          </span>
                          <span>•</span>
                          <span>
                            Confiança:{" "}
                            {(attendant.avgConfidence * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {attendant.conflictingAnalyses > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {attendant.conflictingAnalyses} conflitos
                          </Badge>
                        )}
                        <SentimentBadge
                          sentiment={
                            positivePercentage > 50
                              ? "Positivo"
                              : negativePercentage > 50
                                ? "Negativo"
                                : "Neutro"
                          }
                          size="sm"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <div className="text-lg font-bold text-green-600">
                          {attendant.positive}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Positivo
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-gray-600">
                          {attendant.neutral}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Neutro
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-bold text-red-600">
                          {attendant.negative}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Negativo
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SentimentInsights;
