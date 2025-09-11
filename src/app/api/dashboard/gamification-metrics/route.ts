import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GamificationMetrics } from "@/types/dashboard";

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

    const metrics: GamificationMetrics = {
      totalXp,
      activeUsers,
      topRanking,
      recentAchievements,
      xpTrend,
    };

    return NextResponse.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    console.error("Erro ao buscar métricas de gamificação:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar métricas de gamificação",
      },
      { status: 500 },
    );
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
