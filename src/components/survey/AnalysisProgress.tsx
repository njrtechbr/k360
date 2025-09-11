"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Bot,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  MessageSquare,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Evaluation, EvaluationAnalysis } from "@/lib/types";

export interface AnalysisProgressProps {
  evaluations: Evaluation[];
  analysisResults: EvaluationAnalysis[];
  isAnalyzing?: boolean;
  onStartAnalysis?: () => void;
  onRetryAnalysis?: () => void;
  showDetails?: boolean;
  className?: string;
}

export default function AnalysisProgress({
  evaluations,
  analysisResults,
  isAnalyzing = false,
  onStartAnalysis,
  onRetryAnalysis,
  showDetails = true,
  className,
}: AnalysisProgressProps) {
  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const evaluationsWithComments = evaluations.filter(
      (e) => e.comentario && e.comentario.trim(),
    );
    const analyzedEvaluations = analysisResults.length;
    const pendingAnalysis =
      evaluationsWithComments.length - analyzedEvaluations;
    const progressPercentage =
      evaluationsWithComments.length > 0
        ? (analyzedEvaluations / evaluationsWithComments.length) * 100
        : 0;

    // Análise de sentimentos
    const sentimentCounts = analysisResults.reduce(
      (acc, analysis) => {
        acc[analysis.sentiment] = (acc[analysis.sentiment] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Análises recentes (últimas 24h)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAnalyses = analysisResults.filter(
      (analysis) => new Date(analysis.createdAt) > oneDayAgo,
    ).length;

    return {
      totalEvaluations: evaluations.length,
      evaluationsWithComments: evaluationsWithComments.length,
      analyzedEvaluations,
      pendingAnalysis,
      progressPercentage,
      sentimentCounts,
      recentAnalyses,
    };
  }, [evaluations, analysisResults]);

  const getStatusIcon = () => {
    if (isAnalyzing) {
      return <RefreshCw className="h-5 w-5 animate-spin text-blue-500" />;
    }
    if (stats.pendingAnalysis === 0 && stats.analyzedEvaluations > 0) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    }
    if (stats.pendingAnalysis > 0) {
      return <Clock className="h-5 w-5 text-yellow-500" />;
    }
    return <Bot className="h-5 w-5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (isAnalyzing) {
      return "Analisando comentários...";
    }
    if (stats.pendingAnalysis === 0 && stats.analyzedEvaluations > 0) {
      return "Todas as análises concluídas";
    }
    if (stats.pendingAnalysis > 0) {
      return `${stats.pendingAnalysis} análises pendentes`;
    }
    return "Nenhuma análise necessária";
  };

  const getStatusVariant = () => {
    if (isAnalyzing) return "secondary";
    if (stats.pendingAnalysis === 0 && stats.analyzedEvaluations > 0)
      return "default";
    if (stats.pendingAnalysis > 0) return "outline";
    return "secondary";
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Análise de Sentimento (IA)
          </div>
          <Badge
            variant={getStatusVariant()}
            className="flex items-center gap-1"
          >
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Progresso Geral */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Progresso da Análise</span>
            <span className="font-medium">
              {stats.analyzedEvaluations} / {stats.evaluationsWithComments}{" "}
              comentários
            </span>
          </div>
          <Progress value={stats.progressPercentage} className="h-2" />
          <div className="text-xs text-muted-foreground text-center">
            {stats.progressPercentage.toFixed(1)}% concluído
          </div>
        </div>

        {/* Estatísticas Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalEvaluations}</div>
            <div className="text-xs text-muted-foreground">
              Total de Avaliações
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {stats.evaluationsWithComments}
            </div>
            <div className="text-xs text-muted-foreground">Com Comentários</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">
              {stats.analyzedEvaluations}
            </div>
            <div className="text-xs text-muted-foreground">Analisadas</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.recentAnalyses}</div>
            <div className="text-xs text-muted-foreground">Últimas 24h</div>
          </div>
        </div>

        {/* Distribuição de Sentimentos */}
        {showDetails && stats.analyzedEvaluations > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Distribuição de Sentimentos
            </h4>
            <div className="space-y-2">
              {Object.entries(stats.sentimentCounts).map(
                ([sentiment, count]) => {
                  const percentage = (count / stats.analyzedEvaluations) * 100;
                  const getSentimentColor = (sentiment: string) => {
                    switch (sentiment.toLowerCase()) {
                      case "positive":
                        return "bg-green-500";
                      case "negative":
                        return "bg-red-500";
                      case "neutral":
                        return "bg-gray-500";
                      default:
                        return "bg-blue-500";
                    }
                  };

                  const getSentimentLabel = (sentiment: string) => {
                    switch (sentiment.toLowerCase()) {
                      case "positive":
                        return "Positivo";
                      case "negative":
                        return "Negativo";
                      case "neutral":
                        return "Neutro";
                      default:
                        return sentiment;
                    }
                  };

                  return (
                    <div key={sentiment} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20">
                        <div
                          className={cn(
                            "w-3 h-3 rounded-full",
                            getSentimentColor(sentiment),
                          )}
                        />
                        <span className="text-sm">
                          {getSentimentLabel(sentiment)}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Progress value={percentage} className="h-2" />
                      </div>
                      <div className="text-sm text-muted-foreground w-16 text-right">
                        {count} ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3">
          {stats.pendingAnalysis > 0 && onStartAnalysis && (
            <Button
              onClick={onStartAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              {isAnalyzing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {isAnalyzing
                ? "Analisando..."
                : `Analisar ${stats.pendingAnalysis} Comentários`}
            </Button>
          )}

          {stats.analyzedEvaluations > 0 && onRetryAnalysis && (
            <Button
              variant="outline"
              onClick={onRetryAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reprocessar Todas
            </Button>
          )}
        </div>

        {/* Alertas */}
        {stats.evaluationsWithComments === 0 && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Nenhum comentário disponível para análise
            </span>
          </div>
        )}

        {stats.pendingAnalysis > 10 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Muitos comentários pendentes. Considere executar a análise em
              lotes.
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
