import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  DashboardMetrics,
  GamificationMetrics,
  SatisfactionMetrics,
  AlertMetrics,
} from "@/types/dashboard";
import { logError } from "@/lib/errors";

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
    const seasonId = searchParams.get("seasonId") || undefined;
    const satisfactionPeriod =
      (searchParams.get("satisfactionPeriod") as "24h" | "7d" | "30d") || "24h";

    // Buscar todas as métricas em paralelo
    const [gamification, satisfaction, alerts] = await Promise.all([
      getGamificationMetrics(seasonId),
      getSatisfactionMetrics(satisfactionPeriod),
      getAlertMetrics(),
    ]);

    const metrics: DashboardMetrics = {
      gamification,
      satisfaction,
      alerts,
      lastUpdated: new Date(),
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Erro ao buscar métricas do dashboard:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar métricas do dashboard",
      },
      { status: 500 },
    );
  }
}

// Função auxiliar para métricas de gamificação
async function getGamificationMetrics(
  seasonId?: string,
): Promise<GamificationMetrics> {
  try {
    // Buscar temporada ativa se não especificada
    let targetSeasonId = seasonId;
    if (!targetSeasonId) {
      const activeSeason = await prisma.gamificationSeason.findFirst({
        where: { active: true },
      });
      targetSeasonId = activeSeason?.id;
    }

    // Calcular XP total da temporada
    const totalXpResult = await prisma.xpEvent.aggregate({
      where: targetSeasonId ? { seasonId: targetSeasonId } : {},
      _sum: { points: true },
    });
    const totalXp = totalXpResult._sum.points || 0;

    // Buscar usuários ativos (com atividade nos últimos 7 dias)
    const activeUsersMetrics = await getActiveUsers(168); // 7 dias * 24 horas
    const activeUsers = activeUsersMetrics.count;

    // Calcular ranking top 10
    const topRanking = await calculateTopRanking(targetSeasonId, 10);

    // Buscar conquistas recentes (últimas 10)
    const recentAchievements = await getRecentAchievements(10);

    // Calcular tendência de XP dos últimos 7 dias
    const xpTrend = await calculateXpTrend(targetSeasonId, 7);

    return {
      totalXp,
      activeUsers,
      topRanking,
      recentAchievements,
      xpTrend,
    };
  } catch (error) {
    logError(error as Error, "getGamificationMetrics");
    throw new Error("Falha ao buscar métricas de gamificação");
  }
}

// Função auxiliar para usuários ativos
async function getActiveUsers(hours: number = 24) {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - hours);

  const activeAttendants = await prisma.attendant.findMany({
    where: {
      OR: [
        {
          evaluations: {
            some: {
              data: { gte: cutoffDate },
            },
          },
        },
        {
          xpGrants: {
            some: {
              grantedAt: { gte: cutoffDate },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      evaluations: {
        where: { data: { gte: cutoffDate } },
        orderBy: { data: "desc" },
        take: 1,
        select: { data: true },
      },
      xpGrants: {
        where: { grantedAt: { gte: cutoffDate } },
        orderBy: { grantedAt: "desc" },
        take: 1,
        select: { grantedAt: true },
      },
    },
  });

  return { count: activeAttendants.length };
}

// Função auxiliar para ranking
async function calculateTopRanking(seasonId?: string, limit: number = 10) {
  const where: any = {};
  if (seasonId) {
    where.seasonId = seasonId;
  }

  const xpByAttendant = await prisma.xpEvent.groupBy({
    by: ["attendantId"],
    where,
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: limit,
  });

  const attendantIds = xpByAttendant.map((x) => x.attendantId);
  const attendants = await prisma.attendant.findMany({
    where: { id: { in: attendantIds } },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
    },
  });

  const attendantMap = new Map(attendants.map((a) => [a.id, a]));

  return xpByAttendant.map((item, index) => {
    const attendant = attendantMap.get(item.attendantId);
    return {
      attendantId: item.attendantId,
      name: attendant?.name || "Desconhecido",
      totalXp: item._sum.points || 0,
      position: index + 1,
      avatarUrl: attendant?.avatarUrl,
    };
  });
}

// Função auxiliar para conquistas recentes
async function getRecentAchievements(limit: number = 10) {
  const recentUnlocked = await prisma.unlockedAchievement.findMany({
    take: limit,
    orderBy: { unlockedAt: "desc" },
    include: {
      attendant: {
        select: { name: true },
      },
    },
  });

  const achievementIds = recentUnlocked.map((u) => u.achievementId);
  const achievements = await prisma.achievementConfig.findMany({
    where: { id: { in: achievementIds } },
    select: {
      id: true,
      title: true,
      icon: true,
      color: true,
    },
  });

  const achievementMap = new Map(achievements.map((a) => [a.id, a]));

  return recentUnlocked.map((unlocked) => {
    const config = achievementMap.get(unlocked.achievementId);
    return {
      id: unlocked.id,
      title: config?.title || "Conquista Desconhecida",
      attendantName: unlocked.attendant.name,
      unlockedAt: unlocked.unlockedAt,
      icon: config?.icon || "trophy",
      color: config?.color || "#FFD700",
    };
  });
}

// Função auxiliar para tendência de XP
async function calculateXpTrend(seasonId?: string, days: number = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const where: any = {
    date: {
      gte: startDate,
      lte: endDate,
    },
  };

  if (seasonId) {
    where.seasonId = seasonId;
  }

  const xpByDate = await prisma.xpEvent.groupBy({
    by: ["date"],
    where,
    _sum: { points: true },
    orderBy: { date: "asc" },
  });

  const trend = [];
  let runningTotal = 0;

  for (let i = 0; i < days; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);

    const dayXp = xpByDate.find((item) => {
      const itemDate = new Date(item.date);
      return itemDate.toDateString() === currentDate.toDateString();
    });

    const dailyXp = dayXp?._sum.points || 0;
    runningTotal += dailyXp;

    trend.push({
      date: new Date(currentDate),
      totalXp: runningTotal,
    });
  }

  return trend;
}

// Função auxiliar para métricas de satisfação
async function getSatisfactionMetrics(
  period: "24h" | "7d" | "30d" = "24h",
): Promise<SatisfactionMetrics> {
  const averageRating = await calculateAverageRating();
  const averageRating24h = await calculateAverageRating("24h");
  const totalEvaluations = await countEvaluationsByPeriod();
  const ratingDistribution = await calculateRatingDistribution();
  const lowRatingAlerts = await countLowRatingAlerts();
  const trend = await calculateSatisfactionTrend(period);

  return {
    averageRating,
    averageRating24h,
    totalEvaluations,
    ratingDistribution,
    lowRatingAlerts,
    trend,
  };
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

// Função auxiliar para alertas
async function getAlertMetrics(): Promise<AlertMetrics> {
  const lowSatisfactionCount = await detectLowSatisfactionAlerts(3.0);
  const inactiveUsersCount = await detectInactiveUsers(72);
  const systemAlerts = await getSystemAlerts();

  return {
    lowSatisfactionCount,
    inactiveUsersCount,
    systemAlerts,
  };
}

async function detectLowSatisfactionAlerts(
  threshold: number = 3.0,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  const attendantsWithLowRating = await prisma.attendant.findMany({
    where: {
      evaluations: {
        some: {
          data: { gte: cutoffDate },
        },
      },
    },
    include: {
      evaluations: {
        where: {
          data: { gte: cutoffDate },
        },
        select: { nota: true },
      },
    },
  });

  let alertCount = 0;

  for (const attendant of attendantsWithLowRating) {
    if (attendant.evaluations.length === 0) continue;

    const average =
      attendant.evaluations.reduce(
        (sum, evaluation) => sum + evaluation.nota,
        0,
      ) / attendant.evaluations.length;

    if (average < threshold) {
      alertCount++;
    }
  }

  return alertCount;
}

async function detectInactiveUsers(
  inactivityHours: number = 72,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - inactivityHours);

  return await prisma.attendant.count({
    where: {
      AND: [
        {
          evaluations: {
            none: {
              data: { gte: cutoffDate },
            },
          },
        },
        {
          xpGrants: {
            none: {
              grantedAt: { gte: cutoffDate },
            },
          },
        },
      ],
    },
  });
}

async function getSystemAlerts() {
  const alerts: AlertMetrics["systemAlerts"] = [];

  const activeSeason = await prisma.gamificationSeason.findFirst({
    where: { active: true },
  });

  if (!activeSeason) {
    alerts.push({
      id: "no-active-season",
      type: "system",
      message: "Nenhuma temporada de gamificação ativa encontrada",
      severity: "medium",
      createdAt: new Date(),
      resolved: false,
    });
  }

  const cutoffDate = new Date();
  cutoffDate.setHours(cutoffDate.getHours() - 24);

  const recentEvaluations = await prisma.evaluation.count({
    where: { data: { gte: cutoffDate } },
  });

  if (recentEvaluations === 0) {
    alerts.push({
      id: "no-recent-evaluations",
      type: "system",
      message: "Nenhuma avaliação registrada nas últimas 24 horas",
      severity: "low",
      createdAt: new Date(),
      resolved: false,
    });
  }

  const averageRating = await calculateAverageRating("24h");
  if (averageRating > 0 && averageRating < 2.0) {
    alerts.push({
      id: "very-low-satisfaction",
      type: "satisfaction",
      message: `Média de satisfação crítica: ${averageRating.toFixed(2)}`,
      severity: "high",
      createdAt: new Date(),
      resolved: false,
    });
  }

  return alerts;
}
