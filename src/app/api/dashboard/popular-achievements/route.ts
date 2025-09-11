import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface PopularAchievement {
  achievementId: string;
  title: string;
  description: string;
  unlockedCount: number;
  icon: string;
  color: string;
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

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");

    if (limit < 1 || limit > 50) {
      return NextResponse.json(
        {
          success: false,
          error: "Parâmetro limit deve estar entre 1 e 50",
        },
        { status: 400 },
      );
    }

    const achievementStats = await prisma.unlockedAchievement.groupBy({
      by: ["achievementId"],
      _count: {
        achievementId: true,
      },
      orderBy: {
        _count: {
          achievementId: "desc",
        },
      },
      take: limit,
    });

    const achievementIds = achievementStats.map((stat) => stat.achievementId);
    const achievements = await prisma.achievementConfig.findMany({
      where: {
        id: { in: achievementIds },
      },
      select: {
        id: true,
        title: true,
        description: true,
        icon: true,
        color: true,
      },
    });

    const achievementMap = new Map(achievements.map((a) => [a.id, a]));

    const popularAchievements: PopularAchievement[] = achievementStats.map(
      (stat) => {
        const achievement = achievementMap.get(stat.achievementId);
        return {
          achievementId: stat.achievementId,
          title: achievement?.title || "Conquista Desconhecida",
          description: achievement?.description || "",
          unlockedCount: stat._count.achievementId,
          icon: achievement?.icon || "trophy",
          color: achievement?.color || "#gold",
        };
      },
    );

    return NextResponse.json({
      success: true,
      data: popularAchievements,
    });
  } catch (error) {
    console.error("Erro ao buscar conquistas populares:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Falha ao buscar conquistas populares",
      },
      { status: 500 },
    );
  }
}
