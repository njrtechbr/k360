import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SatisfactionMetrics } from "@/types/dashboard";
import { logError } from "@/lib/errors";
import { subDays, startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";

    // Calcular média geral de avaliações
    const averageRatingResult = await prisma.evaluation.aggregate({
      _avg: { nota: true },
    });
    const averageRating = Number(
      (averageRatingResult._avg.nota || 0).toFixed(2),
    );

    // Calcular média das últimas 24 horas
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const averageRating24hResult = await prisma.evaluation.aggregate({
      where: {
        data: { gte: last24Hours },
      },
      _avg: { nota: true },
    });
    const averageRating24h = Number(
      (averageRating24hResult._avg.nota || 0).toFixed(2),
    );

    // Contar avaliações por período
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    thisWeek.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(thisMonth.getDate() - 30);
    thisMonth.setHours(0, 0, 0, 0);

    const [todayCount, weekCount, monthCount] = await Promise.all([
      prisma.evaluation.count({
        where: { data: { gte: today } },
      }),
      prisma.evaluation.count({
        where: { data: { gte: thisWeek } },
      }),
      prisma.evaluation.count({
        where: { data: { gte: thisMonth } },
      }),
    ]);

    const totalEvaluations = {
      today: todayCount,
      week: weekCount,
      month: monthCount,
    };

    // Calcular distribuição de notas
    const ratingDistributionData = await prisma.evaluation.groupBy({
      by: ["nota"],
      _count: { nota: true },
    });

    const ratingDistribution = {
      rating1: 0,
      rating2: 0,
      rating3: 0,
      rating4: 0,
      rating5: 0,
    };

    ratingDistributionData.forEach((item) => {
      const rating = Math.floor(item.nota);
      switch (rating) {
        case 1:
          ratingDistribution.rating1 = item._count.nota;
          break;
        case 2:
          ratingDistribution.rating2 = item._count.nota;
          break;
        case 3:
          ratingDistribution.rating3 = item._count.nota;
          break;
        case 4:
          ratingDistribution.rating4 = item._count.nota;
          break;
        case 5:
          ratingDistribution.rating5 = item._count.nota;
          break;
      }
    });

    // Contar alertas de baixa satisfação (notas <= 2)
    const lowRatingAlerts = await prisma.evaluation.count({
      where: {
        nota: { lte: 2 },
        data: { gte: last24Hours },
      },
    });

    // Calcular tendência baseada no período
    const days = period === "30d" ? 30 : period === "7d" ? 7 : 1;
    const trend = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const startDate = startOfDay(date);
      const endDate = endOfDay(date);

      const [avgResult, countResult] = await Promise.all([
        prisma.evaluation.aggregate({
          where: {
            data: {
              gte: startDate,
              lte: endDate,
            },
          },
          _avg: { nota: true },
        }),
        prisma.evaluation.count({
          where: {
            data: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
      ]);

      trend.push({
        date: startDate,
        averageRating: Number((avgResult._avg.nota || 0).toFixed(2)),
        evaluationCount: countResult,
      });
    }

    const metrics: SatisfactionMetrics = {
      averageRating,
      averageRating24h,
      totalEvaluations,
      ratingDistribution,
      lowRatingAlerts,
      trend,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logError(error as Error, "API.dashboard.satisfaction");
    return NextResponse.json(
      { error: "Falha ao buscar métricas de satisfação" },
      { status: 500 },
    );
  }
}
