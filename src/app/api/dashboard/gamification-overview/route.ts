import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface GamificationOverview {
  totalXpDistributed: number;
  activeAchievements: number;
  totalUnlocked: number;
  topAchievement: {
    id: string;
    title: string;
    unlockedCount: number;
  } | null;
}

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

    const [totalXpResult, activeAchievements, totalUnlocked, achievementStats] =
      await Promise.all([
        prisma.xpEvent.aggregate({
          _sum: { points: true },
        }),
        prisma.achievementConfig.count({
          where: { active: true },
        }),
        prisma.unlockedAchievement.count(),
        prisma.unlockedAchievement.groupBy({
          by: ["achievementId"],
          _count: {
            achievementId: true,
          },
          orderBy: {
            _count: {
              achievementId: "desc",
            },
          },
          take: 1,
        }),
      ]);

    let topAchievement = null;
    if (achievementStats.length > 0) {
      const topAchievementConfig = await prisma.achievementConfig.findUnique({
        where: { id: achievementStats[0].achievementId },
        select: { id: true, title: true },
      });

      if (topAchievementConfig) {
        topAchievement = {
          id: topAchievementConfig.id,
          title: topAchievementConfig.title,
          unlockedCount: achievementStats[0]._count.achievementId,
        };
      }
    }

    const overview: GamificationOverview = {
      totalXpDistributed: totalXpResult._sum.points || 0,
      activeAchievements,
      totalUnlocked,
      topAchievement,
    };

    return NextResponse.json({
      success: true,
      data: overview,
    });
  } catch (error) {
    console.error("Erro ao buscar visão geral da gamificação:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar visão geral da gamificação",
      },
      { status: 500 },
    );
  }
}
