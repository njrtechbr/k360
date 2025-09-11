import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { GamificationMetrics } from "@/types/dashboard";
import { logError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");

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
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - 168); // 7 dias * 24 horas

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
    });
    const activeUsers = activeAttendants.length;

    // Calcular ranking top 10
    const topRankingData = await prisma.attendant.findMany({
      where: targetSeasonId
        ? {
            xpEvents: {
              some: { seasonId: targetSeasonId },
            },
          }
        : {},
      select: {
        id: true,
        name: true,
        xpEvents: {
          where: targetSeasonId ? { seasonId: targetSeasonId } : {},
          select: { points: true },
        },
      },
    });

    const topRanking = topRankingData
      .map((attendant) => ({
        attendantId: attendant.id,
        name: attendant.name,
        totalXp: attendant.xpEvents.reduce(
          (sum, event) => sum + event.points,
          0,
        ),
        position: 0,
        avatarUrl: undefined,
      }))
      .sort((a, b) => b.totalXp - a.totalXp)
      .slice(0, 10)
      .map((item, index) => ({ ...item, position: index + 1 }));

    // Buscar conquistas recentes (últimas 10)
    const recentAchievementsData = await prisma.unlockedAchievement.findMany({
      take: 10,
      orderBy: { unlockedAt: "desc" },
      include: {
        achievement: {
          select: {
            title: true,
            icon: true,
            color: true,
          },
        },
        attendant: {
          select: {
            name: true,
          },
        },
      },
    });

    const recentAchievements = recentAchievementsData.map((unlock) => ({
      id: unlock.id,
      title: unlock.achievement.title,
      attendantName: unlock.attendant.name,
      unlockedAt: unlock.unlockedAt,
      icon: unlock.achievement.icon,
      color: unlock.achievement.color,
    }));

    // Calcular tendência de XP dos últimos 7 dias
    const xpTrendData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayXpResult = await prisma.xpEvent.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate,
          },
          ...(targetSeasonId && { seasonId: targetSeasonId }),
        },
        _sum: { points: true },
      });

      xpTrendData.push({
        date,
        totalXp: dayXpResult._sum.points || 0,
      });
    }

    const metrics: GamificationMetrics = {
      totalXp,
      activeUsers,
      topRanking,
      recentAchievements,
      xpTrend: xpTrendData,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    logError(error as Error, "API.dashboard.gamification");
    return NextResponse.json(
      { error: "Falha ao buscar métricas de gamificação" },
      { status: 500 },
    );
  }
}
