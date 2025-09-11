"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  AnalyticsService,
  AttendantsService,
  EvaluationsService,
} from "@/services/survey";
import type { Evaluation, Attendant, EvaluationAnalysis } from "@/lib/types";

interface EvaluationStats {
  totalEvaluations: number;
  averageRating: number;
  ratingDistribution: Record<number, number>;
  satisfactionRate: number;
  commentsCount: number;
  evaluatedAttendants: number;
  topRatedAttendant: (Attendant & { averageRating: number }) | null;
  lowestRatedAttendant: (Attendant & { averageRating: number }) | null;
  recentTrend: "up" | "down" | "stable";
}

interface UseEvaluationAnalyticsProps {
  evaluations: Evaluation[];
  attendants: Attendant[];
  analyses?: EvaluationAnalysis[];
  timeRange?: "week" | "month" | "quarter" | "year" | "all";
}

export function useEvaluationAnalytics({
  evaluations,
  attendants,
  analyses = [],
  timeRange = "all",
}: UseEvaluationAnalyticsProps) {
  const [loading, setLoading] = useState(false);

  // Filtrar avaliações por período
  const filteredEvaluations = useMemo(() => {
    if (timeRange === "all") return evaluations;

    const now = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    return evaluations.filter(
      (evaluation) => new Date(evaluation.data) >= startDate,
    );
  }, [evaluations, timeRange]);

  // Calcular dados de atendentes
  const attendantsData = useMemo(() => {
    if (!filteredEvaluations.length) {
      return {
        attendantsPerformance: [],
        topAttendants: [],
        lowPerformers: [],
      };
    }

    const safeAttendants = attendants || [];
    const attendantsPerformance = AttendantsService.getAttendantsPerformance(
      safeAttendants,
      filteredEvaluations,
    );
    const topAttendants = AttendantsService.getTopRatedAttendants(
      safeAttendants,
      filteredEvaluations,
      5,
    );
    const lowPerformers = AttendantsService.getLowPerformanceAttendants(
      safeAttendants,
      filteredEvaluations,
      3.5,
    );

    return {
      attendantsPerformance,
      topAttendants,
      lowPerformers,
    };
  }, [filteredEvaluations, attendants]);

  // Calcular estatísticas usando o serviço
  const stats = useMemo((): EvaluationStats => {
    if (!filteredEvaluations.length) {
      return {
        totalEvaluations: 0,
        averageRating: 0,
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        satisfactionRate: 0,
        commentsCount: 0,
        evaluatedAttendants: 0,
        topRatedAttendant: null,
        lowestRatedAttendant: null,
        recentTrend: "stable",
      };
    }

    // Usar serviços para calcular estatísticas
    const basicStats =
      EvaluationsService.calculateBasicStats(filteredEvaluations);

    // Calcular tendência usando comparação de períodos
    const comparison = AnalyticsService.calculatePeriodComparison(
      filteredEvaluations,
      14,
    );
    let recentTrend: "up" | "down" | "stable" = "stable";

    if (comparison.changes.averageRating > 0.1) recentTrend = "up";
    else if (comparison.changes.averageRating < -0.1) recentTrend = "down";

    // Converter distribuição para o formato esperado
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const analyticsDistribution =
      AnalyticsService.calculateRatingDistribution(filteredEvaluations);
    analyticsDistribution.forEach((item) => {
      ratingDistribution[item.rating as keyof typeof ratingDistribution] =
        item.count;
    });

    return {
      totalEvaluations: basicStats.totalEvaluations,
      averageRating: basicStats.averageRating,
      ratingDistribution,
      satisfactionRate: basicStats.satisfactionRate,
      commentsCount: basicStats.commentsCount,
      evaluatedAttendants: attendantsData.attendantsPerformance.length,
      topRatedAttendant: attendantsData.topAttendants[0]
        ? {
            ...attendantsData.topAttendants[0].attendant,
            averageRating: attendantsData.topAttendants[0].stats.averageRating,
          }
        : null,
      lowestRatedAttendant: attendantsData.lowPerformers[0]
        ? {
            ...attendantsData.lowPerformers[0].attendant,
            averageRating: attendantsData.lowPerformers[0].stats.averageRating,
          }
        : null,
      recentTrend,
    };
  }, [filteredEvaluations, attendantsData]);

  // Análises de sentimento por atendente
  const sentimentByAttendant = useMemo(() => {
    const result = new Map<
      string,
      { positive: number; negative: number; neutral: number }
    >();

    analyses.forEach((analysis) => {
      const evaluation = evaluations.find(
        (evaluation) => evaluation.id === analysis.evaluationId,
      );
      if (evaluation) {
        const current = result.get(evaluation.attendantId) || {
          positive: 0,
          negative: 0,
          neutral: 0,
        };

        switch (analysis.sentiment) {
          case "Positivo":
            current.positive++;
            break;
          case "Negativo":
            current.negative++;
            break;
          case "Neutro":
            current.neutral++;
            break;
        }

        result.set(evaluation.attendantId, current);
      }
    });

    return result;
  }, [analyses, evaluations]);

  // Obter estatísticas por atendente usando serviços
  const getAttendantStats = useCallback(
    (attendantId: string) => {
      const attendantEvals = EvaluationsService.filterByAttendant(
        filteredEvaluations,
        attendantId,
      );

      if (!attendantEvals.length) {
        return {
          totalEvaluations: 0,
          averageRating: 0,
          satisfactionRate: 0,
          commentsCount: 0,
          sentiment: { positive: 0, negative: 0, neutral: 0 },
        };
      }

      const stats = AttendantsService.calculateAttendantStats(
        attendantId,
        attendantEvals,
      );
      const sentiment = sentimentByAttendant.get(attendantId) || {
        positive: 0,
        negative: 0,
        neutral: 0,
      };

      return {
        totalEvaluations: stats.totalEvaluations,
        averageRating: stats.averageRating,
        satisfactionRate: stats.satisfactionRate,
        commentsCount: stats.commentsCount,
        sentiment,
      };
    },
    [filteredEvaluations, sentimentByAttendant],
  );

  return {
    totalEvaluations: stats.totalEvaluations,
    averageRating: stats.averageRating,
    satisfactionRate: stats.satisfactionRate,
    commentsCount: stats.commentsCount,
    evaluatedAttendants: stats.evaluatedAttendants,
    ratingDistribution: stats.ratingDistribution,
    topRatedAttendants: attendantsData.topAttendants.map((perf) => ({
      attendantId: perf.attendant.id,
      attendantName: perf.attendant.name,
      averageRating: perf.stats.averageRating,
      totalEvaluations: perf.stats.totalEvaluations,
      satisfactionRate: perf.stats.satisfactionRate,
    })),
    lowestRatedAttendants: attendantsData.lowPerformers.map((perf) => ({
      attendantId: perf.attendant.id,
      attendantName: perf.attendant.name,
      averageRating: perf.stats.averageRating,
      totalEvaluations: perf.stats.totalEvaluations,
      satisfactionRate: perf.stats.satisfactionRate,
    })),
    recentTrends: [],
    sentimentByAttendant: Array.from(sentimentByAttendant.entries()).map(
      ([attendantId, sentiment]) => {
        const attendant = attendants.find((a) => a.id === attendantId);
        return {
          attendantId,
          attendantName: attendant?.name || "Desconhecido",
          positive: sentiment.positive,
          negative: sentiment.negative,
          neutral: sentiment.neutral,
          totalAnalyzed:
            sentiment.positive + sentiment.negative + sentiment.neutral,
        };
      },
    ),
    // Additional methods for compatibility
    stats,
    filteredEvaluations,
    getAttendantStats,
    loading,
    timeRange,
    attendantsData,
  };
}
