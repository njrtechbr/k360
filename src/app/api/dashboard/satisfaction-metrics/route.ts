import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SatisfactionMetrics } from "@/types/dashboard";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Não autorizado",
        },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(request.url);
    const period =
      (searchParams.get("period") as "24h" | "7d" | "30d") || "24h";

    // Calcular médias de satisfação
    const averageRating = await calculateAverageRating();
    const averageRating24h = await calculateAverageRating("24h");

    // Contar avaliações por período
    const totalEvaluations = await countEvaluationsByPeriod();

    // Calcular distribuição de notas
    const ratingDistribution = await calculateRatingDistribution();

    // Contar alertas de satisfação baixa
    const lowRatingAlerts = await countLowRatingAlerts();

    // Calcular tendência de satisfação
    const trend = await calculateSatisfactionTrend(period);

    const metrics: SatisfactionMetrics = {
      averageRating,
      averageRating24h,
      totalEvaluations,
      ratingDistribution,
      lowRatingAlerts,
      trend,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Erro ao buscar métricas de satisfação:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar métricas de satisfação",
      },
      { status: 500 },
    );
  }
}

async function calculateAverageRating(
  period?: "24h" | "7d" | "30d",
): Promise<number> {
  const where: any = {};

  if (period) {
    const cutoffDate = new Date();
    switch (period) {
      case "24h":
        cutoffDate.setHours(cutoffDate.getHours() - 24);
        break;
      case "7d":
        cutoffDate.setDate(cutoffDate.getDate() - 7);
        break;
      case "30d":
        cutoffDate.setDate(cutoffDate.getDate() - 30);
        break;
    }
    where.data = { gte: cutoffDate };
  }

  const result = await prisma.evaluation.aggregate({
    where,
    _avg: { nota: true },
  });

  return Number((result._avg.nota || 0).toFixed(2));
}

async function countEvaluationsByPeriod() {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayCount, weekCount, monthCount] = await Promise.all([
    prisma.evaluation.count({
      where: { data: { gte: startOfToday } },
    }),
    prisma.evaluation.count({
      where: { data: { gte: startOfWeek } },
    }),
    prisma.evaluation.count({
      where: { data: { gte: startOfMonth } },
    }),
  ]);

  return {
    today: todayCount,
    week: weekCount,
    month: monthCount,
  };
}

async function calculateRatingDistribution() {
  const distribution = await prisma.evaluation.groupBy({
    by: ["nota"],
    _count: { nota: true },
  });

  const result = {
    rating1: 0,
    rating2: 0,
    rating3: 0,
    rating4: 0,
    rating5: 0,
  };

  distribution.forEach((item) => {
    switch (item.nota) {
      case 1:
        result.rating1 = item._count.nota;
        break;
      case 2:
        result.rating2 = item._count.nota;
        break;
      case 3:
        result.rating3 = item._count.nota;
        break;
      case 4:
        result.rating4 = item._count.nota;
        break;
      case 5:
        result.rating5 = item._count.nota;
        break;
    }
  });

  return result;
}

async function countLowRatingAlerts(): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  return await prisma.evaluation.count({
    where: {
      nota: { in: [1, 2] },
      data: { gte: cutoffDate },
    },
  });
}

async function calculateSatisfactionTrend(period: "24h" | "7d" | "30d") {
  const endDate = new Date();
  const startDate = new Date();
  let intervals: number;

  switch (period) {
    case "24h":
      startDate.setHours(startDate.getHours() - 24);
      intervals = 24;
      break;
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      intervals = 7;
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      intervals = 30;
      break;
  }

  const evaluations = await prisma.evaluation.findMany({
    where: {
      data: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      nota: true,
      data: true,
    },
    orderBy: { data: "asc" },
  });

  const trend = [];

  for (let i = 0; i < intervals; i++) {
    const intervalStart = new Date(startDate);
    const intervalEnd = new Date(startDate);

    if (period === "24h") {
      intervalStart.setHours(startDate.getHours() + i);
      intervalEnd.setHours(startDate.getHours() + i + 1);
    } else {
      intervalStart.setDate(startDate.getDate() + i);
      intervalEnd.setDate(startDate.getDate() + i + 1);
    }

    const intervalEvaluations = evaluations.filter(
      (evaluation) =>
        evaluation.data >= intervalStart && evaluation.data < intervalEnd,
    );

    let averageRating = 0;
    if (intervalEvaluations.length > 0) {
      const sum = intervalEvaluations.reduce(
        (acc, evaluation) => acc + evaluation.nota,
        0,
      );
      averageRating = Number((sum / intervalEvaluations.length).toFixed(2));
    }

    trend.push({
      date: new Date(intervalStart),
      averageRating,
      evaluationCount: intervalEvaluations.length,
    });
  }

  return trend;
}
